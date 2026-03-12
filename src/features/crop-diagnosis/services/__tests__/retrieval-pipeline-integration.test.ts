/**
 * Retrieval Pipeline Integration Test
 * 
 * Verifies that all retrieval pipeline components can be instantiated
 * and work together correctly:
 * - EmbeddingService
 * - VectorDatabaseService
 * - KnowledgeBaseManager
 * - RAGRetrievalService
 */

import { EmbeddingService } from '../embedding.service';
import { VectorDatabaseService } from '../vector-database.service';
import { KnowledgeBaseManager } from '../knowledge-base-manager.service';
import { RAGRetrievalService } from '../rag-retrieval.service';

describe('Retrieval Pipeline Integration', () => {
  describe('Service Instantiation', () => {
    it('should instantiate EmbeddingService without errors', () => {
      expect(() => {
        const service = new EmbeddingService();
        expect(service).toBeDefined();
        expect(service.generateEmbedding).toBeDefined();
        expect(service.generateBatchEmbeddings).toBeDefined();
        expect(service.getCachedEmbedding).toBeDefined();
        expect(service.cacheEmbedding).toBeDefined();
      }).not.toThrow();
    });

    it('should instantiate VectorDatabaseService without errors', () => {
      expect(() => {
        const service = new VectorDatabaseService();
        expect(service).toBeDefined();
        expect(service.initialize).toBeDefined();
        expect(service.indexDocument).toBeDefined();
        expect(service.searchSimilar).toBeDefined();
        expect(service.updateDocument).toBeDefined();
        expect(service.deleteDocument).toBeDefined();
        expect(service.getDocument).toBeDefined();
      }).not.toThrow();
    });

    it('should instantiate KnowledgeBaseManager without errors', () => {
      expect(() => {
        const embeddingService = new EmbeddingService();
        const vectorDbService = new VectorDatabaseService();
        const manager = new KnowledgeBaseManager(embeddingService, vectorDbService);
        
        expect(manager).toBeDefined();
        expect(manager.addDocument).toBeDefined();
        expect(manager.updateDocument).toBeDefined();
        expect(manager.deleteDocument).toBeDefined();
        expect(manager.getDocument).toBeDefined();
        expect(manager.listDocuments).toBeDefined();
      }).not.toThrow();
    });

    it('should instantiate RAGRetrievalService without errors', () => {
      expect(() => {
        const embeddingService = new EmbeddingService();
        const vectorDbService = new VectorDatabaseService();
        const ragService = new RAGRetrievalService(embeddingService, vectorDbService);
        
        expect(ragService).toBeDefined();
        expect(ragService.retrieveDocuments).toBeDefined();
        expect(ragService.getCachedDocuments).toBeDefined();
        expect(ragService.cacheDocuments).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Service Integration', () => {
    it('should create complete retrieval pipeline', () => {
      expect(() => {
        // Create services in dependency order
        const embeddingService = new EmbeddingService();
        const vectorDbService = new VectorDatabaseService();
        const knowledgeBaseManager = new KnowledgeBaseManager(
          embeddingService,
          vectorDbService
        );
        const ragRetrievalService = new RAGRetrievalService(
          embeddingService,
          vectorDbService
        );

        // Verify all services are created
        expect(embeddingService).toBeDefined();
        expect(vectorDbService).toBeDefined();
        expect(knowledgeBaseManager).toBeDefined();
        expect(ragRetrievalService).toBeDefined();

        // Verify service methods are available
        expect(typeof embeddingService.generateEmbedding).toBe('function');
        expect(typeof vectorDbService.searchSimilar).toBe('function');
        expect(typeof knowledgeBaseManager.addDocument).toBe('function');
        expect(typeof ragRetrievalService.retrieveDocuments).toBe('function');
      }).not.toThrow();
    });

    it('should export all services from index', async () => {
      // Dynamic import to test exports
      const services = await import('../index');

      // Verify all RAG services are exported
      expect(services.EmbeddingService).toBeDefined();
      expect(services.getEmbeddingService).toBeDefined();
      expect(services.VectorDatabaseService).toBeDefined();
      expect(services.vectorDatabaseService).toBeDefined();
      expect(services.KnowledgeBaseManager).toBeDefined();
      expect(services.getKnowledgeBaseManager).toBeDefined();
      expect(services.RAGRetrievalService).toBeDefined();
      expect(services.getRAGRetrievalService).toBeDefined();
    });
  });

  describe('Method Signatures', () => {
    it('should have correct method signatures on RAGRetrievalService', () => {
      const embeddingService = new EmbeddingService();
      const vectorDbService = new VectorDatabaseService();
      const ragService = new RAGRetrievalService(embeddingService, vectorDbService);

      // Verify retrieveDocuments accepts RetrievalRequest
      expect(ragService.retrieveDocuments).toBeDefined();
      expect(ragService.retrieveDocuments.length).toBe(1); // 1 parameter

      // Verify caching methods
      expect(ragService.getCachedDocuments).toBeDefined();
      expect(ragService.getCachedDocuments.length).toBe(1); // cacheKey parameter
      
      expect(ragService.cacheDocuments).toBeDefined();
      expect(ragService.cacheDocuments.length).toBe(2); // cacheKey, response parameters
    });

    it('should have correct method signatures on KnowledgeBaseManager', () => {
      const embeddingService = new EmbeddingService();
      const vectorDbService = new VectorDatabaseService();
      const manager = new KnowledgeBaseManager(embeddingService, vectorDbService);

      // Verify CRUD methods
      expect(manager.addDocument).toBeDefined();
      expect(manager.addDocument.length).toBe(1); // document parameter
      
      expect(manager.updateDocument).toBeDefined();
      expect(manager.updateDocument.length).toBe(2); // documentId, updates parameters
      
      expect(manager.deleteDocument).toBeDefined();
      expect(manager.deleteDocument.length).toBe(1); // documentId parameter
      
      expect(manager.getDocument).toBeDefined();
      expect(manager.getDocument.length).toBe(1); // documentId parameter
      
      expect(manager.listDocuments).toBeDefined();
      expect(manager.listDocuments.length).toBe(1); // filters parameter
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      const embeddingService = new EmbeddingService();
      const vectorDbService = new VectorDatabaseService();
      const ragService = new RAGRetrievalService(embeddingService, vectorDbService);

      // Service should be created with defaults
      expect(ragService).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const embeddingService = new EmbeddingService();
      const vectorDbService = new VectorDatabaseService();
      
      const customConfig = {
        similarityThreshold: 0.8,
        maxDocuments: 3,
        cacheTTL: 3600,
        regionalBoost: 0.1,
        seasonalBoost: 0.05,
        languageBoost: 0.03,
      };

      const ragService = new RAGRetrievalService(
        embeddingService,
        vectorDbService,
        customConfig
      );

      expect(ragService).toBeDefined();
    });
  });
});
