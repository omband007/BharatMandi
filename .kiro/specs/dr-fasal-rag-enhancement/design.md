# Design Document: Dr. Fasal RAG Enhancement

## Overview

This document specifies the design for enhancing the Dr. Fasal crop disease diagnosis feature with Retrieval-Augmented Generation (RAG) capabilities. The enhancement will provide evidence-based, detailed treatment recommendations backed by agricultural research documents.

### Current System

The existing Dr. Fasal system uses Amazon Nova Pro for image-based disease identification:

1. Farmer uploads crop image
2. Image validated and uploaded to S3
3. Nova Pro analyzes image and identifies disease
4. Basic remedies generated using prompt engineering
5. Results stored in MongoDB and returned to farmer

**Limitations:**
- Remedies are generated purely from Nova Pro's training data
- No source citations or evidence backing
- Limited regional and seasonal context
- No access to latest agricultural research
- Recommendations may be generic or outdated

### Enhanced System with RAG

The RAG-enhanced system adds a retrieval layer between disease identification and response generation:

1. Farmer uploads crop image
2. Image validated and uploaded to S3
3. Nova Pro analyzes image and identifies disease
4. **[NEW] Document retrieval: Semantic search finds relevant agricultural documents**
5. **[NEW] Enhanced generation: LLM generates recommendations grounded in retrieved documents**
6. **[NEW] Citation extraction: Link recommendations to source documents**
7. Results with citations stored and returned to farmer

**Benefits:**
- Evidence-based recommendations with source citations
- Access to latest agricultural research and treatment protocols
- Regional and seasonal context from knowledge base
- Improved farmer trust through transparency
- Continuous improvement through knowledge base updates

### Design Goals

1. **Accuracy**: Provide evidence-based recommendations grounded in authoritative sources
2. **Transparency**: Include source citations for all recommendations
3. **Performance**: Add ≤2000ms overhead to existing diagnosis flow
4. **Reliability**: Graceful fallback when RAG components fail
5. **Scalability**: Support 10,000+ diagnoses per day with growing knowledge base
6. **Maintainability**: Clean separation between retrieval and generation components

### Success Metrics

- RAG enhancement success rate: ≥80% of diagnoses
- Average citations per diagnosis: ≥3
- Retrieval latency: ≤1500ms (95th percentile)
- Generation latency: ≤2000ms (95th percentile)
- Cache hit rate: ≥60% for common diseases
- Fallback rate: ≤20%

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Dr. Fasal RAG System                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Farmer     │
│  (Client)    │
└──────┬───────┘
       │ 1. Upload Image
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Diagnosis Controller                             │
│  - Authentication & Rate Limiting                                     │
│  - Request Validation                                                 │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Diagnosis Service                                │
│  - Orchestrates end-to-end flow                                       │
│  - Handles errors and fallback                                        │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Image     │    │   Cache     │    │     S3      │
│ Validator   │    │  Service    │    │  Service    │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │ Nova Vision │
                   │  Service    │
                   └──────┬──────┘
                          │ 2. Disease Identified
                          ▼
       ┌──────────────────────────────────────────┐
       │                                          │
       ▼                                          ▼
┌─────────────────────────────┐    ┌──────────────────────────┐
│   RAG Retrieval Service     │    │   Embedding Service      │
│  - Query embedding          │◄───│  - Generate embeddings   │
│  - Semantic search          │    │  - Batch processing      │
│  - Ranking & filtering      │    └──────────────────────────┘
└──────────┬──────────────────┘
           │ 3. Retrieved Documents
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Vector Database                            │
│  - Amazon OpenSearch / pgvector                               │
│  - Document embeddings & metadata                             │
│  - Approximate nearest neighbor search                        │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│              RAG Response Generator                           │
│  - Combine disease info + retrieved docs                      │
│  - Generate enhanced recommendations                          │
│  - Extract citations                                          │
│  - Filter unsupported recommendations                         │
└──────────┬───────────────────────────────────────────────────┘
           │ 4. Enhanced Diagnosis
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  History Manager                              │
│  - Store diagnosis with citations                             │
│  - MongoDB persistence                                        │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  Response to Farmer                           │
│  - Disease identification                                     │
│  - Evidence-based recommendations                             │
│  - Source citations                                           │
│  - Confidence scores                                          │
└──────────────────────────────────────────────────────────────┘
```

### Component Interactions

The RAG pipeline integrates seamlessly into the existing diagnosis flow:

1. **Disease Identification** (existing): Nova Vision analyzes image
2. **Document Retrieval** (new): RAG Retrieval Service finds relevant documents
3. **Enhanced Generation** (new): RAG Response Generator creates evidence-based recommendations
4. **Storage** (enhanced): History Manager stores diagnosis with citations

### Data Flow

1. **Image Upload → Disease Identification**
   - Input: Crop image (JPEG/PNG/WebP)
   - Processing: Nova Pro multimodal analysis
   - Output: Disease name, crop type, severity, confidence

2. **Disease Identification → Document Retrieval**
   - Input: Disease name, crop type, severity, location, season
   - Processing: Query embedding → Semantic search → Ranking
   - Output: Top 5 relevant documents with metadata

3. **Retrieved Documents → Enhanced Generation**
   - Input: Disease info + Retrieved documents
   - Processing: LLM prompt with context → Generation → Citation extraction
   - Output: Enhanced recommendations with source citations

4. **Enhanced Diagnosis → Storage**
   - Input: Complete diagnosis with citations
   - Processing: MongoDB persistence
   - Output: Diagnosis ID

### Integration Points

1. **Existing Dr. Fasal System**
   - Integrates after Nova Vision analysis
   - Extends DiagnosisService with RAG pipeline
   - Maintains backward compatibility with fallback mode

2. **AWS Services**
   - Amazon Bedrock: Nova Pro (disease ID) + Nova Pro/Claude (generation)
   - Amazon OpenSearch / RDS pgvector: Vector database
   - Amazon S3: Image storage (existing)
   - Amazon Titan Embeddings: Document and query embeddings

3. **Database Layer**
   - MongoDB: Diagnosis history with citations (existing)
   - Vector Database: Document embeddings and metadata (new)
   - Redis: Caching layer for embeddings and documents (new)

---

## Components and Interfaces

### 1. RAG Retrieval Service

**Responsibility**: Retrieve relevant agricultural documents based on disease identification

**Interface**:
```typescript
interface RAGRetrievalService {
  retrieveDocuments(request: RetrievalRequest): Promise<RetrievalResponse>;
  getCachedDocuments(cacheKey: string): Promise<RetrievalResponse | null>;
  cacheDocuments(cacheKey: string, response: RetrievalResponse): Promise<void>;
}

