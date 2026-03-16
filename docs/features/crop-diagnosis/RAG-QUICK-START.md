# RAG Quick Start Guide

## TL;DR - Get RAG Working in 5 Steps

### Step 1: Ensure Prerequisites
```bash
# PostgreSQL with pgvector running
psql -h localhost -U postgres -c "SELECT 1;"

# AWS Bedrock access configured (IAM role on EC2 or credentials)
aws bedrock list-foundation-models --region us-east-1
```

### Step 2: Set Environment Variables
```bash
# Add to .env or ecosystem.config.js
RAG_ENABLED=true
SIMILARITY_THRESHOLD=0.7
MAX_RETRIEVED_DOCUMENTS=5
RETRIEVAL_TIMEOUT_MS=1500
GENERATION_TIMEOUT_MS=2000

# PostgreSQL connection
POSTGRES_HOST=localhost
POSTGRES_DB=bharat_mandi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Redis (optional)
REDIS_ENABLED=false
```

### Step 3: Ingest Knowledge Base
```bash
# Run the ingestion script
npx ts-node scripts/ingest-knowledge-base.ts

# Verify documents were indexed
psql -h localhost -U postgres -d bharat_mandi -c "SELECT COUNT(*) FROM rag_documents;"
# Expected: 22 documents
```

### Step 4: Test with Known Disease
```bash
# Test Late Blight on Tomato (should retrieve documents)
curl -X POST http://localhost:3000/api/v1/diagnosis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-images/tomato-late-blight.jpg" \
  -F "cropHint=tomato" \
  -F "language=en"
```

### Step 5: Verify RAG Enhancement
Check the response for:
```json
{
  "ragEnhanced": true,
  "ragMetadata": {
    "retrievalTimeMs": 450,
    "generationTimeMs": 1800,
    "documentsRetrieved": 3,
    "similarityThreshold": 0.7,
    "cacheHit": false
  },
  "citations": [
    {
      "citationId": "cite-1",
      "documentId": "disease-fungal-late-blight",
      "title": "Knowledge Base - fungal",
      "excerpt": "Disease: Late Blight...",
      "source": "Knowledge Base - fungal",
      "relevanceScore": 0.89
    }
  ]
}
```

## Troubleshooting

### No Documents Retrieved?
```bash
# Check if knowledge base is populated
psql -h localhost -U postgres -d bharat_mandi -c "SELECT document_id, metadata->>'source' FROM rag_documents LIMIT 5;"

# Lower similarity threshold
SIMILARITY_THRESHOLD=0.5
```

### Timeout Errors?
```bash
# Increase timeouts
RETRIEVAL_TIMEOUT_MS=3000
GENERATION_TIMEOUT_MS=4000
```

### RAG Not Running?
```bash
# Check logs for:
[DiagnosisService] Stage 5.5: Attempting RAG enhancement...
[RAGRetrieval] Query: Late Blight (Phytophthora infestans) in tomato...
[RAGRetrieval] Found 3 documents above threshold
[RAGGenerator] Generating response for Late Blight
[DiagnosisService] ✓ RAG enhancement successful
```

## Test Cases

### ✅ Should Retrieve Documents
- Late Blight on Tomato/Potato
- Powdery Mildew on Wheat/Tomato
- Rust on Wheat/Maize
- Bacterial Wilt on Tomato
- Aphids on Cotton

### ❌ Should Fallback (No Documents)
- Unknown diseases not in knowledge base
- Crops not covered (e.g., mango, banana)
- Very low similarity scores

## Knowledge Base Coverage

**22 Diseases Indexed:**
- Fungal (5): Late Blight, Powdery Mildew, Rust, Leaf Spot, Anthracnose
- Bacterial (3): Bacterial Wilt, Bacterial Blight, Soft Rot
- Viral (4): Tomato Mosaic, Leaf Curl, Yellow Vein Mosaic, Rice Tungro
- Pests (5): Aphids, Whiteflies, Bollworms, Stem Borers, Leaf Miners
- Nutrient (5): N, P, K, Fe, Mg deficiencies

**10 Crops Covered:**
Rice, Wheat, Maize, Cotton, Sugarcane, Tomato, Potato, Onion, Chili, Brinjal

## Performance Targets

| Metric | Target |
|--------|--------|
| Retrieval Time | <1500ms |
| Generation Time | <2000ms |
| Total RAG Overhead | <3000ms |
| Documents Retrieved | 3-5 |
| Citations | 2-4 |

## Next Steps

1. ✅ Populate knowledge base (Step 3)
2. ✅ Test basic RAG flow (Step 4-5)
3. ⏭️ Test fallback modes (disable RAG, unknown disease)
4. ⏭️ Monitor performance metrics
5. ⏭️ Expand knowledge base with more documents
6. ⏭️ Implement admin interface for document management

## Quick Commands

```bash
# Check vector database
psql -h localhost -U postgres -d bharat_mandi -c "SELECT COUNT(*) FROM rag_documents;"

# View sample documents
psql -h localhost -U postgres -d bharat_mandi -c "SELECT document_id, metadata->>'cropTypes' FROM rag_documents LIMIT 10;"

# Check embedding dimensions
psql -h localhost -U postgres -d bharat_mandi -c "SELECT document_id, array_length(embedding, 1) FROM rag_documents LIMIT 5;"

# Clear knowledge base (if needed)
psql -h localhost -U postgres -d bharat_mandi -c "TRUNCATE TABLE rag_documents;"

# Re-ingest
npx ts-node scripts/ingest-knowledge-base.ts
```

## Support

See full testing guide: `docs/features/crop-diagnosis/RAG-TESTING-GUIDE.md`
