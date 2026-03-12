import { EmbeddingService, DEFAULT_EMBEDDING_CONFIG } from '../embedding.service';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// Mock the Bedrock client
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('../bedrock.service', () => ({
  getBedrockClient: jest.fn(() => ({
    send: jest.fn(),
  })),
}));

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;
  let mockRedisClient: any;
  let mockBedrockClient: any;

  beforeEach(() => {
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
    };

    // Mock Bedrock client
    mockBedrockClient = {
      send: jest.fn(),
    };

    // Reset the service
    embeddingService = new EmbeddingService({}, mockRedisClient);
    
    // Mock the client property
    (embeddingService as any).client = mockBedrockClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      // Mock Bedrock response
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          embedding: mockEmbedding,
        })),
      });

      const text = 'Late blight in tomato';
      const embedding = await embeddingService.generateEmbedding(text);

      expect(embedding).toHaveLength(1536);
      expect(embedding).toEqual(mockEmbedding);
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should use cached embedding if available', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockEmbedding));

      const text = 'Late blight in tomato';
      const embedding = await embeddingService.generateEmbedding(text);

      expect(embedding).toEqual(mockEmbedding);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
      expect(mockBedrockClient.send).not.toHaveBeenCalled();
    });

    it('should cache embedding after generation', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          embedding: mockEmbedding,
        })),
      });
      mockRedisClient.get.mockResolvedValue(null);

      const text = 'Late blight in tomato';
      await embeddingService.generateEmbedding(text);

      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('rag:embedding:'),
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(mockEmbedding)
      );
    });

    it('should retry on failure', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      
      // Fail first two attempts, succeed on third
      mockBedrockClient.send
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            embedding: mockEmbedding,
          })),
        });

      const text = 'Late blight in tomato';
      const embedding = await embeddingService.generateEmbedding(text);

      expect(embedding).toEqual(mockEmbedding);
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      mockBedrockClient.send.mockRejectedValue(new Error('Network error'));

      const text = 'Late blight in tomato';
      
      await expect(embeddingService.generateEmbedding(text)).rejects.toThrow(
        'Failed to generate embedding after 3 attempts'
      );

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(3);
    });

    it('should validate embedding dimension', async () => {
      // Mock response with wrong dimension
      const wrongEmbedding = new Array(512).fill(0);
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          embedding: wrongEmbedding,
        })),
      });

      const text = 'Late blight in tomato';
      
      await expect(embeddingService.generateEmbedding(text)).rejects.toThrow(
        'Embedding dimension mismatch'
      );
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          embedding: mockEmbedding,
        })),
      });

      const texts = [
        'Late blight in tomato',
        'Powdery mildew in wheat',
        'Bacterial wilt in potato',
      ];

      const embeddings = await embeddingService.generateBatchEmbeddings(texts);

      expect(embeddings).toHaveLength(3);
      expect(embeddings[0]).toHaveLength(1536);
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(3);
    });

    it('should process in batches', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          embedding: mockEmbedding,
        })),
      });

      // Create 30 texts (should be processed in 2 batches of 25 and 5)
      const texts = Array(30).fill('Test text');

      const embeddings = await embeddingService.generateBatchEmbeddings(texts);

      expect(embeddings).toHaveLength(30);
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(30);
    });
  });

  describe('getCachedEmbedding', () => {
    it('should retrieve cached embedding', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockEmbedding));

      const text = 'Late blight in tomato';
      const embedding = await embeddingService.getCachedEmbedding(text);

      expect(embedding).toEqual(mockEmbedding);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        expect.stringContaining('rag:embedding:')
      );
    });

    it('should return null if not cached', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const text = 'Late blight in tomato';
      const embedding = await embeddingService.getCachedEmbedding(text);

      expect(embedding).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const text = 'Late blight in tomato';
      const embedding = await embeddingService.getCachedEmbedding(text);

      expect(embedding).toBeNull();
    });
  });

  describe('cacheEmbedding', () => {
    it('should cache embedding with correct TTL', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      const text = 'Late blight in tomato';

      await embeddingService.cacheEmbedding(text, mockEmbedding);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('rag:embedding:'),
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(mockEmbedding)
      );
    });

    it('should handle cache errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536);
      const text = 'Late blight in tomato';

      // Should not throw
      await expect(
        embeddingService.cacheEmbedding(text, mockEmbedding)
      ).resolves.not.toThrow();
    });
  });
});
