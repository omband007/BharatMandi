# Implementation Plan: Dr. Fasal RAG Enhancement

## Overview

This implementation plan adds Retrieval-Augmented Generation (RAG) capabilities to the Dr. Fasal crop disease diagnosis feature. The RAG system will retrieve relevant agricultural documents after disease identification and generate evidence-based treatment recommendations with source citations.

The implementation follows a phased approach:
1. Infrastructure setup (vector database, caching, AWS Bedrock)
2. Core RAG components (embedding, retrieval, generation)
3. Integration with existing diagnosis flow
4. Testing and validation
5. Initial knowledge base population

## Tasks

- [x] 1. Set up infrastructure and dependencies
  - Install required npm packages: @aws-sdk/client-opensearch, @aws-sdk/client-bedrock-runtime, pg (for pgvector alternative)
  - Configure AWS Bedrock access for Titan Embeddings and Nova Pro/Claude
  - Set up environment variables for vector database connection, similarity thresholds, cache TTLs
  - Create database migration for diagnosis schema extensions (ragEnhanced, citations, ragMetadata fields)
  - _Requirements: 1.1, 5.1, 12.1-12.4_

- [x] 2. Implement Embedding Service
  - [x] 2.1 Create EmbeddingService class with AWS Titan Embeddings integration
    - Implement generateEmbedding() method for single text embedding
    - Implement generateBatchEmbeddings() method for batch processing (25 documents per call)
    - Add text preprocessing (normalize whitespace, truncate to 8192 tokens)
    - Add retry logic with exponential backoff (2 retries)
    - Create src/features/crop-diagnosis/services/embedding.service.ts
    - _Requirements: 1.6, 9.2, 9.6, 9.9_
  
  - [ ]* 2.2 Write property test for embedding dimension consistency
    - **Property 7: Embedding Dimension Invariant**
    - **Validates: Requirements 9.10**
  
  - [x] 2.3 Implement embedding caching with Redis
    - Add getCachedEmbedding() and cacheEmbedding() methods
    - Use cache key format: `rag:embedding:{hash(text)}`
    - Set TTL to 7 days
    - _Requirements: 7.2, 7.3_
  
  - [ ]* 2.4 Write unit tests for EmbeddingService
    - Test single embedding generation
    - Test batch embedding generation
    - Test cache hit and miss scenarios
    - Test error handling and retries
    - _Requirements: 1.6, 9.2_

- [x] 3. Implement Vector Database Service
  - [x] 3.1 Create VectorDatabaseService with pgvector (MVP approach)
    - Set up PostgreSQL connection with pgvector extension
    - Implement indexDocument() method to store embeddings with metadata
    - Implement searchSimilar() method for cosine similarity search
    - Implement updateDocument() and deleteDocument() methods
    - Create database schema with vector column (dimension 1536)
    - Create src/features/crop-diagnosis/services/vector-database.service.ts
    - _Requirements: 1.7, 3.2, 9.4, 9.5_
  
  - [ ]* 3.2 Write property test for retrieval result bounds
    - **Property 2: Retrieval Result Bounds**
    - **Validates: Requirements 3.5, 3.10, 12.2**
  
  - [x] 3.3 Add metadata filtering support
    - Implement filter by cropTypes, diseaseCategories, region, season, language
    - Add SQL WHERE clauses for metadata filtering
    - _Requirements: 3.6, 3.7, 10.2_
  
  - [ ]* 3.4 Write unit tests for VectorDatabaseService
    - Test document indexing
    - Test semantic search with various similarity thresholds
    - Test metadata filtering
    - Test document updates and deletions
    - _Requirements: 1.7, 3.2, 9.4_

