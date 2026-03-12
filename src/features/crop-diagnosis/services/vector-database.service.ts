/**
 * Vector Database Service
 * 
 * Provides vector database operations using pgvector for semantic search.
 * Implements document indexing, similarity search, and metadata filtering.
 * 
 * Requirements:
 * - 1.7: Index embeddings in Vector Database for semantic search
 * - 3.2: Perform semantic search using query embedding
 * - 9.4: Index embeddings with metadata
 * - 9.5: Support efficient approximate nearest neighbor search
 */

import { pool } from '../../../shared/database/pg-config';
import { PoolClient } from 'pg';

/**
 * Document metadata structure
 */
export interface DocumentMetadata {
  source: string;
  author?: string;
  organization?: string;
  publicationDate?: Date;
  language: string;
  cropTypes: string[];
  diseaseCategories: string[];
  region?: string;
  season?: string;
  documentType: 'research_paper' | 'treatment_protocol' | 'extension_guide' | 'case_study';
  url?: string;
}

/**
 * Document to be indexed in the vector database
 */
export interface DocumentToIndex {
  content: string;
  embedding: number[];
  metadata: DocumentMetadata;
}

/**
 * Search query parameters
 */
export interface SearchQuery {
  embedding: number[];
  topK: number;
  similarityThreshold: number;
  filters?: {
    cropTypes?: string[];
    diseaseCategories?: string[];
    region?: string;
    season?: string;
    language?: string;
    documentTypes?: string[];
  };
}

/**
 * Search result from vector database
 */
export interface SearchResult {
  documentId: string;
  content: string;
  metadata: DocumentMetadata;
  similarityScore: number;
}

/**
 * Indexed document retrieved from database
 */
export interface IndexedDocument {
  documentId: string;
  content: string;
  embedding: number[];
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Vector Database Service using pgvector
 * 
 * Provides semantic search capabilities for agricultural documents
 * using PostgreSQL with pgvector extension.
 */
export class VectorDatabaseService {
  private initialized: boolean = false;