interface RetrievalRequest {
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

interface RetrievalResponse {
  documents: RetrievedDocument[];
  retrievalTimeMs: number;
  cacheHit: boolean;
  similarityThreshold: number;
}

interface RetrievedDocument {
  documentId: string;
  title: string;
  content: string; // Relevant chunk
  metadata: DocumentMetadata;
  similarityScore: number;
  rank: number;
}

interface DocumentMetadata {
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
```

**Implementation Details**:

1. **Query Construction**
   - Combine disease name, scientific name, crop type, and severity
   - Add location and season filters if available
   - Example: "Late blight (Phytophthora infestans) in tomato, high severity, Maharashtra, kharif season"

2. **Embedding Generation**
   - Use Embedding Service to convert query to vector
   - Cache embeddings for common disease-crop combinations
   - Embedding dimension: 1536 (Amazon Titan Embeddings)

3. **Semantic Search**
   - Query vector database with embedding
   - Apply similarity threshold (default: 0.7)
   - Retrieve top K documents (default: 5)

4. **Ranking and Filtering**
   - Primary: Similarity score
   - Secondary: Regional relevance (boost documents matching farmer's state)
   - Tertiary: Seasonal relevance (boost documents matching current season)
   - Filter: Language preference (prioritize requested language, fallback to English)

5. **Caching Strategy**
   - Cache key: `rag:retrieval:{disease}:{crop}:{language}`
   - TTL: 24 hours
   - Cache hit rate target: ≥60%

### 2. Embedding Service

**Responsibility**: Generate vector embeddings for documents and queries

**Interface**:
```typescript
interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  getCachedEmbedding(text: string): Promise<number[] | null>;
  cacheEmbedding(text: string, embedding: number[]): Promise<void>;
}
```

**Implementation Details**:

1. **Model Selection**: Amazon Titan Embeddings G1 - Text
   - Dimension: 1536
   - Max input: 8192 tokens
   - Multilingual support: English, Hindi, and other Indian languages
   - Cost-effective for high-volume usage

2. **Text Preprocessing**
   - Normalize whitespace
   - Remove special characters
   - Truncate to max token limit
   - Preserve semantic meaning

3. **Batch Processing**
   - Process multiple documents in parallel
   - Batch size: 25 documents per API call
   - Retry logic for failed embeddings

4. **Caching**
   - Cache embeddings for frequently queried terms
   - Cache key: `rag:embedding:${hash(text)}`
   - TTL: 7 days

### 3. RAG Response Generator

**Responsibility**: Generate enhanced diagnosis with evidence-based recommendations

**Interface**:
```typescript
interface RAGResponseGenerator {
  generateEnhancedResponse(request: GenerationRequest): Promise<GenerationResponse>;
}

interface GenerationRequest {
  disease: {
    name: string;
    scientificName: string;
    type: string;
    severity: string;
    confidence: number;
  };
  cropType: string;
  symptoms: string[];
  retrievedDocuments: RetrievedDocument[];
  language: string;
}

interface GenerationResponse {
  enhancedDiagnosis: {
    diseaseDescription: string;
    scientificBackground: string;
  };
  recommendations: {
    chemical: ChemicalRecommendation[];
    organic: OrganicRecommendation[];
    preventive: PreventiveRecommendation[];
    regionalNotes?: string;
    seasonalNotes?: string;
  };
  citations: Citation[];
  generationTimeMs: number;
  ragApplied: boolean;
}

interface ChemicalRecommendation {
  name: string;
  genericName: string;
  brandNames: string[];
  dosage: string;
  applicationMethod: string;
  frequency: string;
  duration?: string;
  preHarvestInterval: number;
  safetyPrecautions: string[];
  estimatedCost: string;
  citationIds: string[]; // References to Citation[]
}

interface OrganicRecommendation {
  name: string;
  ingredients: string[];
  preparation: string[];
  applicationMethod: string;
  frequency: string;
  effectiveness: string;
  commercialProducts?: string[];
  citationIds: string[];
}

interface PreventiveRecommendation {
  category: 'crop_rotation' | 'irrigation' | 'spacing' | 'soil_health' | 'timing';
  description: string;
  timing?: string;
  frequency?: string;
  citationIds: string[];
}

interface Citation {
  id: string;
  documentId: string;
  title: string;
  source: string;
  author?: string;
  organization?: string;
  publicationDate?: Date;
  url?: string;
  relevantExcerpt: string;
}
```

**Implementation Details**:

1. **LLM Selection**: Amazon Nova Pro or Claude 3.5 Sonnet
   - Nova Pro: Cost-effective, good for structured output
   - Claude 3.5 Sonnet: Higher quality, better citation extraction
   - Decision: Start with Nova Pro, A/B test Claude

2. **Prompt Engineering**
   ```
   You are an agricultural expert providing evidence-based treatment recommendations.
   
