# Knowledge Base Manager Service

## Overview

The Knowledge Base Manager is a core component of the Dr. Fasal RAG Enhancement system. It manages the lifecycle of agricultural documents in the knowledge base, including storage, chunking, embedding generation, and vector database indexing.

## Features

### Document Management
- **CRUD Operations**: Add, update, delete, get, and list agricultural documents
- **Status Management**: Track documents as draft, published, or archived
- **Metadata Storage**: Store comprehensive metadata for each document
- **Version Control**: Track document versions for updates

### Document Chunking Pipeline
- **Smart Chunking**: Split documents into 500-1000 token chunks
- **Overlap Strategy**: 100 token overlap between chunks for context preservation
- **Paragraph Preservation**: Maintain paragraph boundaries (no mid-paragraph splits)
- **Chunk Metadata**: Track chunk position and link to parent document

### Document Ingestion Pipeline
- **Validation**: Validate document structure and metadata completeness
- **Chunking**: Split document into semantic chunks
- **Embedding Generation**: Generate vector embeddings for all chunks via EmbeddingService
- **Vector Indexing**: Index embeddings in VectorDatabaseService
- **MongoDB Storage**: Store full document with chunk metadata

## Usage

### Initialize the Service

```typescript
import { KnowledgeBaseManager } from './knowledge-base-manager.service';
import { EmbeddingService } from './embedding.service';
import { VectorDatabaseService } from './vector-database.service';

const embeddingService = new EmbeddingService();
const vectorDbService = new VectorDatabaseService();
await vectorDbService.initialize();

const kbManager = new KnowledgeBaseManager(embeddingService, vectorDbService);
```

### Add a Document

```typescript
const document: KnowledgeDocument = {
  title: 'Tomato Late Blight Management',
  content: 'Full document content here...',
  metadata: {
    source: 'ICAR',
    language: 'en',
    cropTypes: ['tomato'],
    diseaseCategories: ['fungal'],
    region: 'Maharashtra',
    season: 'kharif',
    documentType: 'treatment_protocol'
  },
  status: 'published',
  createdAt: new Date(),
  updatedAt: new Date()
};

const documentId = await kbManager.addDocument(document);
```

### List Documents

```typescript
const documents = await kbManager.listDocuments({
  cropTypes: ['tomato'],
  status: 'published'
});
```

## Testing

Run unit tests:
```bash
npm test -- knowledge-base-manager.service.test.ts
```

Run manual test:
```bash
npx ts-node src/features/crop-diagnosis/services/__tests__/knowledge-base-manager.manual-test.ts
```

## Requirements

Satisfies requirements: 1.1-1.7, 9.1, 9.3