- [x] 4. Checkpoint - Verify infrastructure components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Knowledge Base Manager
  - [x] 5.1 Create KnowledgeBaseManager class
    - Implement addDocument() method with validation
    - Implement updateDocument() and deleteDocument() methods
    - Implement getDocument() and listDocuments() methods
    - Store documents in MongoDB with status field (draft/published/archived)
    - Create src/features/crop-diagnosis/services/knowledge-base-manager.service.ts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 5.2 Write property test for document storage completeness
    - **Property 1: Document Storage Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.8**
  
  - [x] 5.3 Implement document chunking pipeline
    - Split documents into 500-1000 token chunks with 100 token overlap
    - Preserve paragraph boundaries
    - Link chunks to parent document
    - Store chunk metadata (chunkId, startIndex, endIndex)
    - _Requirements: 9.1, 9.3_
  
  - [ ]* 5.4 Write property test for document chunking bounds
    - **Property 31: Document Chunking Bounds**
    - **Validates: Requirements 9.1**
  
  - [x] 5.5 Implement document ingestion pipeline
    - Accept PDF, DOCX, TXT formats
    - Extract text content using appropriate libraries
    - Validate metadata completeness
    - Generate embeddings for all chunks via EmbeddingService
    - Index embeddings in VectorDatabaseService
    - _Requirements: 1.6, 1.7, 9.2, 9.4_
  
  - [ ]* 5.6 Write property test for embedding round-trip consistency
    - **Property 2: Embedding Round-Trip Consistency**
    - **Validates: Requirements 1.9**
  
  - [ ]* 5.7 Write unit tests for KnowledgeBaseManager
    - Test document CRUD operations
    - Test chunking logic
    - Test ingestion pipeline
    - Test metadata validation
    - _Requirements: 1.1-1.8_

- [x] 6. Implement RAG Retrieval Service
  - [x] 6.1 Create RAGRetrievalService class
    - Implement retrieveDocuments() method
    - Build query string from disease name, scientific name, crop type, severity
    - Generate query embedding via EmbeddingService
    - Perform semantic search via VectorDatabaseService
    - Apply similarity threshold filtering (default 0.7)
    - Return top 5 documents with metadata
    - Create src/features/crop-diagnosis/services/rag-retrieval.service.ts
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 6.2 Write property test for similarity threshold filtering
    - **Property 6: Similarity Threshold Filtering**
    - **Validates: Requirements 3.3, 12.1**
  
  - [x] 6.3 Implement ranking and prioritization logic
    - Primary ranking: similarity score (descending)
    - Secondary boost: regional match (+0.05 to score)
    - Tertiary boost: seasonal match (+0.03 to score)
    - Language prioritization: boost requested language (+0.02 to score)
    - _Requirements: 3.4, 3.6, 3.7, 10.2_
  
  - [ ]* 6.4 Write property test for regional prioritization
    - **Property 8: Regional Prioritization**
    - **Validates: Requirements 3.6**
  
  - [ ]* 6.5 Write property test for seasonal prioritization
    - **Property 9: Seasonal Prioritization**
    - **Validates: Requirements 3.7**
  
  - [x] 6.6 Implement retrieval caching
    - Add getCachedDocuments() and cacheDocuments() methods
    - Use cache key format: `rag:retrieval:{disease}:{crop}:{language}`
    - Set TTL to 24 hours
    - _Requirements: 7.4, 7.5_
  
  - [ ]* 6.7 Write property test for cache consistency
    - **Property 27: Document Cache Consistency**
    - **Validates: Requirements 7.4, 7.5**
  
  - [ ]* 6.8 Write unit tests for RAGRetrievalService
    - Test query construction
    - Test semantic search execution
    - Test ranking and filtering
    - Test caching behavior
    - Test timeout handling (1500ms)
    - _Requirements: 3.1-3.10_

- [x] 7. Checkpoint - Verify retrieval pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement RAG Response Generator
  - [x] 8.1 Create RAGResponseGenerator class
    - Implement generateEnhancedResponse() method
    - Combine disease info with retrieved documents into LLM prompt
    - Call Nova Pro or Claude via AWS Bedrock
    - Parse LLM response into structured format (JSON)
    - Create src/features/crop-diagnosis/services/rag-response-generator.service.ts
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 8.2 Write property test for enhanced response structure
    - **Property 11: Enhanced Response Structure**
    - **Validates: Requirements 4.3, 4.4**
  
  - [x] 8.3 Implement prompt engineering for evidence-based recommendations
    - Create prompt template with disease info and retrieved documents
    - Include instructions for chemical, organic, and preventive recommendations
    - Require citation references in format [DocID]
    - Request JSON output format
    - Add instructions to filter unsupported recommendations
    - _Requirements: 4.4, 4.7, 4.9_
  
  - [x] 8.4 Implement citation extraction logic
    - Parse LLM response for document references [DocID]
    - Extract relevant excerpts from source documents
    - Build Citation objects with full metadata (title, source, author, date, URL)
    - Link citations to recommendations via citationIds
    - _Requirements: 4.7, 11.1, 11.2, 11.3_
  
  - [ ]* 8.5 Write property test for citation completeness
    - **Property 14: Citation Completeness**
    - **Validates: Requirements 4.7, 11.1, 11.4**
  
  - [x] 8.6 Implement recommendation filtering
    - Validate all recommendations have at least one citation
    - Remove recommendations without supporting documents
    - Check for contradictory recommendations
    - Ensure consistency with disease severity
    - _Requirements: 4.9, 4.11, 11.8_
  
  - [ ]* 8.7 Write property test for recommendation grounding
    - **Property 17: Recommendation Grounding**
    - **Validates: Requirements 4.9, 11.8**
  
  - [x] 8.8 Add regional and seasonal context inclusion
    - Extract regional notes from retrieved documents
    - Extract seasonal notes from retrieved documents
    - Include in response when available
    - _Requirements: 4.5, 11.7_
  
  - [x] 8.9 Add confidence scoring for recommendations
    - Calculate confidence based on number of supporting citations
    - Calculate confidence based on source credibility (research paper > extension guide)
    - Include confidence score (0-100) for each recommendation
    - _Requirements: 4.8_
  
  - [ ]* 8.10 Write unit tests for RAGResponseGenerator
    - Test prompt construction
    - Test LLM response parsing
    - Test citation extraction
    - Test recommendation filtering
    - Test timeout handling (2000ms)
    - Test error handling and retries
    - _Requirements: 4.1-4.11_