   DISEASE INFORMATION:
   - Crop: {cropType}
   - Disease: {diseaseName} ({scientificName})
   - Severity: {severity}
   - Symptoms: {symptoms}
   
   RETRIEVED DOCUMENTS:
   {documents with IDs}
   
   TASK:
   Generate detailed treatment recommendations based ONLY on the provided documents.
   Include:
   1. Chemical treatments with dosage, application method, and safety precautions
   2. Organic alternatives with preparation instructions
   3. Preventive measures for future protection
   4. Regional and seasonal considerations if mentioned in documents
   
   CRITICAL REQUIREMENTS:
   - Every recommendation MUST cite at least one document using [DocID]
   - Do NOT include recommendations not supported by the documents
   - Include specific dosages, timings, and methods from the documents
   - Provide safety warnings and pre-harvest intervals
   
   OUTPUT FORMAT: JSON
   ```

3. **Citation Extraction**
   - Parse LLM response for document references
   - Validate all recommendations have citations
   - Extract relevant excerpts from source documents
   - Generate citation objects with full metadata

4. **Recommendation Filtering**
   - Remove recommendations without citations
   - Validate recommendations against retrieved documents
   - Ensure consistency with disease severity
   - Filter out contradictory recommendations

5. **Fallback Handling**
   - If LLM fails: Return basic recommendations without RAG
   - If no documents retrieved: Use existing remedy generator
   - If citation extraction fails: Mark as "general guidance"

### 4. Vector Database Service

**Responsibility**: Store and search document embeddings

**Technology Decision**: Amazon OpenSearch vs pgvector

**Comparison**:

| Criterion | Amazon OpenSearch | pgvector (RDS PostgreSQL) |
|-----------|-------------------|---------------------------|
| **Performance** | Excellent (purpose-built) | Good (general-purpose DB) |
| **Scalability** | Horizontal scaling | Vertical scaling |
| **Cost** | Higher ($100-200/month) | Lower ($50-100/month) |
| **AWS Integration** | Native AWS service | RDS managed service |
| **Query Features** | Advanced filtering, faceting | Basic vector search |
| **Maintenance** | Managed service | Managed service |
| **Learning Curve** | Moderate | Low (SQL-based) |
| **Vector Dimensions** | Up to 16,000 | Up to 16,000 |
| **Index Types** | HNSW, IVF | HNSW |

**Recommendation**: **Amazon OpenSearch**

**Rationale**:
1. Purpose-built for vector search with better performance
2. Advanced filtering capabilities for regional/seasonal metadata
3. Horizontal scalability for growing knowledge base
4. Native AWS integration with Bedrock and other services
5. Better suited for production workloads at scale

**Alternative**: Start with pgvector for MVP, migrate to OpenSearch if needed

**Interface**:
```typescript
interface VectorDatabaseService {
  indexDocument(document: DocumentToIndex): Promise<string>;
  indexBatchDocuments(documents: DocumentToIndex[]): Promise<string[]>;
  searchSimilar(query: SearchQuery): Promise<SearchResult[]>;
  updateDocument(documentId: string, updates: Partial<DocumentToIndex>): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  getDocument(documentId: string): Promise<IndexedDocument | null>;
}

interface DocumentToIndex {
  content: string;
  embedding: number[];
  metadata: DocumentMetadata;
}

interface SearchQuery {
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

interface SearchResult {
  documentId: string;
  content: string;
  metadata: DocumentMetadata;
  similarityScore: number;
}
```

**OpenSearch Schema**:
```json
{
  "mappings": {
    "properties": {
      "content": { "type": "text" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": {
            "ef_construction": 512,
            "m": 16
          }
        }
      },
      "metadata": {
        "properties": {
          "source": { "type": "keyword" },
          "author": { "type": "text" },
          "organization": { "type": "keyword" },
          "publicationDate": { "type": "date" },
          "language": { "type": "keyword" },
          "cropTypes": { "type": "keyword" },
          "diseaseCategories": { "type": "keyword" },
          "region": { "type": "keyword" },
          "season": { "type": "keyword" },
          "documentType": { "type": "keyword" },
          "url": { "type": "keyword" }
        }
      }
    }
  }
}
```

### 5. Knowledge Base Manager

**Responsibility**: Manage agricultural documents in the knowledge base

**Interface**:
```typescript
interface KnowledgeBaseManager {
  addDocument(document: KnowledgeDocument): Promise<string>;
  updateDocument(documentId: string, updates: Partial<KnowledgeDocument>): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  getDocument(documentId: string): Promise<KnowledgeDocument | null>;
  listDocuments(filters: DocumentFilters): Promise<KnowledgeDocument[]>;
}

