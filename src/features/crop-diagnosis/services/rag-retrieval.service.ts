/**
 * RAG Retrieval Service
 * 
 * Retrieves relevant agricultural documents based on disease identification.
 * Implements semantic search with ranking, prioritization, and caching.
 * 
 * Requirements:
 * - 3.1: Generate query embedding from disease name, crop type, and severity
 * - 3.2: Perform semantic search in Vector Database
 * - 3.3: Retrieve documents with similarity scores above threshold
 * - 3.4: Rank retrieved documents by relevance score
 * - 3.5: Return top 5 most relevant documents
 * - 3.6: Prioritize documents matching farmer's region
 * - 3.7: Prioritize documents relevant to current season
 * - 7.4-7.5: Cache retrieved documents for 24 hours
 */

import { EmbeddingService } from './embedding.service';
import { VectorDatabaseService, SearchQuery, SearchResult, DocumentMetadata } from './vector-database.service';
import { RedisClientType } from 'redis';

/**
 * Retrieval request parameters
 */
export interface RetrievalRequest {
  disease: {
    name: string;
    scientificName: string;
    type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
    severity: 'low' | 'medium' | 'high';
  };
  cropType: string;
  location?: {
    state: string;
    district?: string;
  };
  season?: 'kharif' | 'rabi' | 'zaid';
  language: string;
  maxDocuments?: number; // Default: 5
}

/**
 * Retrieved document with ranking information
 */
export interface RetrievedDocument {
  documentId: string;
  title: string;
  content: string; // Relevant chunk
  metadata: DocumentMetadata;
  similarityScore: number;
  rank: number;
}

/**
 * Retrieval response with metadata
 */
export interface RetrievalResponse {
  documents: RetrievedDocument[];
  retrievalTimeMs: number;
  cacheHit: boolean;
  similarityThreshold: number;
}

/**
 * RAG Retrieval Service Configuration
 */
export interface RAGRetrievalConfig {
  similarityThreshold: number;
  maxDocuments: number;
  cacheTTL: number; // seconds
  regionalBoost: number;
  seasonalBoost: number;
  languageBoost: number;
}

export const DEFAULT_RAG_RETRIEVAL_CONFIG: RAGRetrievalConfig = {
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7'),
  maxDocuments: parseInt(process.env.MAX_RETRIEVED_DOCUMENTS || '5', 10),
  cacheTTL: 24 * 60 * 60, // 24 hours in seconds
  regionalBoost: 0.05,
  seasonalBoost: 0.03,
  languageBoost: 0.02,
};

/**
 * RAG Retrieval Service
 * 
 * Orchestrates document retrieval for RAG enhancement:
 * 1. Constructs query from disease identification
 * 2. Generates query embedding
 * 3. Performs semantic search
 * 4. Applies ranking and prioritization
 * 5. Caches results
 */
export class RAGRetrievalService {
  private embeddingService: EmbeddingService;
  private vectorDbService: VectorDatabaseService;
  private redisClient: RedisClientType | null;
  private config: RAGRetrievalConfig;

  constructor(
    embeddingService: EmbeddingService,
    vectorDbService: VectorDatabaseService,
    config: Partial<RAGRetrievalConfig> = {},
    redisClient?: RedisClientType
  ) {
    this.embeddingService = embeddingService;
    this.vectorDbService = vectorDbService;
    this.config = { ...DEFAULT_RAG_RETRIEVAL_CONFIG, ...config };
    this.redisClient = redisClient || null;
  }

  /**
   * Retrieve relevant documents for a disease identification
   * 
   * @param request - Retrieval request with disease and context
   * @returns Retrieval response with ranked documents
   */
  async retrieveDocuments(request: RetrievalRequest): Promise<RetrievalResponse> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = await this.getCachedDocuments(cacheKey);
    if (cached) {
      return {
        ...cached,
        retrievalTimeMs: Date.now() - startTime,
        cacheHit: true,
      };
    }

    // Construct query string
    const queryString = this.constructQuery(request);
    console.log(`[RAGRetrieval] Query: ${queryString}`);

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(queryString);

    // Perform semantic search
    const maxDocuments = request.maxDocuments || this.config.maxDocuments;
    const searchQuery: SearchQuery = {
      embedding: queryEmbedding,
      topK: maxDocuments * 2, // Retrieve more for ranking
      similarityThreshold: this.config.similarityThreshold,
      filters: {
        cropTypes: [request.cropType],
        language: request.language,
      },
    };

    const searchResults = await this.vectorDbService.searchSimilar(searchQuery);
    console.log(`[RAGRetrieval] Found ${searchResults.length} documents above threshold`);

    // Apply ranking and prioritization
    const rankedDocuments = this.rankAndPrioritize(searchResults, request);

    // Take top N documents
    const topDocuments = rankedDocuments.slice(0, maxDocuments);