- [ ] 9. Implement multilingual support
  - [ ] 9.1 Add language parameter handling in RAGRetrievalService
    - Accept language preference in RetrievalRequest
    - Apply language filter in vector database search
    - Implement language fallback to English
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [ ] 9.2 Add translation support in RAGResponseGenerator
    - Detect when English documents are used for non-English request
    - Translate recommendations to requested language
    - Support English, Hindi, and Marathi
    - _Requirements: 10.3, 10.4, 10.6_
  
  - [ ]* 9.3 Write property test for multilingual support
    - **Property 38: Multilingual Support**
    - **Validates: Requirements 10.4**
  
  - [ ]* 9.4 Write unit tests for multilingual features
    - Test language prioritization
    - Test language fallback
    - Test translation
    - _Requirements: 10.1-10.8_

- [ ] 10. Checkpoint - Verify RAG generation pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integrate RAG into existing diagnosis flow
  - [x] 11.1 Extend DiagnosisService with RAG pipeline
    - Add ragEnhancementEnabled configuration flag
    - Call RAGRetrievalService after disease identification
    - Call RAGResponseGenerator with retrieved documents
    - Merge RAG response with basic diagnosis
    - Update src/features/crop-diagnosis/services/diagnosis.service.ts
    - _Requirements: 2.4, 4.1, 5.1, 12.5_
  
  - [x] 11.2 Implement fallback mode logic
    - Wrap RAG calls in try-catch blocks
    - Activate fallback on retrieval failure, generation failure, or timeout
    - Return basic diagnosis without RAG enhancement
    - Set ragEnhanced flag to false
    - Log fallback reason
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 11.3 Write property test for fallback mode activation
    - **Property 23: Fallback Mode Activation**
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5**
  
  - [ ]* 11.4 Write property test for fallback mode idempotence
    - **Property 22: Fallback Mode Idempotence**
    - **Validates: Requirements 6.8**
  
  - [x] 11.5 Add timeout handling
    - Set 1500ms timeout for retrieval
    - Set 2000ms timeout for generation
    - Use Promise.race() for timeout enforcement
    - Activate fallback immediately on timeout
    - _Requirements: 3.9, 4.10, 7.1_
  
  - [ ]* 11.6 Write unit tests for DiagnosisService RAG integration
    - Test successful RAG enhancement
    - Test fallback mode activation
    - Test timeout handling
    - Test error logging
    - _Requirements: 2.4, 4.1, 6.1-6.8_

- [ ] 12. Extend diagnosis data models and schemas
  - [ ] 12.1 Update MongoDB diagnosis schema
    - Add ragEnhanced boolean field
    - Add retrievedDocuments array field (documentId, title, similarityScore)
    - Add citations array field (Citation objects)
    - Add ragMetadata object field (retrievalTimeMs, generationTimeMs, documentsRetrieved, similarityThreshold, cacheHit)
    - Update src/features/crop-diagnosis/models/diagnosis.schema.ts
    - _Requirements: 5.2, 5.3, 11.1, 11.2, 11.3_
  
  - [ ] 12.2 Create TypeScript interfaces for RAG types
    - Define RetrievalRequest, RetrievalResponse, RetrievedDocument interfaces
    - Define GenerationRequest, GenerationResponse interfaces
    - Define Citation, ChemicalRecommendation, OrganicRecommendation, PreventiveRecommendation interfaces
    - Define DocumentMetadata, KnowledgeDocument interfaces
    - Create src/features/crop-diagnosis/types/rag.types.ts
    - _Requirements: 4.3, 4.4, 11.1, 11.2_
  
  - [ ] 12.3 Update HistoryManagerService to store RAG data
    - Store citations with diagnosis
    - Store retrieved documents metadata
    - Store RAG performance metrics
    - Update src/features/crop-diagnosis/services/history-manager.service.ts
    - _Requirements: 5.2, 5.3_