interface KnowledgeDocument {
  title: string;
  content: string;
  metadata: DocumentMetadata;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentFilters {
  cropTypes?: string[];
  diseaseCategories?: string[];
  region?: string;
  language?: string;
  status?: string;
}
```

**Document Ingestion Pipeline**:

1. **Document Upload**
   - Accept PDF, DOCX, TXT formats
   - Extract text content
   - Validate metadata completeness

2. **Text Chunking**
   - Split document into semantic chunks
   - Chunk size: 500-1000 tokens
   - Overlap: 100 tokens for context preservation
   - Preserve paragraph boundaries

3. **Embedding Generation**
   - Generate embeddings for each chunk
   - Batch process for efficiency
   - Store chunk-level metadata

4. **Indexing**
   - Index embeddings in vector database
   - Store full document in MongoDB
   - Link chunks to parent document

5. **Quality Validation**
   - Check embedding quality
   - Validate metadata completeness
   - Test retrieval with sample queries

---

## Data Models

### MongoDB Schema Extensions

**Diagnosis Collection** (enhanced):
```typescript
interface DiagnosisDocument {
  // Existing fields
  _id: ObjectId;
  userId: string;
  diagnosisId: string;
  imageUrl: string;
  cropType: string;
  diseases: Disease[];
  symptoms: string[];
  confidence: number;
  remedies: Remedies;
  timestamp: Date;
  
