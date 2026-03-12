/**
 * Unit tests for Knowledge Base Manager Service
 * 
 * Tests:
 * - Document CRUD operations
 * - Document chunking logic
 * - Document ingestion pipeline
 * - Metadata validation
 */

import { KnowledgeBaseManager, KnowledgeDocument, KnowledgeBaseModel } from '../knowledge-base-manager.service';
import { EmbeddingService } from '../embedding.service';
import { VectorDatabaseService } from '../vector-database.service';
import type { DocumentMetadata } from '../vector-database.service';

// Mock dependencies
jest.mock('../embedding.service');
jest.mock('../vector-database.service');

describe('KnowledgeBaseManager', () => {
  let knowledgeBaseManager: KnowledgeBaseManager;
  let mockEmbeddingService: jest.Mocked<EmbeddingService>;
  let mockVectorDbService: jest.Mocked<VectorDatabaseService>;

  beforeEach(() => {
    // Create mock services
    mockEmbeddingService = {
      generateEmbedding: jest.fn(),
      generateBatchEmbeddings: jest.fn(),
      getCachedEmbedding: jest.fn(),
      cacheEmbedding: jest.fn()
    } as any;

    mockVectorDbService = {
      initialize: jest.fn(),
      indexDocument: jest.fn(),
      indexBatchDocuments: jest.fn(),
      searchSimilar: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
      getDocument: jest.fn()
    } as any;

    // Create service instance
    knowledgeBaseManager = new KnowledgeBaseManager(
      mockEmbeddingService,
      mockVectorDbService
    );
  });

  describe('Document Validation', () => {
    it('should reject document without title', async () => {
      const invalidDoc: any = {
        title: '',
        content: 'Some content',
        metadata: createValidMetadata(),
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(knowledgeBaseManager.addDocument(invalidDoc))
        .rejects.toThrow('Document title is required');
    });

    it('should reject document without content', async () => {
      const invalidDoc: any = {
        title: 'Test Document',
        content: '',
        metadata: createValidMetadata(),
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(knowledgeBaseManager.addDocument(invalidDoc))
        .rejects.toThrow('Document content is required');
    });

    it('should reject document without metadata', async () => {
      const invalidDoc: any = {
        title: 'Test Document',
        content: 'Some content',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(knowledgeBaseManager.addDocument(invalidDoc))
        .rejects.toThrow('Document metadata is required');
    });

    it('should reject document with invalid document type', async () => {
      const metadata = createValidMetadata();
      metadata.documentType = 'invalid_type' as any;

      const invalidDoc: KnowledgeDocument = {
        title: 'Test Document',
        content: 'Some content',
        metadata,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(knowledgeBaseManager.addDocument(invalidDoc))
        .rejects.toThrow('Invalid document type');
    });
  });

  describe('Document Chunking', () => {
    it('should chunk a long document into multiple chunks', async () => {
      // Create a document with multiple paragraphs (>4000 chars = >1000 tokens)
      const longContent = generateLongContent(5000); // ~1250 tokens, should create 2+ chunks
      const doc = createValidDocument(longContent);

      // Mock embedding and vector DB responses (3 chunks expected)
      mockEmbeddingService.generateBatchEmbeddings.mockResolvedValue([
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
        new Array(1536).fill(0.3)
      ]);
      mockVectorDbService.indexBatchDocuments.mockResolvedValue(['vec_1', 'vec_2', 'vec_3']);

      // Mock MongoDB save
      jest.spyOn(KnowledgeBaseModel.prototype, 'save').mockResolvedValue({} as any);

      const documentId = await knowledgeBaseManager.addDocument(doc);

      // Verify embeddings were generated for multiple chunks
      expect(mockEmbeddingService.generateBatchEmbeddings).toHaveBeenCalled();
      const chunkTexts = mockEmbeddingService.generateBatchEmbeddings.mock.calls[0][0];
      expect(chunkTexts.length).toBeGreaterThan(1);
      expect(documentId).toMatch(/^kb_/);
    });

    it('should create single chunk for short document', async () => {
      const shortContent = 'This is a short document with minimal content.';
      const doc = createValidDocument(shortContent);

      // Mock responses
      mockEmbeddingService.generateBatchEmbeddings.mockResolvedValue([
        new Array(1536).fill(0.1)
      ]);
      mockVectorDbService.indexBatchDocuments.mockResolvedValue(['vec_1']);
      jest.spyOn(KnowledgeBaseModel.prototype, 'save').mockResolvedValue({} as any);

      await knowledgeBaseManager.addDocument(doc);

      // Verify single chunk was created
      const chunkTexts = mockEmbeddingService.generateBatchEmbeddings.mock.calls[0][0];
      expect(chunkTexts.length).toBe(1);
    });

    it('should preserve paragraph boundaries when chunking', async () => {
      // Create content with clear paragraph boundaries
      const content = [
        'Paragraph 1: ' + 'A'.repeat(1500),
        'Paragraph 2: ' + 'B'.repeat(1500),
        'Paragraph 3: ' + 'C'.repeat(1500)
      ].join('\n\n');

      const doc = createValidDocument(content);

      // Mock responses
      mockEmbeddingService.generateBatchEmbeddings.mockResolvedValue([
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2)
      ]);
      mockVectorDbService.indexBatchDocuments.mockResolvedValue(['vec_1', 'vec_2']);
      jest.spyOn(KnowledgeBaseModel.prototype, 'save').mockResolvedValue({} as any);

      await knowledgeBaseManager.addDocument(doc);

      // Verify chunks were created
      const chunkTexts = mockEmbeddingService.generateBatchEmbeddings.mock.calls[0][0];
      expect(chunkTexts.length).toBeGreaterThan(0);
      
      // Each chunk should contain complete paragraphs (not split mid-paragraph)
      chunkTexts.forEach(chunk => {
        expect(chunk).toMatch(/Paragraph \d+:/);
      });
    });
  });

  describe('Document Ingestion Pipeline', () => {
    it('should complete full ingestion pipeline', async () => {
      const doc = createValidDocument('Test content for ingestion pipeline');

      // Mock responses
      mockEmbeddingService.generateBatchEmbeddings.mockResolvedValue([
        new Array(1536).fill(0.5)
      ]);
      mockVectorDbService.indexBatchDocuments.mockResolvedValue(['vec_123']);
      jest.spyOn(KnowledgeBaseModel.prototype, 'save').mockResolvedValue({} as any);

      const documentId = await knowledgeBaseManager.addDocument(doc);

      // Verify pipeline steps
      expect(mockEmbeddingService.generateBatchEmbeddings).toHaveBeenCalledTimes(1);
      expect(mockVectorDbService.indexBatchDocuments).toHaveBeenCalledTimes(1);
      expect(documentId).toMatch(/^kb_/);
    });

    it('should preserve metadata in vector database', async () => {
      const metadata = createValidMetadata();
      const doc = createValidDocument('Test content', metadata);

      // Mock responses
      mockEmbeddingService.generateBatchEmbeddings.mockResolvedValue([
        new Array(1536).fill(0.5)
      ]);
      mockVectorDbService.indexBatchDocuments.mockResolvedValue(['vec_123']);
      jest.spyOn(KnowledgeBaseModel.prototype, 'save').mockResolvedValue({} as any);

      await knowledgeBaseManager.addDocument(doc);

      // Verify metadata was passed to vector database
      const indexCall = mockVectorDbService.indexBatchDocuments.mock.calls[0][0];
      expect(indexCall[0].metadata).toEqual(metadata);
    });
  });

  describe('Document CRUD Operations', () => {
    it('should retrieve document by ID', async () => {
      const mockDoc = {
        documentId: 'kb_123',
        title: 'Test Document',
        content: 'Test content',
        metadata: createValidMetadata(),
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(KnowledgeBaseModel, 'findOne').mockResolvedValue(mockDoc as any);

      const result = await knowledgeBaseManager.getDocument('kb_123');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Document');
      expect(result?.status).toBe('published');
    });

    it('should return null for non-existent document', async () => {
      jest.spyOn(KnowledgeBaseModel, 'findOne').mockResolvedValue(null);

      const result = await knowledgeBaseManager.getDocument('kb_nonexistent');

      expect(result).toBeNull();
    });

    it('should list documents with filters', async () => {
      const mockDocs = [
        {
          documentId: 'kb_1',
          title: 'Tomato Late Blight',
          content: 'Content 1',
          metadata: { ...createValidMetadata(), cropTypes: ['tomato'] },
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      jest.spyOn(KnowledgeBaseModel, 'find').mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockDocs)
      } as any);

      const results = await knowledgeBaseManager.listDocuments({
        cropTypes: ['tomato'],
        status: 'published'
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Tomato Late Blight');
    });

    it('should delete document and all embeddings', async () => {
      const mockDoc = {
        documentId: 'kb_123',
        chunks: [
          { chunkId: 'chunk_0', vectorId: 'vec_1', content: 'Chunk 1', startIndex: 0, endIndex: 100 },
          { chunkId: 'chunk_1', vectorId: 'vec_2', content: 'Chunk 2', startIndex: 100, endIndex: 200 }
        ]
      };

      jest.spyOn(KnowledgeBaseModel, 'findOne').mockResolvedValue(mockDoc as any);
      jest.spyOn(KnowledgeBaseModel, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);

      await knowledgeBaseManager.deleteDocument('kb_123');

      // Verify all embeddings were deleted
      expect(mockVectorDbService.deleteDocument).toHaveBeenCalledTimes(2);
      expect(mockVectorDbService.deleteDocument).toHaveBeenCalledWith('vec_1');
      expect(mockVectorDbService.deleteDocument).toHaveBeenCalledWith('vec_2');
    });
  });
});

// Helper functions

function createValidMetadata(): DocumentMetadata {
  return {
    source: 'Agricultural Research Institute',
    author: 'Dr. Smith',
    organization: 'ARI',
    publicationDate: new Date('2024-01-01'),
    language: 'en',
    cropTypes: ['tomato', 'potato'],
    diseaseCategories: ['fungal', 'bacterial'],
    region: 'Maharashtra',
    season: 'kharif',
    documentType: 'research_paper',
    url: 'https://example.com/paper'
  };
}

function createValidDocument(content: string, metadata?: DocumentMetadata): KnowledgeDocument {
  return {
    title: 'Test Agricultural Document',
    content,
    metadata: metadata || createValidMetadata(),
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function generateLongContent(chars: number): string {
  const paragraph = 'This is a paragraph about crop disease management. '.repeat(10);
  let content = '';
  while (content.length < chars) {
    content += paragraph + '\n\n';
  }
  return content;
}
