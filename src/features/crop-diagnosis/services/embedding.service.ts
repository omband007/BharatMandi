import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClient } from './bedrock.service';
import crypto from 'crypto';

/**
 * Embedding Service for RAG Enhancement
 * 
 * Generates vector embeddings using Amazon Titan Embeddings G1 - Text model
 * Implements caching with Redis for frequently used embeddings
 * 
 * Model: amazon.titan-embed-text-v1
 * Dimension: 1536
 * Max input: 8192 tokens
 * Multilingual support: English, Hindi, and other Indian languages
 */

export interface EmbeddingConfig {
  modelId: string;
  dimension: number;
  maxTokens: number;
  batchSize: number;
  retries: number;
  retryDelayMs: number;
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  modelId: process.env.EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v1',
  dimension: 1536,
  maxTokens: 8192,
  batchSize: 25,
  retries: 2,
  retryDelayMs: 1000,
};

/**
 * Embedding Service Interface
 */
export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  getCachedEmbedding(text: string): Promise<number[] | null>;
  cacheEmbedding(text: string, embedding: number[]): Promise<void>;
}

/**
 * EmbeddingService class
 * Handles embedding generation with AWS Titan Embeddings
 */
export class EmbeddingService implements IEmbeddingService {
  private client: BedrockRuntimeClient;
  private config: EmbeddingConfig;
  private redisClient: any; // Redis client for caching

  constructor(
    config: Partial<EmbeddingConfig> = {},
    redisClient?: any
  ) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
    this.client = getBedrockClient(process.env.BEDROCK_REGION || 'us-east-1');
    this.redisClient = redisClient;
  }

  /**
   * Generate embedding for a single text
   * Implements retry logic with exponential backoff
   * 
   * @param text - Input text to embed
   * @returns Vector embedding (1536 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.redisClient) {
      const cached = await this.getCachedEmbedding(text);
      if (cached) {
        return cached;
      }
    }

    // Preprocess text
    const processedText = this.preprocessText(text);

    // Generate embedding with retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const embedding = await this.invokeEmbeddingModel(processedText);
        
        // Cache the result
        if (this.redisClient) {
          await this.cacheEmbedding(text, embedding);
        }
        
        return embedding;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on last attempt
        if (attempt < this.config.retries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Failed to generate embedding after ${this.config.retries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Generate embeddings for multiple texts in batch
   * Processes in batches of 25 documents per API call
   * 
   * @param texts - Array of texts to embed
   * @returns Array of vector embeddings
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchEmbeddings = await Promise.all(batchPromises);
      
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  }

  /**
   * Get cached embedding from Redis
   * 
   * @param text - Input text
   * @returns Cached embedding or null if not found
   */
  async getCachedEmbedding(text: string): Promise<number[] | null> {
    if (!this.redisClient) {
      return null;
    }

    try {
      const cacheKey = this.getCacheKey(text);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('[EmbeddingService] Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Cache embedding in Redis
   * TTL: 7 days
   * 
   * @param text - Input text
   * @param embedding - Vector embedding
   */
  async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      const cacheKey = this.getCacheKey(text);
      const ttl = 7 * 24 * 60 * 60; // 7 days in seconds
      
      await this.redisClient.setEx(
        cacheKey,
        ttl,
        JSON.stringify(embedding)
      );
    } catch (error) {
      console.error('[EmbeddingService] Cache storage error:', error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Invoke Titan Embeddings model via Bedrock
   * 
   * @param text - Preprocessed text
   * @returns Vector embedding
   */
  private async invokeEmbeddingModel(text: string): Promise<number[]> {
    const command = new InvokeModelCommand({
      modelId: this.config.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: text,
      }),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Titan Embeddings returns embedding in 'embedding' field
    const embedding = responseBody.embedding;
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from Titan model');
    }
    
    if (embedding.length !== this.config.dimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.config.dimension}, got ${embedding.length}`
      );
    }
    
    return embedding;
  }

  /**
   * Preprocess text before embedding
   * - Normalize whitespace
   * - Remove special characters
   * - Truncate to max token limit
   * 
   * @param text - Raw input text
   * @returns Preprocessed text
   */
  private preprocessText(text: string): string {
    // Normalize whitespace
    let processed = text.replace(/\s+/g, ' ').trim();
    
    // Remove special control characters but preserve punctuation
    processed = processed.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Truncate to approximate token limit
    // Rough estimate: 1 token ≈ 4 characters
    const maxChars = this.config.maxTokens * 4;
    if (processed.length > maxChars) {
      processed = processed.substring(0, maxChars);
      // Try to end at a word boundary
      const lastSpace = processed.lastIndexOf(' ');
      if (lastSpace > maxChars * 0.9) {
        processed = processed.substring(0, lastSpace);
      }
    }
    
    return processed;
  }

  /**
   * Generate cache key for text
   * Uses SHA-256 hash of text
   * 
   * @param text - Input text
   * @returns Cache key
   */
  private getCacheKey(text: string): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `rag:embedding:${hash}`;
  }

  /**
   * Sleep utility for retry delays
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a singleton instance of EmbeddingService
 * Can be initialized with Redis client for caching
 */
let embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(redisClient?: any): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService({}, redisClient);
  }
  return embeddingServiceInstance;
}

export function resetEmbeddingService(): void {
  embeddingServiceInstance = null;
}
