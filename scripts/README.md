# Scripts Directory

This directory contains utility scripts for the Bharat Mandi application.

## Available Scripts

### Knowledge Base Ingestion

**File**: `ingest-knowledge-base.ts`

**Purpose**: Ingests disease data from JSON files into the vector database for RAG functionality.

**Usage**:
```bash
npx ts-node scripts/ingest-knowledge-base.ts
```

**What it does**:
1. Loads disease data from `src/features/crop-diagnosis/data/knowledge-base/`
2. Generates embeddings using AWS Titan Embeddings
3. Indexes documents in PostgreSQL with pgvector
4. Provides progress feedback and error handling

**Prerequisites**:
- PostgreSQL with pgvector extension running
- AWS Bedrock access configured
- Environment variables set (see below)

**Expected Output**:
```
============================================================
Knowledge Base Ingestion Script
============================================================

Initializing services...
✓ Embedding service initialized
✓ Vector database service initialized

Found 22 diseases to ingest:
  - Fungal: 5
  - Bacterial: 3
  - Viral: 4
  - Pests: 5
  - Nutrient Deficiency: 5

[1/22] Processing: Late Blight
  Scientific name: Phytophthora infestans
  Type: fungal
  Affected crops: tomato, potato
  Content length: 1234 characters
  Generating embedding...
  ✓ Embedding generated (450ms, dimension: 1536)
  Indexing in vector database...
  ✓ Indexed successfully (120ms)

...

============================================================
Ingestion Complete!
============================================================
Total diseases processed: 22
Successfully indexed: 22
Errors: 0

✓ Knowledge base is ready for RAG testing!
```

**Environment Variables Required**:
```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bharat_mandi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# AWS Bedrock
AWS_REGION=us-east-1
# Use IAM role on EC2, or set:
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret

# Redis (optional)
REDIS_ENABLED=false
```

**Verification**:
```bash
# Check if documents were indexed
psql -h localhost -U postgres -d bharat_mandi -c "SELECT COUNT(*) FROM rag_documents;"
# Expected: 22

# View sample documents
psql -h localhost -U postgres -d bharat_mandi -c "SELECT document_id, metadata->>'source' FROM rag_documents LIMIT 5;"
```

**Troubleshooting**:

1. **Error: Cannot connect to PostgreSQL**
   - Verify PostgreSQL is running
   - Check connection string in environment variables
   - Ensure pgvector extension is installed

2. **Error: AWS Bedrock access denied**
   - Verify AWS credentials or IAM role
   - Check Bedrock is available in your region
   - Ensure Titan Embeddings model access is enabled

3. **Error: Embedding generation timeout**
   - Check network connectivity to AWS
   - Verify AWS Bedrock quotas
   - Try again (may be temporary throttling)

4. **Some documents failed to ingest**
   - Check error messages for specific failures
   - Verify JSON file format is correct
   - Ensure all required fields are present

**Re-running the Script**:

If you need to re-ingest (e.g., after updating disease data):

```bash
# Clear existing documents
psql -h localhost -U postgres -d bharat_mandi -c "TRUNCATE TABLE rag_documents;"

# Re-run ingestion
npx ts-node scripts/ingest-knowledge-base.ts
```

## Deployment Scripts

### Deploy to AWS EC2

**File**: `deployment/deploy.ps1`

**Purpose**: Deploys the application to AWS EC2 instance.

**Usage**:
```bash
npm run deploy
```

See `deployment/README.md` for detailed deployment instructions.

## Adding New Scripts

When adding new scripts to this directory:

1. Create the script file with `.ts` or `.js` extension
2. Add a clear comment block at the top explaining:
   - Purpose
   - Usage
   - Prerequisites
   - Expected output
3. Update this README with script documentation
4. Add npm script in `package.json` if appropriate
5. Include error handling and progress feedback
6. Test thoroughly before committing

## Script Conventions

- Use TypeScript for type safety
- Include comprehensive error handling
- Provide clear progress feedback
- Log important operations
- Exit with appropriate status codes (0 = success, 1 = error)
- Document all prerequisites and environment variables
- Include verification steps in documentation

## Related Documentation

- **RAG Testing Guide**: `docs/features/crop-diagnosis/RAG-TESTING-GUIDE.md`
- **RAG Quick Start**: `docs/features/crop-diagnosis/RAG-QUICK-START.md`
- **Deployment Guide**: `deployment/README.md`