    // Convert to RetrievedDocument format
    const retrievedDocuments: RetrievedDocument[] = topDocuments.map((doc, index) => ({
      documentId: doc.documentId,
      title: doc.metadata.source, // Use source as title for now
      content: doc.content,
      metadata: doc.metadata,
      similarityScore: doc.similarityScore,
      rank: index + 1,
    }));

    const response: RetrievalResponse = {
      documents: retrievedDocuments,
      retrievalTimeMs: Date.now() - startTime,
      cacheHit: false,
      similarityThreshold: this.config.similarityThreshold,
    };

    // Cache the response
    await this.cacheDocuments(cacheKey, response);

    console.log(`[RAGRetrieval] Retrieved ${retrievedDocuments.length} documents in ${response.retrievalTimeMs}ms`);
    return response;
  }

  /**
   * Get cached documents from Redis
   * 
   * @param cacheKey - Cache key
   * @returns Cached response or null
   */
  async getCachedDocuments(cacheKey: string): Promise<RetrievalResponse | null> {
    if (!this.redisClient) {
      return null;
    }

    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        console.log(`[RAGRetrieval] Cache hit: ${cacheKey}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('[RAGRetrieval] Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Cache documents in Redis
   * 
   * @param cacheKey - Cache key
   * @param response - Retrieval response to cache
   */
  async cacheDocuments(cacheKey: string, response: RetrievalResponse): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      await this.redisClient.setEx(
        cacheKey,
        this.config.cacheTTL,
        JSON.stringify(response)
      );
      console.log(`[RAGRetrieval] Cached response: ${cacheKey}`);
    } catch (error) {
      console.error('[RAGRetrieval] Cache storage error:', error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Construct query string from disease identification
   * 
   * Format: "{disease name} ({scientific name}) in {crop}, {severity} severity[, {region}][, {season} season]"
   * 
   * @param request - Retrieval request
   * @returns Query string
   */
  private constructQuery(request: RetrievalRequest): string {
    const parts: string[] = [];

    // Disease and crop
    parts.push(`${request.disease.name} (${request.disease.scientificName}) in ${request.cropType}`);

    // Severity
    parts.push(`${request.disease.severity} severity`);

    // Location (if available)
    if (request.location) {
      parts.push(request.location.state);
      if (request.location.district) {
        parts.push(request.location.district);
      }
    }

    // Season (if available)
    if (request.season) {
      parts.push(`${request.season} season`);
    }

    return parts.join(', ');
  }

  /**
   * Rank and prioritize documents based on multiple factors
   * 
   * Ranking strategy:
   * 1. Primary: Similarity score (descending)
   * 2. Secondary: Regional match (+0.05 boost)
   * 3. Tertiary: Seasonal match (+0.03 boost)
   * 4. Language: Requested language (+0.02 boost)
   * 
   * @param searchResults - Raw search results from vector database
   * @param request - Retrieval request with context
   * @returns Ranked and sorted documents
   */
  private rankAndPrioritize(
    searchResults: SearchResult[],
    request: RetrievalRequest
  ): SearchResult[] {
    // Apply boosts to similarity scores
    const boostedResults = searchResults.map(result => {
      let boostedScore = result.similarityScore;

      // Regional boost
      if (request.location && result.metadata.region) {
        if (result.metadata.region === request.location.state) {
          boostedScore += this.config.regionalBoost;
        }
      }

      // Seasonal boost
      if (request.season && result.metadata.season) {
        if (result.metadata.season === request.season) {
          boostedScore += this.config.seasonalBoost;
        }
      }

      // Language boost (already filtered, but boost exact matches)
      if (result.metadata.language === request.language) {
        boostedScore += this.config.languageBoost;
      }

      return {
        ...result,
        similarityScore: boostedScore,
      };
    });

    // Sort by boosted similarity score (descending)
    boostedResults.sort((a, b) => b.similarityScore - a.similarityScore);

    return boostedResults;
  }

  /**
   * Generate cache key for retrieval request
   * 
   * Format: rag:retrieval:{disease}:{crop}:{language}
   * 
   * @param request - Retrieval request
   * @returns Cache key
   */
  private getCacheKey(request: RetrievalRequest): string {
    const disease = request.disease.name.toLowerCase().replace(/\s+/g, '-');
    const crop = request.cropType.toLowerCase().replace(/\s+/g, '-');
    const language = request.language.toLowerCase();
    return `rag:retrieval:${disease}:${crop}:${language}`;
  }
}

/**
 * Create a singleton instance of RAGRetrievalService
 */
let ragRetrievalServiceInstance: RAGRetrievalService | null = null;

export function getRAGRetrievalService(
  embeddingService: EmbeddingService,
  vectorDbService: VectorDatabaseService,
  redisClient?: RedisClientType
): RAGRetrievalService {
  if (!ragRetrievalServiceInstance) {
    ragRetrievalServiceInstance = new RAGRetrievalService(
      embeddingService,
      vectorDbService,
      {},
      redisClient
    );
  }
  return ragRetrievalServiceInstance;
}

export function resetRAGRetrievalService(): void {
  ragRetrievalServiceInstance = null;
}
