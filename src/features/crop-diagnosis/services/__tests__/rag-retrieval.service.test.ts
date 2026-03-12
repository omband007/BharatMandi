/**
 * RAG Retrieval Service Tests
 * 
 * Tests for the RAG Retrieval Service including:
 * - Query construction
 * - Document retrieval
 * - Ranking and prioritization
 * - Caching behavior
 */

import { RAGRetrievalService, RetrievalRequest } from '../rag-retrieval.service';
import { EmbeddingService } from '../embedding.service';
import { VectorDatabaseService } from '../vector-database.service';

describe('RAGRetrievalService', () => {
  let ragRetrievalService: RAGRetrievalService;
  let mockEmbeddingService: jest.Mocked<EmbeddingService>;
  let mockVectorDbService: jest.Mocked<VectorDatabaseService>;
  let mockRedisClient: any;

  beforeEach(() => {
    // Create mock services
    mockEmbeddingService = {
      generateEmbedding: jest.fn(),
      generateBatchEmbeddings: jest.fn(),
      getCachedEmbedding: jest.fn(),
      cacheEmbedding: jest.fn(),
    } as any;

    mockVectorDbService = {
      initialize: jest.fn(),
      indexDocument: jest.fn(),
      indexBatchDocuments: jest.fn(),
      searchSimilar: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
      getDocument: jest.fn(),
    } as any;

    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
    };

    ragRetrievalService = new RAGRetrievalService(
      mockEmbeddingService,
      mockVectorDbService,
      {},
      mockRedisClient
    );
  });

  describe('retrieveDocuments', () => {
    it('should construct query correctly from disease identification', async () => {
      const request: RetrievalRequest = {
        disease: {
          name: 'Late Blight',
          scientificName: 'Phytophthora infestans',
          type: 'fungal',
          severity: 'high',
        },
        cropType: 'Tomato',
        location: {
          state: 'Maharashtra',
          district: 'Pune',
        },
        season: 'kharif',
        language: 'en',
      };

      // Mock embedding generation
      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);

      // Mock vector search
      mockVectorDbService.searchSimilar.mockResolvedValue([
        {
          documentId: 'doc1',
          content: 'Treatment for late blight in tomato',
          metadata: {
            source: 'Agricultural Research Institute',
            language: 'en',
            cropTypes: ['Tomato'],
            diseaseCategories: ['fungal'],
            documentType: 'treatment_protocol',
          },
          similarityScore: 0.85,
        },
      ]);

      // Mock cache miss
      mockRedisClient.get.mockResolvedValue(null);

      const response = await ragRetrievalService.retrieveDocuments(request);

      // Verify query construction
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Late Blight (Phytophthora infestans) in Tomato')
      );
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('high severity')
      );
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Maharashtra')
      );
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('kharif season')
      );

      // Verify response
      expect(response.documents).toHaveLength(1);
      expect(response.documents[0].documentId).toBe('doc1');
      expect(response.cacheHit).toBe(false);
    });

    it('should apply ranking and prioritization correctly', async () => {
      const request: RetrievalRequest = {
        disease: {
          name: 'Powdery Mildew',
          scientificName: 'Erysiphe cichoracearum',
          type: 'fungal',
          severity: 'medium',
        },
        cropType: 'Cucumber',
        location: {
          state: 'Karnataka',
        },
        season: 'rabi',
        language: 'en',
      };

      const mockEmbedding = new Array(1536).fill(0.1);
      mockEmbeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);

      // Mock search results with different regional/seasonal matches
      mockVectorDbService.searchSimilar.mockResolvedValue([
        {
          documentId: 'doc1',
          content: 'General treatment',
          metadata: {
            source: 'Source 1',
            language: 'en',
            cropTypes: ['Cucumber'],
            diseaseCategories: ['fungal'],
            documentType: 'treatment_protocol',
          },
          similarityScore: 0.75,
        },
        {
          documentId: 'doc2',
          content: 'Regional treatment for Karnataka',
          metadata: {
            source: 'Source 2',
            language: 'en',
            cropTypes: ['Cucumber'],
            diseaseCategories: ['fungal'],
            region: 'Karnataka', // Regional match
            documentType: 'treatment_protocol',
          },
          similarityScore: 0.74, // Lower base score but should rank higher with boost
        },
        {
          documentId: 'doc3',
          content: 'Seasonal treatment for rabi',
          metadata: {
            source: 'Source 3',
            language: 'en',
            cropTypes: ['Cucumber'],
            diseaseCategories: ['fungal'],
            season: 'rabi', // Seasonal match
            documentType: 'treatment_protocol',
          },
          similarityScore: 0.73, // Lower base score but should rank higher with boost
        },
      ]);

      mockRedisClient.get.mockResolvedValue(null);

      const response = await ragRetrievalService.retrieveDocuments(request);

      // Verify ranking: doc2 (regional boost) should rank first
      expect(response.documents[0].documentId).toBe('doc2');
      expect(response.documents[0].rank).toBe(1);
      
      // doc3 (seasonal boost) should rank second
      expect(response.documents[1].documentId).toBe('doc3');
      expect(response.documents[1].rank).toBe(2);
      
      // doc1 (no boost) should rank third
      expect(response.documents[2].documentId).toBe('doc1');
      expect(response.documents[2].rank).toBe(3);
    });

    it('should use cached documents when available', async () => {
      const request: RetrievalRequest = {
        disease: {
          name: 'Bacterial Wilt',
          scientificName: 'Ralstonia solanacearum',
          type: 'bacterial',
          severity: 'high',
        },
        cropType: 'Tomato',
        language: 'en',
      };

      const cachedResponse = {
        documents: [
          {
            documentId: 'cached_doc1',
            title: 'Cached Treatment',
            content: 'Cached content',
            metadata: {
              source: 'Cached Source',
              language: 'en',
              cropTypes: ['Tomato'],
              diseaseCategories: ['bacterial'],
              documentType: 'treatment_protocol' as const,
            },
            similarityScore: 0.88,
            rank: 1,
          },
        ],
        retrievalTimeMs: 50,
        cacheHit: true,
        similarityThreshold: 0.7,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const response = await ragRetrievalService.retrieveDocuments(request);

      // Verify cache was used
      expect(response.cacheHit).toBe(true);
      expect(response.documents).toHaveLength(1);
      expect(response.documents[0].documentId).toBe('cached_doc1');

      // Verify embedding and search were NOT called
      expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled();
      expect(mockVectorDbService.searchSimilar).not.toHaveBeenCalled();
    });
  });
});
