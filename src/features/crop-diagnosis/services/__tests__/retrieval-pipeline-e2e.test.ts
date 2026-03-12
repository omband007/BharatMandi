/**
 * End-to-End Retrieval Pipeline Test
 * 
 * Verifies the complete retrieval pipeline flow:
 * Disease ID → Query Construction → Embedding → Vector Search → Ranking → Caching
 */

import { RAGRetrievalService, RetrievalRequest } from '../rag-retrieval.service';
import { EmbeddingService } from '../embedding.service';
import { VectorDatabaseService, SearchResult } from '../vector-database.service';

describe('End-to-End Retrieval Pipeline', () => {
  let embeddingService: EmbeddingService;
  let vectorDbService: VectorDatabaseService;
  let ragRetrievalService: RAGRetrievalService;
  let mockRedisClient: any;

  beforeEach(() => {
    // Create real services with mocked dependencies
    embeddingService = new EmbeddingService();
    vectorDbService = new VectorDatabaseService();
    
    mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue('OK'),
    };

    ragRetrievalService = new RAGRetrievalService(
      embeddingService,
      vectorDbService,
      {},
      mockRedisClient
    );

    // Mock the actual AWS/DB calls
    jest.spyOn(embeddingService, 'generateEmbedding').mockResolvedValue(
      new Array(1536).fill(0.1)
    );

    jest.spyOn(vectorDbService, 'searchSimilar').mockResolvedValue([
      {
        documentId: 'doc1',
        content: 'Treatment protocol for late blight',
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Pipeline Flow', () => {
    it('should execute full pipeline: Disease ID → Query → Embedding → Search → Ranking → Caching', async () => {
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
        },
        season: 'kharif',
        language: 'en',
      };

      // Execute pipeline
      const response = await ragRetrievalService.retrieveDocuments(request);

      // Verify Step 1: Query Construction
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Late Blight (Phytophthora infestans) in Tomato')
      );

      // Verify Step 2: Embedding Generation
      expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(1);

      // Verify Step 3: Vector Search
      expect(vectorDbService.searchSimilar).toHaveBeenCalledWith(
        expect.objectContaining({
          embedding: expect.any(Array),
          topK: expect.any(Number),
          similarityThreshold: 0.7,
          filters: expect.objectContaining({
            cropTypes: ['Tomato'],
            language: 'en',
          }),
        })
      );

      // Verify Step 4: Ranking (results should be ordered)
      expect(response.documents).toHaveLength(1);
      expect(response.documents[0].rank).toBe(1);

      // Verify Step 5: Caching
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('rag:retrieval:late-blight:tomato:en'),
        24 * 60 * 60,
        expect.any(String)
      );

      // Verify response metadata
      expect(response.cacheHit).toBe(false);
      expect(response.retrievalTimeMs).toBeGreaterThan(0);
      expect(response.similarityThreshold).toBe(0.7);
    });

    it('should handle regional and seasonal prioritization in pipeline', async () => {
      const request: RetrievalRequest = {
        disease: {
          name: 'Blast',
          scientificName: 'Magnaporthe oryzae',
          type: 'fungal',
          severity: 'high',
        },
        cropType: 'Rice',
        location: {
          state: 'Punjab',
        },
        season: 'kharif',
        language: 'en',
      };

      // Mock search results with regional/seasonal matches
      const mockResults: SearchResult[] = [
        {
          documentId: 'doc1',
          content: 'General blast treatment',
          metadata: {
            source: 'General Source',
            language: 'en',
            cropTypes: ['Rice'],
            diseaseCategories: ['fungal'],
            documentType: 'treatment_protocol',
          },
          similarityScore: 0.80,
        },
        {
          documentId: 'doc2',
          content: 'Punjab-specific blast treatment',
          metadata: {
            source: 'Punjab Agricultural University',
            language: 'en',
            cropTypes: ['Rice'],
            diseaseCategories: ['fungal'],
            region: 'Punjab',
            documentType: 'treatment_protocol',
          },
          similarityScore: 0.78, // Lower base but regional boost
        },
        {
          documentId: 'doc3',
          content: 'Kharif season blast management',
          metadata: {
            source: 'Seasonal Guide',
            language: 'en',
            cropTypes: ['Rice'],
            diseaseCategories: ['fungal'],
            season: 'kharif',
            documentType: 'extension_guide',
          },
          similarityScore: 0.76, // Lower base but seasonal boost
        },
      ];

      jest.spyOn(vectorDbService, 'searchSimilar').mockResolvedValue(mockResults);

      const response = await ragRetrievalService.retrieveDocuments(request);

      // Verify ranking with boosts applied
      // All documents get language boost (+0.02)
      // doc2 should rank first (0.78 + 0.05 regional + 0.02 language = 0.85)
      expect(response.documents[0].documentId).toBe('doc2');
      
      // doc1 should rank second (0.80 + 0.02 language = 0.82)
      expect(response.documents[1].documentId).toBe('doc1');
      
      // doc3 should rank third (0.76 + 0.03 seasonal + 0.02 language = 0.81)
      expect(response.documents[2].documentId).toBe('doc3');
    });
  });
});