- [ ] 13. Update diagnosis API endpoints
  - [ ] 13.1 Extend diagnosis controller to handle RAG responses
    - Add language parameter to request
    - Include ragEnhanced indicator in response
    - Include citations in response
    - Include ragMetadata in response (for debugging)
    - Update src/features/crop-diagnosis/controllers/diagnosis.controller.ts
    - _Requirements: 5.1, 5.2, 5.3, 10.1_
  
  - [ ]* 13.2 Write property test for RAG enhancement indicator
    - **Property 21: RAG Enhancement Indicator**
    - **Validates: Requirements 5.2, 5.3**
  
  - [ ]* 13.3 Write integration tests for diagnosis API with RAG
    - Test end-to-end RAG flow
    - Test fallback scenarios
    - Test multilingual requests
    - Test response format
    - _Requirements: 5.1-5.4_

- [ ] 14. Checkpoint - Verify end-to-end integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement monitoring and metrics
  - [ ] 15.1 Add RAG metrics logging
    - Log retrieval latency for each request
    - Log generation latency for each request
    - Log total RAG latency
    - Log cache hit/miss status
    - Log RAG enhancement success/failure
    - Log similarity scores of retrieved documents
    - Log fallback activations with reasons
    - _Requirements: 7.8, 8.1, 8.2, 8.5, 6.7_
  
  - [ ] 15.2 Implement metrics aggregation
    - Track RAG success rate (percentage of successful enhancements)
    - Track average citations per diagnosis
    - Track cache hit rate
    - Track fallback rate
    - Track P95 latencies for retrieval and generation
    - _Requirements: 8.3, 8.4, 8.6_
  
  - [ ]* 15.3 Write property test for metrics logging completeness
    - **Property 28: Metrics Logging Completeness**
    - **Validates: Requirements 7.8, 8.1, 8.2**
  
  - [ ] 15.4 Add alerting thresholds
    - Alert when fallback rate >20% for 1 hour
    - Alert when retrieval latency P95 >1500ms for 10 minutes
    - Alert when generation latency P95 >2000ms for 10 minutes
    - Alert when cache hit rate <40% for 1 hour
    - _Requirements: 8.8, 8.9_
  
  - [ ]* 15.5 Write unit tests for metrics and monitoring
    - Test metrics logging
    - Test metrics aggregation
    - Test alerting logic
    - _Requirements: 8.1-8.9_

- [ ] 16. Implement configuration management
  - [ ] 16.1 Add RAG configuration to environment variables
    - Add VECTOR_DB_CONNECTION_STRING
    - Add SIMILARITY_THRESHOLD (default 0.7, range 0.5-0.95)
    - Add MAX_RETRIEVED_DOCUMENTS (default 5, range 1-10)
    - Add EMBEDDING_CACHE_TTL (default 7 days, range 1 hour-7 days)
    - Add RETRIEVAL_CACHE_TTL (default 24 hours, range 1 hour-7 days)
    - Add RETRIEVAL_TIMEOUT_MS (default 1500)
    - Add GENERATION_TIMEOUT_MS (default 2000)
    - Add RAG_ENABLED (default true)
    - Add RAG_AB_TEST_PERCENTAGE (default 100, range 0-100)
    - Update src/config/environment.ts
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [ ] 16.2 Implement configuration validation
    - Validate similarity threshold range (0.5-0.95)
    - Validate max documents range (1-10)
    - Validate cache TTL range (1 hour-7 days)
    - Reject invalid configurations with descriptive errors
    - _Requirements: 12.8_
  
  - [ ]* 16.3 Write property test for configuration validation
    - **Property 41: Configuration Validation**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.8**
  
  - [ ] 16.4 Implement A/B testing routing
    - Route requests to RAG based on AB_TEST_PERCENTAGE
    - Use deterministic routing (hash of user ID)
    - Log A/B test group assignment
    - _Requirements: 12.6_
  
  - [ ]* 16.5 Write property test for A/B testing routing
    - **Property 43: A/B Testing Routing**
    - **Validates: Requirements 12.6**
  
  - [ ]* 16.6 Write unit tests for configuration management
    - Test configuration loading
    - Test configuration validation
    - Test A/B testing routing
    - _Requirements: 12.1-12.9_

