/**
 * Knowledge Base Manager Service
 * 
 * Manages agricultural documents in the knowledge base with:
 * - Document CRUD operations (add, update, delete, get, list)
 * - Document chunking pipeline (500-1000 token chunks with 100 token overlap)
 * - Document ingestion pipeline (chunk → embed → index → store)
 * - MongoDB storage with chunks and metadata
 * - Integration with EmbeddingService and VectorDatabaseService
 * 
 * Requirements:
 * - 1.1-1.5: Store and manage agricultural documents with metadata
 * - 1.6: Generate embeddings for document content
 * - 1.7: Index embeddings in vector database
 * - 9.1: Split documents into 500-1000 token chunks with 100 token overlap
 * - 9.3: Preserve document metadata with each chunk
 */

import { model, Model, Document as MongooseDocument, Schema } from 'mongoose';
import { EmbeddingService } from './embedding.service';
import { VectorDatabaseService, DocumentToIndex } from './vector-database.service';
import type { DocumentMetadata } from './vector-database.service';

/**
 * Knowledge Document interface
 */
export interface KnowledgeDocument {
  title: string;
  content: string;
  metadata: DocumentMetadata;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document filters for listing
 */
export interface DocumentFilters {
  cropTypes?: string[];
  diseaseCategories?: string[];
  region?: string;
  language?: string;
  status?: string;
}

/**
 * Document chunk structure
 */
export interface DocumentChunk {
  chunkId: string;
  content: string;
  startIndex: number;
  endIndex: number;
  vectorId: string; // Reference to vector DB document ID
}

/**
 * MongoDB schema for Knowledge Base documents
 */
interface KnowledgeBaseDocument extends MongooseDocument {
  documentId: string;
  title: string;
  content: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

/**
 * MongoDB Schema
 */
const KnowledgeBaseSchema = new Schema({
  documentId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, index: true },
  content: { type: String, required: true },
  chunks: [{
    chunkId: { type: String, required: true },
    content: { type: String, required: true },
    startIndex: { type: Number, required: true },
    endIndex: { type: Number, required: true },
    vectorId: { type: String, required: true }
  }],
  metadata: {
    source: { type: String, required: true },
    author: { type: String },
    organization: { type: String },
    publicationDate: { type: Date },
    language: { type: String, required: true, index: true },
    cropTypes: [{ type: String, index: true }],
    diseaseCategories: [{ type: String, index: true }],
    region: { type: String, index: true },
    season: { type: String },
    documentType: { 
      type: String, 
      required: true,
      enum: ['research_paper', 'treatment_protocol', 'extension_guide', 'case_study']
    },
    url: { type: String }
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  createdBy: { type: String, required: true },
  version: { type: Number, default: 1 }
}, {
  timestamps: true,
  collection: 'knowledge_base'
});

// Indexes for efficient querying
KnowledgeBaseSchema.index({ 'metadata.cropTypes': 1, status: 1 });
KnowledgeBaseSchema.index({ 'metadata.diseaseCategories': 1, status: 1 });
KnowledgeBaseSchema.index({ 'metadata.language': 1, status: 1 });
KnowledgeBaseSchema.index({ 'metadata.region': 1, status: 1 });

/**
 * MongoDB Model
 */
const KnowledgeBaseModel: Model<KnowledgeBaseDocument> = model<KnowledgeBaseDocument>(
  'KnowledgeBase',
  KnowledgeBaseSchema
);

/**
 * Chunking configuration
 */
interface ChunkingConfig {
  minTokens: number;
  maxTokens: number;
  overlapTokens: number;
  charsPerToken: number; // Rough estimate: 1 token ≈ 4 characters
}

const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  minTokens: 500,
  maxTokens: 1000,
  overlapTokens: 100,
  charsPerToken: 4
};

/**
 * Knowledge Base Manager Service
 * 
 * Manages the lifecycle of agricultural documents in the knowledge base
 */
export class KnowledgeBaseManager {
  private embeddingService: EmbeddingService;
  private vectorDbService: VectorDatabaseService;
  private chunkingConfig: ChunkingConfig;