  /**
   * Initialize the vector database
   * Creates the pgvector extension and required tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const client = await pool.connect();
    try {
      // Enable pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✓ pgvector extension enabled');

      // Create rag_documents table with vector column
      await client.query(`
        CREATE TABLE IF NOT EXISTS rag_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id VARCHAR(255) UNIQUE NOT NULL,
          content TEXT NOT NULL,
          embedding vector(1536) NOT NULL,
          metadata JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ rag_documents table created');

      // Create HNSW index for fast similarity search
      // Using cosine distance operator for semantic similarity
      await client.query(`
        CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx 
          ON rag_documents USING hnsw (embedding vector_cosine_ops);
      `);
      console.log('✓ HNSW index created for embeddings');

      // Create GIN index for metadata filtering
      await client.query(`
        CREATE INDEX IF NOT EXISTS rag_documents_metadata_idx 
          ON rag_documents USING gin (metadata);
      `);
      console.log('✓ GIN index created for metadata');

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize vector database:', error);
      throw new Error(`Vector database initialization failed: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Index a single document with its embedding and metadata
   * 
   * @param document - Document to index
   * @returns Document ID
   */
  async indexDocument(document: DocumentToIndex): Promise<string> {
    await this.ensureInitialized();

    const client = await pool.connect();
    try {
      // Generate a unique document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Convert embedding array to pgvector format
      const embeddingStr = `[${document.embedding.join(',')}]`;

      // Insert document with embedding and metadata
      await client.query(
        `INSERT INTO rag_documents (document_id, content, embedding, metadata)
         VALUES ($1, $2, $3::vector, $4::jsonb)`,
        [documentId, document.content, embeddingStr, JSON.stringify(document.metadata)]
      );

      console.log(`✓ Indexed document: ${documentId}`);
      return documentId;
    } catch (error) {
      console.error('Failed to index document:', error);
      throw new Error(`Document indexing failed: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Index multiple documents in batch
   * 
   * @param documents - Array of documents to index
   * @returns Array of document IDs
   */
  async indexBatchDocuments(documents: DocumentToIndex[]): Promise<string[]> {
    await this.ensureInitialized();

    const documentIds: string[] = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const document of documents) {
        const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const embeddingStr = `[${document.embedding.join(',')}]`;

        await client.query(
          `INSERT INTO rag_documents (document_id, content, embedding, metadata)
           VALUES ($1, $2, $3::vector, $4::jsonb)`,
          [documentId, document.content, embeddingStr, JSON.stringify(document.metadata)]
        );

        documentIds.push(documentId);
      }

      await client.query('COMMIT');
      console.log(`✓ Indexed ${documentIds.length} documents in batch`);
      return documentIds;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to index batch documents:', error);
      throw new Error(`Batch document indexing failed: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Search for similar documents using cosine similarity
   * 
   * @param query - Search query with embedding and filters
   * @returns Array of search results ordered by similarity
   */
  async searchSimilar(query: SearchQuery): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const client = await pool.connect();
    try {
      // Convert embedding array to pgvector format
      const embeddingStr = `[${query.embedding.join(',')}]`;

      // Build WHERE clause for metadata filtering
      const whereClauses: string[] = [];
      const params: any[] = [embeddingStr, query.topK];
      let paramIndex = 3;

      if (query.filters) {
        // Filter by crop types
        if (query.filters.cropTypes && query.filters.cropTypes.length > 0) {
          whereClauses.push(`metadata->'cropTypes' ?| $${paramIndex}::text[]`);
          params.push(query.filters.cropTypes);
          paramIndex++;
        }

        // Filter by disease categories
        if (query.filters.diseaseCategories && query.filters.diseaseCategories.length > 0) {
          whereClauses.push(`metadata->'diseaseCategories' ?| $${paramIndex}::text[]`);
          params.push(query.filters.diseaseCategories);
          paramIndex++;
        }

        // Filter by region
        if (query.filters.region) {
          whereClauses.push(`metadata->>'region' = $${paramIndex}`);
          params.push(query.filters.region);
          paramIndex++;
        }

        // Filter by season
        if (query.filters.season) {
          whereClauses.push(`metadata->>'season' = $${paramIndex}`);
          params.push(query.filters.season);
          paramIndex++;
        }

        // Filter by language
        if (query.filters.language) {
          whereClauses.push(`metadata->>'language' = $${paramIndex}`);
          params.push(query.filters.language);
          paramIndex++;
        }

        // Filter by document types
        if (query.filters.documentTypes && query.filters.documentTypes.length > 0) {
          whereClauses.push(`metadata->>'documentType' = ANY($${paramIndex}::text[])`);
          params.push(query.filters.documentTypes);
          paramIndex++;
        }
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Perform cosine similarity search
      // pgvector's <=> operator returns cosine distance (0 = identical, 2 = opposite)
      // Convert to similarity: 1 - (distance / 2)
      const sqlQuery = `
        SELECT 
          document_id,
          content,
          metadata,
          1 - (embedding <=> $1::vector) AS similarity_score
        FROM rag_documents
        ${whereClause}
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `;

      const result = await client.query(sqlQuery, params);

      // Filter by similarity threshold and map to SearchResult
      const searchResults: SearchResult[] = result.rows
        .filter(row => row.similarity_score >= query.similarityThreshold)
        .map(row => ({
          documentId: row.document_id,
          content: row.content,
          metadata: row.metadata as DocumentMetadata,
          similarityScore: parseFloat(row.similarity_score)
        }));

      console.log(`✓ Found ${searchResults.length} documents above threshold ${query.similarityThreshold}`);
      return searchResults;
    } catch (error) {
      console.error('Failed to search similar documents:', error);
      throw new Error(`Similarity search failed: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing document
   * 
   * @param documentId - ID of document to update
   * @param updates - Partial document updates
   */
  async updateDocument(documentId: string, updates: Partial<DocumentToIndex>): Promise<void> {
    await this.ensureInitialized();

    const client = await pool.connect();
    try {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.content !== undefined) {
        setClauses.push(`content = $${paramIndex}`);
        params.push(updates.content);
        paramIndex++;
      }

      if (updates.embedding !== undefined) {
        const embeddingStr = `[${updates.embedding.join(',')}]`;
        setClauses.push(`embedding = $${paramIndex}::vector`);
        params.push(embeddingStr);
        paramIndex++;
      }

      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex}::jsonb`);
        params.push(JSON.stringify(updates.metadata));
        paramIndex++;
      }

      if (setClauses.length === 0) {
        console.log('No updates provided for document:', documentId);
        return;
      }

      // Always update the updated_at timestamp
      setClauses.push('updated_at = CURRENT_TIMESTAMP');

      // Add document ID as last parameter
      params.push(documentId);

      const sqlQuery = `
        UPDATE rag_documents
        SET ${setClauses.join(', ')}
        WHERE document_id = $${paramIndex}
      `;

      const result = await client.query(sqlQuery, params);

      if (result.rowCount === 0) {
        throw new Error(`Document not found: ${documentId}`);
      }

      console.log(`✓ Updated document: ${documentId}`);
    } catch (error) {
      console.error('Failed to update document:', error);
      throw new Error(`Document update failed: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete a document from the vector database
   * 
   * @param documentId - ID of document to delete
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.ensureInitialized();

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM rag_documents WHERE document_id = $1',
        [documentId]
      );

      if (result.rowCount === 0) {
        throw new Error(`Document not found: ${documentId}`);
      }

      console.log(`✓ Deleted document: ${documentId}`);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw new Error(`Document deletion failed: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get a document by ID
   * 
   * @param documentId - ID of document to retrieve
   * @returns Indexed document or null if not found
   */
  async getDocument(documentId: string): Promise<IndexedDocument | null> {
    await this.ensureInitialized();

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT document_id, content, embedding, metadata, created_at, updated_at
         FROM rag_documents
         WHERE document_id = $1`,
        [documentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        documentId: row.document_id,
        content: row.content,
        embedding: row.embedding, // pgvector returns as array
        metadata: row.metadata as DocumentMetadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Failed to get document:', error);
      throw new Error(`Document retrieval failed: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Ensure the database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const vectorDatabaseService = new VectorDatabaseService();