  // New RAG fields
  ragEnhanced: boolean;
  retrievedDocuments?: {
    documentId: string;
    title: string;
    similarityScore: number;
  }[];
  citations?: Citation[];
  ragMetadata?: {
    retrievalTimeMs: number;
    generationTimeMs: number;
    documentsRetrieved: number;
    similarityThreshold: number;
    cacheHit: boolean;
  };
}
```

**Knowledge Base Collection** (new):
```typescript
interface KnowledgeBaseDocument {
  _id: ObjectId;
  documentId: string;
  title: string;
  content: string;
  chunks: {
    chunkId: string;
    content: string;
    startIndex: number;
    endIndex: number;
    vectorId: string; // Reference to vector DB
  }[];
  metadata: DocumentMetadata;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}
```

### Redis Cache Schema

**Embedding Cache**:
```
Key: rag:embedding:{hash(text)}
Value: JSON array of numbers
TTL: 7 days
```

**Retrieval Cache**:
```
Key: rag:retrieval:{disease}:{crop}:{language}
Value: JSON {documents, retrievalTimeMs, similarityThreshold}
TTL: 24 hours
```

**Document Cache**:
```
Key: rag:document:{documentId}
Value: JSON {content, metadata}
TTL: 24 hours
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

**Redundant Properties:**
- 11.4 is identical to 11.1 (citation requirement for recommendations)
- 11.8 is identical to 4.11 (filtering unsupported recommendations)
- Multiple logging properties (8.1-8.7) can be consolidated into comprehensive logging properties

**Consolidations:**
- Knowledge base storage properties (1.1-1.5) can be combined into document storage completeness
- Metadata preservation properties (1.8, 9.3, 10.7) can be combined into metadata invariant
- Caching properties (7.2-7.5) can be combined into cache consistency properties
- Configuration properties (12.1-12.4) can be combined into configuration validation

**Final Property Set:**
After reflection, 45 unique, non-redundant properties remain for implementation.

---

### Property 1: Document Storage Completeness

*For any* agricultural document with valid metadata (crop types, disease categories, language, region, season, document type), storing the document in the Knowledge Base and then retrieving it by ID should return a document with all metadata fields preserved.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.8**

### Property 2: Embedding Round-Trip Consistency

*For any* document in the Knowledge Base, retrieving the document by ID, re-embedding its content, and comparing to the original embedding should produce embeddings within 95% cosine similarity.

**Validates: Requirements 1.9**

### Property 3: Document Indexing Completeness

*For any* document added to the Knowledge Base, the Embedding Service should generate embeddings for all chunks, and the Vector Database should index all embeddings, making the document searchable.

**Validates: Requirements 1.6, 1.7**

### Property 4: Query Embedding Generation

*For any* disease identification result (disease name, crop type, severity), the Document Retriever should generate a query embedding with the same dimension as document embeddings.

**Validates: Requirements 3.1, 9.10**

### Property 5: Semantic Search Execution

*For any* query embedding, the Document Retriever should perform semantic search in the Vector Database and return results ordered by similarity score in descending order.

**Validates: Requirements 3.2, 3.4**

### Property 6: Similarity Threshold Filtering

*For any* similarity threshold value between 0.5 and 0.95, the Document Retriever should return only documents with similarity scores greater than or equal to the threshold.

**Validates: Requirements 3.3, 12.1**

### Property 7: Retrieval Result Bounds

*For any* valid query, the number of documents retrieved should be less than or equal to the configured maximum (default 5) and less than or equal to the total number of documents in the Knowledge Base.

**Validates: Requirements 3.5, 3.10, 12.2**

### Property 8: Regional Prioritization

*For any* query with regional information, documents matching the specified region should rank higher than documents without regional match, given similar base similarity scores.

**Validates: Requirements 3.6**

### Property 9: Seasonal Prioritization

*For any* query with seasonal information, documents matching the current season should rank higher than documents without seasonal match, given similar base similarity scores.

**Validates: Requirements 3.7**

### Property 10: Language Prioritization

*For any* query with language preference, documents in the requested language should rank higher than documents in other languages, given similar base similarity scores.

**Validates: Requirements 10.2**

### Property 11: Enhanced Response Structure

*For any* successful RAG generation, the Enhanced Diagnosis should include all required fields: disease description, scientific background, chemical recommendations, organic recommendations, preventive recommendations, and citations.

**Validates: Requirements 4.3, 4.4**

### Property 12: Regional and Seasonal Context Inclusion

*For any* Enhanced Diagnosis where retrieved documents contain regional or seasonal information, the response should include regional notes or seasonal notes fields.

**Validates: Requirements 4.5**

### Property 13: Effectiveness Data Inclusion

*For any* Enhanced Diagnosis where retrieved documents contain treatment effectiveness data, the response should include effectiveness information in the recommendations.

**Validates: Requirements 4.6**

### Property 14: Citation Completeness

*For any* Enhanced Diagnosis, every treatment recommendation (chemical, organic, or preventive) should be linked to at least one Source Citation from the retrieved documents.

**Validates: Requirements 4.7, 11.1, 11.4**

### Property 15: Citation Metadata Completeness

*For any* Source Citation in an Enhanced Diagnosis, the citation should include at minimum: document title, source, and either author/organization or publication date.

**Validates: Requirements 11.2, 11.3**

### Property 16: Recommendation Confidence Scoring

*For any* Enhanced Diagnosis, each recommendation should include a confidence score between 0 and 100.

**Validates: Requirements 4.8**

### Property 17: Recommendation Grounding

*For any* Enhanced Diagnosis, all recommendations should reference content that exists in the retrieved documents (no hallucinated recommendations).

**Validates: Requirements 4.9, 11.8**

### Property 18: Multiple Citation Support

*For any* recommendation supported by multiple retrieved documents, the Enhanced Diagnosis should list all supporting source citations.

**Validates: Requirements 11.6**

### Property 19: Evidence Strength Grouping

*For any* Enhanced Diagnosis with documents from different source types (research papers, treatment protocols, extension guides), recommendations should be grouped or ordered by evidence strength.

**Validates: Requirements 11.5**

### Property 20: Regional/Seasonal Data Indication

*For any* recommendation based on regional or seasonal data, the Enhanced Diagnosis should explicitly indicate this in the recommendation metadata or notes.

**Validates: Requirements 11.7**

### Property 21: RAG Enhancement Indicator

*For any* diagnosis response, the API should include a boolean field indicating whether RAG enhancement was successfully applied.

**Validates: Requirements 5.2, 5.3**

### Property 22: Fallback Mode Idempotence

*For any* diagnosis request that triggers Fallback Mode, processing the same request multiple times should produce identical results (same disease identification, same basic recommendations).

**Validates: Requirements 6.8**

### Property 23: Fallback Mode Activation

*For any* diagnosis where document retrieval fails, response generation fails, embedding service fails, or vector database is unavailable, the system should activate Fallback Mode and return basic disease identification without RAG enhancement.

**Validates: Requirements 6.1, 6.2, 6.4, 6.5**

### Property 24: Fallback Mode Indicator

*For any* diagnosis in Fallback Mode, the API response should include a field indicating RAG enhancement was not applied.

**Validates: Requirements 6.6**

### Property 25: Error Logging Completeness

*For any* RAG component failure (retrieval, embedding, generation, vector database), the system should log an error with component name, error type, and timestamp.

**Validates: Requirements 6.7**

### Property 26: Embedding Cache Consistency

*For any* query text, if a cached embedding exists, the Document Retriever should use the cached embedding instead of generating a new one, and the cached embedding should produce the same retrieval results as a freshly generated embedding.

**Validates: Requirements 7.2, 7.3**

### Property 27: Document Cache Consistency

*For any* disease-crop combination, if cached documents exist and are less than 24 hours old, the Document Retriever should use cached documents, and they should match the results of a fresh retrieval.

**Validates: Requirements 7.4, 7.5**

### Property 28: Metrics Logging Completeness

*For any* diagnosis request, the system should log retrieval latency, generation latency, total RAG latency, cache hit status, and RAG enhancement status.

**Validates: Requirements 7.8, 8.1, 8.2**

### Property 29: Citation Metrics Tracking

*For any* set of diagnoses over a time period, the system should track and expose the average number of citations per Enhanced Diagnosis.

**Validates: Requirements 8.4**

### Property 30: RAG Success Rate Tracking

*For any* set of diagnoses over a time period, the system should track and expose the percentage of diagnoses successfully enhanced with RAG.

**Validates: Requirements 8.3**

### Property 31: Document Chunking Bounds

*For any* document submitted to the Knowledge Base, all generated chunks should have token counts between 500 and 1000 tokens (inclusive).

**Validates: Requirements 9.1**

### Property 32: Chunk Embedding Completeness

*For any* document with N chunks, the Embedding Service should generate exactly N embeddings, and all embeddings should have the same dimension.

**Validates: Requirements 9.2, 9.10**

### Property 33: Chunk Metadata Preservation

*For any* document chunk, the metadata associated with the parent document should be preserved and linked to the chunk embedding in the Vector Database.

**Validates: Requirements 9.3, 9.4**

### Property 34: Embedding Model Consistency

*For any* document indexing operation and query embedding operation, the same embedding model should be used, ensuring dimensional compatibility.

**Validates: Requirements 9.6**

### Property 35: Document Update Propagation

*For any* document update in the Knowledge Base, the system should regenerate embeddings for all chunks and update the Vector Database index, making the updated content searchable.

**Validates: Requirements 9.7**

### Property 36: Document Deletion Completeness

*For any* document deleted from the Knowledge Base, all associated embeddings should be removed from the Vector Database, making the document no longer retrievable.

**Validates: Requirements 9.8**

### Property 37: Batch Processing Efficiency

*For any* set of N documents submitted simultaneously, the Embedding Service should process them in batches rather than individually, reducing total processing time.

**Validates: Requirements 9.9**

### Property 38: Multilingual Support

*For any* diagnosis request with language preference set to English, Hindi, or Marathi, the system should successfully process the request and return results in the requested language.

**Validates: Requirements 10.4**

### Property 39: Language Fallback

*For any* diagnosis request where documents in the requested language are not available, the Document Retriever should retrieve documents in English as a fallback.

**Validates: Requirements 10.5**

### Property 40: Response Translation

*For any* diagnosis where English documents are retrieved for a non-English request, the Response Generator should translate recommendations to the requested language.

**Validates: Requirements 10.6**

### Property 41: Configuration Validation

*For any* configuration update with invalid values (e.g., similarity threshold outside 0.5-0.95 range, max documents outside 1-10 range, cache TTL outside 1 hour-7 days range), the system should reject the configuration with a descriptive error message.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.8**

### Property 42: Feature Flag Control

*For any* diagnosis request, if the RAG enhancement feature flag is disabled, the system should skip RAG processing and return basic diagnosis results.

**Validates: Requirements 12.5**

### Property 43: A/B Testing Routing

*For any* configured A/B test percentage P (0-100), approximately P% of diagnosis requests should be routed to RAG enhancement, and (100-P)% should use basic diagnosis.

**Validates: Requirements 12.6**

### Property 44: Hot Configuration Reload

*For any* configuration change (similarity threshold, max documents, cache TTL, timeouts), the system should apply the new configuration to subsequent requests without requiring a service restart.

**Validates: Requirements 12.7**

### Property 45: Configuration Idempotence

*For any* configuration value, applying the same configuration multiple times should produce the same system behavior (no cumulative effects).

**Validates: Requirements 12.9**

---

## Error Handling

### Error Categories

1. **Retrieval Errors**
   - Vector database unavailable
   - Embedding service failure
   - No documents above similarity threshold
   - Query embedding generation failure

2. **Generation Errors**
   - LLM API failure (throttling, timeout, service error)
   - Invalid LLM response format
   - Citation extraction failure
   - Recommendation filtering failure

3. **Data Errors**
   - Invalid document format
   - Missing required metadata
   - Embedding dimension mismatch
   - Corrupted cache data

4. **Configuration Errors**
   - Invalid similarity threshold
   - Invalid max documents
   - Invalid cache TTL
   - Invalid timeout values

### Error Handling Strategy

**Graceful Degradation**:
```typescript
try {
  // Attempt RAG enhancement
  const documents = await ragRetrievalService.retrieveDocuments(request);
  const enhancedResponse = await ragResponseGenerator.generate(disease, documents);
  return enhancedResponse;
} catch (error) {
  // Log error
  logger.error('RAG enhancement failed', { error, diagnosisId });
  
  // Activate fallback mode
  return {
    ...basicDiagnosis,
    ragEnhanced: false,
    fallbackReason: error.code
  };
}
```

**Timeout Handling**:
```typescript
const retrievalPromise = ragRetrievalService.retrieveDocuments(request);
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new TimeoutError('Retrieval timeout')), 1500)
);

try {
  const documents = await Promise.race([retrievalPromise, timeoutPromise]);
} catch (error) {
  if (error instanceof TimeoutError) {
    // Activate fallback
    return basicDiagnosis;
  }
  throw error;
}
```

**Partial Failure Handling**:
- If some documents fail to retrieve: Use available documents
- If some citations fail to extract: Include recommendations without citations
- If regional/seasonal data missing: Generate without context

**Retry Strategy**:
- Retrieval failures: 2 retries with exponential backoff
- Generation failures: 1 retry with different temperature
- Embedding failures: 2 retries with exponential backoff
- No retries for timeout errors (activate fallback immediately)

### Error Response Format

```typescript
interface RAGError {
  code: string;
  message: string;
  component: 'retrieval' | 'embedding' | 'generation' | 'vector_db';
  retryable: boolean;
  fallbackActivated: boolean;
  timestamp: Date;
}
```

---

## Testing Strategy

### Dual Testing Approach

The RAG enhancement requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Specific disease-crop combinations
- Integration points between components
- Error handling scenarios
- Cache behavior
- Fallback mode activation

**Property Tests**: Verify universal properties across all inputs
- Document storage and retrieval correctness
- Embedding consistency and round-trip properties
- Retrieval ranking and filtering
- Citation completeness
- Configuration validation
- Idempotence properties

Together, unit tests catch concrete bugs while property tests verify general correctness across all possible inputs.

### Property-Based Testing Configuration

**Library**: fast-check (TypeScript/JavaScript)

**Configuration**:
- Minimum 100 iterations per property test
- Each property test must reference its design document property
- Tag format: `Feature: dr-fasal-rag-enhancement, Property {number}: {property_text}`

**Example**:
```typescript
import fc from 'fast-check';

describe('Feature: dr-fasal-rag-enhancement, Property 2: Embedding Round-Trip Consistency', () => {
  it('should maintain 95% similarity after round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 100, maxLength: 1000 }),
        async (documentContent) => {
          // Store document
          const docId = await knowledgeBase.addDocument({
            content: documentContent,
            metadata: { /* ... */ }
          });
          
          // Retrieve and re-embed
          const doc = await knowledgeBase.getDocument(docId);
          const originalEmbedding = doc.embedding;
          const newEmbedding = await embeddingService.generateEmbedding(doc.content);
          
          // Calculate cosine similarity
          const similarity = cosineSimilarity(originalEmbedding, newEmbedding);
          
          // Assert >= 95% similarity
          expect(similarity).toBeGreaterThanOrEqual(0.95);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage

**RAG Retrieval Service**:
- Query embedding generation for various disease types
- Semantic search with different similarity thresholds
- Regional and seasonal prioritization
- Language filtering
- Cache hit and miss scenarios
- Error handling and fallback

**Embedding Service**:
- Single embedding generation
- Batch embedding generation
- Cache usage
- Error handling
- Dimension consistency

**RAG Response Generator**:
- Enhanced response generation with various document sets
- Citation extraction
- Recommendation filtering
- Multilingual generation
- Error handling and fallback

**Vector Database Service**:
- Document indexing
- Semantic search
- Metadata filtering
- Document updates and deletions
- Connection pooling

**Knowledge Base Manager**:
- Document ingestion
- Text chunking
- Metadata validation
- Document updates and deletions

### Integration Tests

**End-to-End RAG Flow**:
1. Submit diagnosis request
2. Verify disease identification
3. Verify document retrieval
4. Verify enhanced response generation
5. Verify citations included
6. Verify storage with citations

**Fallback Scenarios**:
1. Vector database unavailable → Fallback mode
2. No documents above threshold → Fallback mode
3. LLM generation failure → Fallback mode
4. Embedding service failure → Fallback mode

**Performance Tests**:
- Retrieval latency under load
- Generation latency under load
- Cache effectiveness
- Concurrent request handling

### Test Data

**Knowledge Base Test Documents**:
- 100+ agricultural documents covering:
  - 10 major crops (rice, wheat, tomato, cotton, etc.)
  - 20 common diseases (late blight, powdery mildew, etc.)
  - Multiple regions (Maharashtra, Punjab, Tamil Nadu, etc.)
  - Multiple seasons (kharif, rabi, zaid)
  - Multiple languages (English, Hindi, Marathi)

**Test Queries**:
- Common disease-crop combinations
- Rare disease-crop combinations
- Regional-specific queries
- Seasonal-specific queries
- Multilingual queries

---

## Deployment and Operations

### Infrastructure Requirements

**AWS Services**:
1. **Amazon OpenSearch** (Vector Database)
   - Instance: t3.medium.search (2 vCPU, 4 GB RAM)
   - Storage: 100 GB EBS
   - Estimated cost: $100-150/month

2. **Amazon Bedrock** (LLM and Embeddings)
   - Nova Pro: $0.0008/1K input tokens, $0.0032/1K output tokens
   - Titan Embeddings: $0.0001/1K tokens
   - Estimated cost: $50-100/month (10K diagnoses)

3. **Amazon ElastiCache for Redis** (Caching)
   - Instance: cache.t3.micro (2 vCPU, 0.5 GB RAM)
   - Estimated cost: $15-20/month

4. **Amazon RDS PostgreSQL** (Alternative Vector DB)
   - Instance: db.t3.medium (2 vCPU, 4 GB RAM)
   - Storage: 100 GB
   - Estimated cost: $80-120/month

**Total Estimated Cost**: $165-270/month (OpenSearch) or $145-240/month (pgvector)

### Deployment Strategy

**Phase 1: MVP (Weeks 1-2)**
- Implement core RAG components
- Use pgvector for vector database (lower cost, faster setup)
- Basic knowledge base with 50 documents
- Deploy to development environment

**Phase 2: Testing (Weeks 3-4)**
- Comprehensive unit and property tests
- Integration tests
- Performance testing
- A/B testing with 10% traffic

**Phase 3: Production (Week 5)**
- Migrate to Amazon OpenSearch (if performance requires)
- Expand knowledge base to 200+ documents
- Deploy to production
- Gradual rollout: 25% → 50% → 100%

**Phase 4: Optimization (Week 6+)**
- Monitor performance and quality metrics
- Tune similarity thresholds
- Optimize caching strategy
- Expand knowledge base

### Monitoring and Alerting

**Key Metrics**:
- RAG enhancement success rate (target: ≥80%)
- Average citations per diagnosis (target: ≥3)
- Retrieval latency P95 (target: ≤1500ms)
- Generation latency P95 (target: ≤2000ms)
- Cache hit rate (target: ≥60%)
- Fallback rate (target: ≤20%)

**Alerts**:
- Fallback rate >20% for 1 hour
- Retrieval latency P95 >1500ms for 10 minutes
- Generation latency P95 >2000ms for 10 minutes
- Cache hit rate <40% for 1 hour
- Vector database errors >5% for 5 minutes

**Dashboards**:
- RAG performance dashboard (latencies, success rates)
- Quality dashboard (citations, confidence scores)
- Cost dashboard (Bedrock API usage, OpenSearch costs)
- Error dashboard (fallback reasons, error rates)

### Operational Procedures

**Knowledge Base Updates**:
1. Upload new documents via admin interface
2. System validates metadata completeness
3. Documents chunked and embedded
4. Embeddings indexed in vector database
5. Documents marked as "published"
6. Monitoring for retrieval quality

**Incident Response**:
1. **High Fallback Rate**: Check vector database health, embedding service
2. **High Latency**: Check OpenSearch performance, consider scaling
3. **Low Citation Rate**: Review document quality, tune similarity threshold
4. **Cost Spike**: Review Bedrock usage, optimize caching

**Capacity Planning**:
- Monitor OpenSearch disk usage (alert at 70%)
- Monitor Redis memory usage (alert at 80%)
- Monitor Bedrock API quotas
- Plan for 2x growth in knowledge base size

---

## Security and Privacy

### Data Security

**Document Storage**:
- Agricultural documents stored in MongoDB with encryption at rest
- Access control via IAM roles
- Audit logging for all document modifications

**Vector Database**:
- OpenSearch cluster in private VPC subnet
- Encryption at rest and in transit
- Fine-grained access control

**API Security**:
- JWT authentication (existing)
- Rate limiting (existing: 10 requests/hour)
- Input validation and sanitization

### Privacy Considerations

**Farmer Data**:
- Diagnosis history with citations stored in MongoDB
- No PII in vector database (only document content)
- Farmers can delete their diagnosis history (existing)

**Document Sources**:
- Proper attribution in citations
- Copyright compliance for research papers
- Licensing for commercial treatment protocols

### Compliance

**Data Retention**:
- Diagnosis records: 2 years (configurable)
- Knowledge base documents: Indefinite
- Cache data: 24 hours (automatic expiration)

**Audit Trail**:
- All knowledge base modifications logged
- RAG enhancement decisions logged
- Fallback activations logged

---

## Future Enhancements

### Phase 2 Features

1. **Feedback Loop**
   - Collect farmer feedback on recommendation quality
   - Use feedback to improve retrieval ranking
   - Identify knowledge gaps in document base

2. **Advanced Retrieval**
   - Hybrid search (semantic + keyword)
   - Query expansion with synonyms
   - Multi-hop reasoning for complex cases

3. **Enhanced Citations**
   - Direct links to source documents
   - Excerpt highlighting in source
   - Citation confidence scores

4. **Personalization**
   - User-specific document preferences
   - Regional bias based on user location
   - Historical diagnosis context

### Phase 3 Features

1. **Real-Time Updates**
   - Streaming document ingestion
   - Incremental index updates
   - Hot-swap document versions

2. **Advanced Analytics**
   - Disease trend analysis from diagnoses
   - Treatment effectiveness tracking
   - Regional disease outbreak detection

3. **Multi-Modal RAG**
   - Image-based document retrieval
   - Video treatment demonstrations
   - Audio guidance in local languages

4. **Expert Integration**
   - Expert review of RAG recommendations
   - Expert-contributed documents
   - Expert Q&A integration

---

## Appendix

### Glossary

- **RAG (Retrieval-Augmented Generation)**: AI technique combining document retrieval with LLM generation
- **Vector Database**: Database optimized for storing and searching high-dimensional vectors
- **Embedding**: Numerical vector representation of text for semantic similarity
- **Semantic Search**: Search based on meaning rather than keyword matching
- **Cosine Similarity**: Measure of similarity between two vectors (0-1 scale)
- **HNSW**: Hierarchical Navigable Small World graph for approximate nearest neighbor search
- **Fallback Mode**: Operational mode when RAG components fail, returning basic diagnosis

### References

1. Amazon Bedrock Documentation: https://docs.aws.amazon.com/bedrock/
2. Amazon OpenSearch Service: https://docs.aws.amazon.com/opensearch-service/
3. pgvector Documentation: https://github.com/pgvector/pgvector
4. RAG Best Practices: https://www.anthropic.com/index/retrieval-augmented-generation
5. Vector Database Comparison: https://benchmark.vectorview.ai/

### Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-11 | System | Initial design document |

---

**End of Design Document**