- [ ] 17. Create initial knowledge base
  - [ ] 17.1 Collect agricultural documents
    - Gather 50-100 documents covering major crops (rice, wheat, tomato, cotton, potato)
    - Include documents for common diseases (late blight, powdery mildew, bacterial wilt, etc.)
    - Include regional documents (Maharashtra, Punjab, Tamil Nadu, etc.)
    - Include documents in English, Hindi, and Marathi
    - Store documents in src/features/crop-diagnosis/data/knowledge-base/
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [ ] 17.2 Process and index documents
    - Run document ingestion pipeline for all collected documents
    - Validate metadata completeness
    - Verify embeddings generated successfully
    - Verify documents indexed in vector database
    - Mark documents as "published"
    - _Requirements: 1.6, 1.7, 9.1-9.4_
  
  - [ ] 17.3 Validate retrieval quality
    - Test retrieval for common disease-crop combinations
    - Verify relevant documents are retrieved
    - Verify similarity scores are reasonable (>0.7)
    - Verify regional and seasonal prioritization works
    - _Requirements: 3.1-3.10_

- [ ] 18. Checkpoint - Verify knowledge base and retrieval quality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Create admin interface for knowledge base management
  - [ ] 19.1 Create admin API endpoints
    - POST /api/admin/knowledge-base/documents - Add document
    - PUT /api/admin/knowledge-base/documents/:id - Update document
    - DELETE /api/admin/knowledge-base/documents/:id - Delete document
    - GET /api/admin/knowledge-base/documents/:id - Get document
    - GET /api/admin/knowledge-base/documents - List documents with filters
    - Add authentication and authorization checks
    - Create src/features/crop-diagnosis/controllers/knowledge-base-admin.controller.ts
    - _Requirements: 1.1-1.8, 9.7, 9.8_
  
  - [ ]* 19.2 Write property test for document update propagation
    - **Property 35: Document Update Propagation**
    - **Validates: Requirements 9.7**
  
  - [ ]* 19.3 Write property test for document deletion completeness
    - **Property 36: Document Deletion Completeness**
    - **Validates: Requirements 9.8**
  
  - [ ]* 19.4 Write integration tests for admin API
    - Test document CRUD operations
    - Test document ingestion
    - Test embedding regeneration on update
    - Test embedding deletion on document deletion
    - _Requirements: 1.1-1.8, 9.7, 9.8_

- [ ] 20. Create documentation
  - [ ] 20.1 Document RAG architecture and components
    - Create architecture diagram
    - Document component interactions
    - Document data flow
    - Create docs/features/crop-diagnosis/RAG-ARCHITECTURE.md
    - _Requirements: All_
  
  - [ ] 20.2 Document configuration and deployment
    - Document environment variables
    - Document infrastructure setup (pgvector, Redis, AWS Bedrock)
    - Document deployment steps
    - Create docs/features/crop-diagnosis/RAG-DEPLOYMENT.md
    - _Requirements: 12.1-12.9_
  
  - [ ] 20.3 Document knowledge base management
    - Document document ingestion process
    - Document metadata requirements
    - Document admin API usage
    - Create docs/features/crop-diagnosis/KNOWLEDGE-BASE-MANAGEMENT.md
    - _Requirements: 1.1-1.8_
  
  - [ ] 20.4 Document monitoring and operations
    - Document metrics and alerts
    - Document troubleshooting procedures
    - Document performance tuning
    - Create docs/features/crop-diagnosis/RAG-OPERATIONS.md
    - _Requirements: 8.1-8.9_

- [ ] 21. Final checkpoint - Complete system validation
  - Run all unit tests and property tests
  - Run integration tests
  - Verify end-to-end RAG flow
  - Verify fallback mode works correctly
  - Verify monitoring and metrics
  - Verify configuration management
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation uses pgvector for MVP; migration to Amazon OpenSearch can be done later if needed
- All RAG components are designed with graceful degradation and fallback mode
- The system maintains backward compatibility with existing diagnosis flow