  constructor(
    embeddingService: EmbeddingService,
    vectorDbService: VectorDatabaseService,
    chunkingConfig: Partial<ChunkingConfig> = {}
  ) {
    this.embeddingService = embeddingService;
    this.vectorDbService = vectorDbService;
    this.chunkingConfig = { ...DEFAULT_CHUNKING_CONFIG, ...chunkingConfig };
  }

  /**
   * Add a new document to the knowledge base
   * 
   * Pipeline:
   * 1. Validate document and metadata
   * 2. Chunk document into 500-1000 token chunks with 100 token overlap
   * 3. Generate embeddings for all chunks
   * 4. Index embeddings in vector database
   * 5. Store full document with chunks in MongoDB
   * 
   * @param document - Knowledge document to add
   * @returns Document ID
   */
  async addDocument(document: KnowledgeDocument): Promise<string> {
    // Validate document
    this.validateDocument(document);

    // Generate unique document ID
    const documentId = `kb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      // Step 1: Chunk the document
      console.log(`[KnowledgeBaseManager] Chunking document: ${document.title}`);
      const chunks = this.chunkDocument(document.content);
      console.log(`✓ Created ${chunks.length} chunks`);

      // Step 2: Generate embeddings for all chunks
      console.log(`[KnowledgeBaseManager] Generating embeddings for ${chunks.length} chunks`);
      const chunkTexts = chunks.map(chunk => chunk.content);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(chunkTexts);
      console.log(`✓ Generated ${embeddings.length} embeddings`);

      // Step 3: Index embeddings in vector database
      console.log(`[KnowledgeBaseManager] Indexing embeddings in vector database`);
      const documentsToIndex: DocumentToIndex[] = chunks.map((chunk, index) => ({
        content: chunk.content,
        embedding: embeddings[index],
        metadata: document.metadata
      }));

      const vectorIds = await this.vectorDbService.indexBatchDocuments(documentsToIndex);
      console.log(`✓ Indexed ${vectorIds.length} chunks in vector database`);

      // Step 4: Build chunk metadata with vector IDs
      const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
        chunkId: chunk.chunkId,
        content: chunk.content,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        vectorId: vectorIds[index]
      }));

      // Step 5: Store full document in MongoDB
      console.log(`[KnowledgeBaseManager] Storing document in MongoDB`);
      const kbDocument = new KnowledgeBaseModel({
        documentId,
        title: document.title,
        content: document.content,
        chunks: documentChunks,
        metadata: document.metadata,
        status: document.status || 'draft',
        createdBy: 'system', // TODO: Get from auth context
        version: 1
      });

      await kbDocument.save();
      console.log(`✓ Stored document in MongoDB: ${documentId}`);

      return documentId;
    } catch (error) {
      console.error(`[KnowledgeBaseManager] Failed to add document:`, error);
      throw new Error(`Failed to add document: ${error}`);
    }
  }

  /**
   * Update an existing document
   * 
   * If content changes:
   * - Re-chunk the document
   * - Re-generate embeddings
   * - Re-index in vector database
   * - Update MongoDB
   * 
   * @param documentId - ID of document to update
   * @param updates - Partial document updates
   */
  async updateDocument(documentId: string, updates: Partial<KnowledgeDocument>): Promise<void> {
    // Retrieve existing document
    const existingDoc = await KnowledgeBaseModel.findOne({ documentId });
    if (!existingDoc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    try {
      // Check if content changed
      const contentChanged = updates.content && updates.content !== existingDoc.content;

      if (contentChanged) {
        console.log(`[KnowledgeBaseManager] Content changed, re-processing document: ${documentId}`);

        // Delete old embeddings from vector database
        for (const chunk of existingDoc.chunks) {
          await this.vectorDbService.deleteDocument(chunk.vectorId);
        }
        console.log(`✓ Deleted ${existingDoc.chunks.length} old embeddings`);

        // Re-chunk the new content
        const chunks = this.chunkDocument(updates.content!);
        console.log(`✓ Created ${chunks.length} new chunks`);

        // Generate new embeddings
        const chunkTexts = chunks.map(chunk => chunk.content);
        const embeddings = await this.embeddingService.generateBatchEmbeddings(chunkTexts);
        console.log(`✓ Generated ${embeddings.length} new embeddings`);

        // Index new embeddings
        const metadata = updates.metadata || existingDoc.metadata;
        const documentsToIndex: DocumentToIndex[] = chunks.map((chunk, index) => ({
          content: chunk.content,
          embedding: embeddings[index],
          metadata: metadata as DocumentMetadata
        }));

        const vectorIds = await this.vectorDbService.indexBatchDocuments(documentsToIndex);
        console.log(`✓ Indexed ${vectorIds.length} new chunks`);

        // Build new chunk metadata
        const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
          chunkId: chunk.chunkId,
          content: chunk.content,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          vectorId: vectorIds[index]
        }));

        // Update document in MongoDB
        existingDoc.content = updates.content!;
        existingDoc.chunks = documentChunks;
        existingDoc.version += 1;
      }

      // Update other fields
      if (updates.title) existingDoc.title = updates.title;
      if (updates.metadata) existingDoc.metadata = updates.metadata as any;
      if (updates.status) existingDoc.status = updates.status;

      await existingDoc.save();
      console.log(`✓ Updated document: ${documentId}`);
    } catch (error) {
      console.error(`[KnowledgeBaseManager] Failed to update document:`, error);
      throw new Error(`Failed to update document: ${error}`);
    }
  }

  /**
   * Delete a document from the knowledge base
   * 
   * Removes:
   * - All chunk embeddings from vector database
   * - Document from MongoDB
   * 
   * @param documentId - ID of document to delete
   */
  async deleteDocument(documentId: string): Promise<void> {
    // Retrieve document
    const doc = await KnowledgeBaseModel.findOne({ documentId });
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    try {
      // Delete all chunk embeddings from vector database
      console.log(`[KnowledgeBaseManager] Deleting ${doc.chunks.length} embeddings from vector database`);
      for (const chunk of doc.chunks) {
        await this.vectorDbService.deleteDocument(chunk.vectorId);
      }
      console.log(`✓ Deleted embeddings from vector database`);

      // Delete document from MongoDB
      await KnowledgeBaseModel.deleteOne({ documentId });
      console.log(`✓ Deleted document from MongoDB: ${documentId}`);
    } catch (error) {
      console.error(`[KnowledgeBaseManager] Failed to delete document:`, error);
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  /**
   * Get a document by ID
   * 
   * @param documentId - ID of document to retrieve
   * @returns Knowledge document or null if not found
   */
  async getDocument(documentId: string): Promise<KnowledgeDocument | null> {
    const doc = await KnowledgeBaseModel.findOne({ documentId });
    
    if (!doc) {
      return null;
    }

    return {
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata as DocumentMetadata,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * List documents with optional filters
   * 
   * @param filters - Document filters
   * @returns Array of knowledge documents
   */
  async listDocuments(filters: DocumentFilters): Promise<KnowledgeDocument[]> {
    // Build query
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.cropTypes && filters.cropTypes.length > 0) {
      query['metadata.cropTypes'] = { $in: filters.cropTypes };
    }

    if (filters.diseaseCategories && filters.diseaseCategories.length > 0) {
      query['metadata.diseaseCategories'] = { $in: filters.diseaseCategories };
    }

    if (filters.region) {
      query['metadata.region'] = filters.region;
    }

    if (filters.language) {
      query['metadata.language'] = filters.language;
    }

    // Execute query
    const docs = await KnowledgeBaseModel.find(query).sort({ createdAt: -1 });

    // Map to KnowledgeDocument interface
    return docs.map(doc => ({
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata as DocumentMetadata,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));
  }

  /**
   * Chunk a document into 500-1000 token chunks with 100 token overlap
   * 
   * Strategy:
   * - Split by paragraphs first (preserve paragraph boundaries)
   * - Combine paragraphs into chunks within token limits
   * - Add overlap between chunks for context preservation
   * 
   * @param content - Document content to chunk
   * @returns Array of chunks with metadata
   */
  private chunkDocument(content: string): Array<{
    chunkId: string;
    content: string;
    startIndex: number;
    endIndex: number;
  }> {
    const chunks: Array<{
      chunkId: string;
      content: string;
      startIndex: number;
      endIndex: number;
    }> = [];

    // Split content into paragraphs (preserve boundaries)
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    const minChars = this.chunkingConfig.minTokens * this.chunkingConfig.charsPerToken;
    const maxChars = this.chunkingConfig.maxTokens * this.chunkingConfig.charsPerToken;
    const overlapChars = this.chunkingConfig.overlapTokens * this.chunkingConfig.charsPerToken;

    let currentChunk = '';
    let chunkStartIndex = 0;
    let chunkIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const paragraphWithNewline = paragraph + '\n\n';

      // If adding this paragraph exceeds max, save current chunk
      if (currentChunk.length > 0 && 
          currentChunk.length + paragraphWithNewline.length > maxChars) {
        
        // Save current chunk
        const chunkId = `chunk_${chunkIndex}`;
        chunks.push({
          chunkId,
          content: currentChunk.trim(),
          startIndex: chunkStartIndex,
          endIndex: chunkStartIndex + currentChunk.length
        });

        // Start new chunk with overlap
        // Take last overlapChars characters from current chunk
        const overlapText = currentChunk.slice(-overlapChars);
        chunkStartIndex = chunkStartIndex + currentChunk.length - overlapChars;
        currentChunk = overlapText + paragraphWithNewline;
        chunkIndex++;
      } else {
        // Add paragraph to current chunk
        currentChunk += paragraphWithNewline;
      }
    }

    // Save final chunk if it has content
    if (currentChunk.trim().length > 0) {
      const chunkId = `chunk_${chunkIndex}`;
      chunks.push({
        chunkId,
        content: currentChunk.trim(),
        startIndex: chunkStartIndex,
        endIndex: chunkStartIndex + currentChunk.length
      });
    }

    // Handle edge case: if document is very short, create single chunk
    if (chunks.length === 0 && content.trim().length > 0) {
      chunks.push({
        chunkId: 'chunk_0',
        content: content.trim(),
        startIndex: 0,
        endIndex: content.length
      });
    }

    return chunks;
  }

  /**
   * Validate document before processing
   * 
   * @param document - Document to validate
   * @throws Error if validation fails
   */
  private validateDocument(document: KnowledgeDocument): void {
    // Validate required fields
    if (!document.title || document.title.trim().length === 0) {
      throw new Error('Document title is required');
    }

    if (!document.content || document.content.trim().length === 0) {
      throw new Error('Document content is required');
    }

    if (!document.metadata) {
      throw new Error('Document metadata is required');
    }

    // Validate metadata
    const metadata = document.metadata;

    if (!metadata.source || metadata.source.trim().length === 0) {
      throw new Error('Document source is required');
    }

    if (!metadata.language || metadata.language.trim().length === 0) {
      throw new Error('Document language is required');
    }

    if (!metadata.cropTypes || metadata.cropTypes.length === 0) {
      throw new Error('At least one crop type is required');
    }

    if (!metadata.diseaseCategories || metadata.diseaseCategories.length === 0) {
      throw new Error('At least one disease category is required');
    }

    if (!metadata.documentType) {
      throw new Error('Document type is required');
    }

    // Validate document type
    const validTypes = ['research_paper', 'treatment_protocol', 'extension_guide', 'case_study'];
    if (!validTypes.includes(metadata.documentType)) {
      throw new Error(`Invalid document type: ${metadata.documentType}`);
    }

    // Validate status
    if (document.status) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(document.status)) {
        throw new Error(`Invalid status: ${document.status}`);
      }
    }
  }
}

/**
 * Create singleton instance of KnowledgeBaseManager
 */
let knowledgeBaseManagerInstance: KnowledgeBaseManager | null = null;

export function getKnowledgeBaseManager(
  embeddingService: EmbeddingService,
  vectorDbService: VectorDatabaseService
): KnowledgeBaseManager {
  if (!knowledgeBaseManagerInstance) {
    knowledgeBaseManagerInstance = new KnowledgeBaseManager(
      embeddingService,
      vectorDbService
    );
  }
  return knowledgeBaseManagerInstance;
}

export function resetKnowledgeBaseManager(): void {
  knowledgeBaseManagerInstance = null;
}

// Export model for direct access if needed
export { KnowledgeBaseModel };
