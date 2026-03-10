# AI Smoke Test - Test Data and Queries

**Purpose**: Documents the exact test data and queries used in AI endpoint performance testing

---

## Overview

The smoke test uses realistic data to validate AI endpoints with minimal cost (~$0.10 per run). Each scenario tests a different AI feature with representative inputs.

---

## Test Scenarios

### 1. Dr. Fasal (Crop Disease Diagnosis)

**Endpoint**: `POST /api/diagnosis/test`

**Test Image**: `sample-crop-disease.jpg`
- **Source**: Tomato Late Blight from PlantVillage dataset
- **Disease**: Late Blight (Phytophthora infestans)
- **Crop**: Tomato
- **Why this image**: Late blight is a common, serious disease that's easy for AI to detect with high confidence

**Request Data**:
```json
{
  "image": "sample-crop-disease.jpg",
  "cropType": "tomato",
  "language": "en",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "state": "Maharashtra"
  }
}
```

**Location Details**:
- **Coordinates**: Mumbai, Maharashtra (19.0760°N, 72.8777°E)
- **Why Mumbai**: Major agricultural region, representative of Indian farming conditions

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "diagnosisId": "uuid-here",
    "cropType": "tomato",
    "cropLocalName": "टमाटर",
    "disease": {
      "name": "Late Blight",
      "localName": "पछेती अंगमारी",
      "scientificName": "Phytophthora infestans",
      "category": "fungal",
      "severity": "high"
    },
    "confidence": 0.92,
    "remedies": {
      "chemical": [...],
      "organic": [...],
      "preventive": [...]
    },
    "expertEscalation": false
  }
}
```

**Performance Expectations**:
- **First call**: 2-4 seconds (Nova Pro analysis + remedy generation)
- **Cached call**: <500ms (cache hit)
- **Success rate**: >95%

---

### 2. Fasal-Parakh (Produce Grading)

**Endpoint**: `POST /api/grading/grade-with-image`

**Test Image**: `sample-produce.jpg`
- **Source**: Healthy Tomato from PlantVillage dataset
- **Produce**: Fresh tomato
- **Quality**: Good quality, no visible defects
- **Why this image**: Clean, well-lit image suitable for grading

**Request Data**:
```json
{
  "image": "sample-produce.jpg",
  "farmerId": "smoke-test-farmer",
  "produceType": "tomato",
  "lat": "19.0760",
  "lng": "72.8777",
  "autoDetect": "true"
}
```

**Expected Response**:
```json
{
  "success": true,
  "gradingResult": {
    "grade": "A",
    "quality": "Premium",
    "confidence": 0.88,
    "defects": []
  },
  "certificate": {
    "certificateId": "uuid-here",
    "qrCode": "base64-qr-code",
    "issuedAt": "2026-03-10T..."
  },
  "analysis": {
    "color": "Good",
    "size": "Medium",
    "shape": "Regular",
    "surfaceQuality": "Excellent"
  }
}
```

**Performance Expectations**:
- **Response time**: 2-3 seconds (Nova Pro grading + certificate generation)
- **Success rate**: >95%

---

### 3. Kisan Mitra (AI Assistant)

**Endpoint**: `POST /api/kisan-mitra/query`

**Test Query**: "What fertilizer should I use for tomatoes?"

**Request Data**:
```json
{
  "userId": "smoke-test-user",
  "query": "What fertilizer should I use for tomatoes?",
  "language": "en"
}
```

**Why this query**:
- **Common question**: Fertilizer advice is one of the most frequent farmer queries
- **Straightforward**: Clear intent, easy for AI to understand
- **Testable**: Response should include specific fertilizer recommendations

**Expected Response**:
```json
{
  "success": true,
  "response": "For tomatoes, I recommend using a balanced NPK fertilizer...",
  "intent": "fertilizer_recommendation",
  "confidence": 0.85,
  "context": {
    "crop": "tomato",
    "topic": "fertilizer"
  },
  "followUpSuggestions": [
    "When should I apply fertilizer?",
    "How much fertilizer per plant?"
  ]
}
```

**Performance Expectations**:
- **Response time**: 1-2 seconds (Claude Sonnet inference)
- **Success rate**: >95%

---

### 4. Voice TTS (Text-to-Speech)

**Endpoint**: `POST /api/voice/synthesize`

**Test Text**: "Hello farmer"

**Request Data**:
```json
{
  "text": "Hello farmer",
  "language": "en",
  "speed": 1.0
}
```

**Why this text**:
- **Short**: Minimal cost, fast synthesis
- **Simple**: Common greeting, easy to synthesize
- **Testable**: Verifies TTS pipeline works

**Expected Response**:
```json
{
  "success": true,
  "audioUrl": "https://s3.../audio.mp3",
  "duration": 1.2,
  "cached": false
}
```

**Performance Expectations**:
- **First call**: 500-1000ms (Polly synthesis + S3 upload)
- **Cached call**: <200ms (cache hit)
- **Success rate**: >98%

---

### 5. Translation

**Endpoint**: `POST /api/i18n/translate`

**Test Text**: "Your crop is healthy"

**Request Data**:
```json
{
  "text": "Your crop is healthy",
  "targetLanguage": "hi",
  "sourceLanguage": "en"
}
```

**Why this text**:
- **Common phrase**: Typical diagnosis result message
- **Agricultural context**: Domain-specific vocabulary
- **Hindi translation**: Most common target language

**Expected Response**:
```json
{
  "success": true,
  "translatedText": "आपकी फसल स्वस्थ है",
  "sourceLanguage": "en",
  "targetLanguage": "hi"
}
```

**Performance Expectations**:
- **Response time**: 200-500ms (AWS Translate)
- **Success rate**: >99%

---

## Test Data Files

### Required Files in `scripts/perf-tests/test-data/`

| File | Source | Size | Purpose |
|------|--------|------|---------|
| `sample-crop-disease.jpg` | PlantVillage: Tomato Late Blight | ~50-100 KB | Dr. Fasal diagnosis testing |
| `sample-produce.jpg` | PlantVillage: Healthy Tomato | ~50-100 KB | Fasal-Parakh grading testing |
| `sample-audio.mp3` | Manual recording or any MP3 | ~10-50 KB | Kisan Mitra voice input (optional) |

### How to Get Test Files

**Option 1: Automated Setup (Recommended)**
```powershell
# Download PlantVillage dataset
.\scripts\download-test-images.ps1

# Copy samples to test-data directory
.\scripts\perf-tests\setup-test-data.ps1
```

**Option 2: Manual Setup**
```powershell
# Create directory
mkdir scripts\perf-tests\test-data

# Copy any crop disease image
Copy-Item "path\to\disease-image.jpg" "scripts\perf-tests\test-data\sample-crop-disease.jpg"

# Copy any produce image
Copy-Item "path\to\produce-image.jpg" "scripts\perf-tests\test-data\sample-produce.jpg"
```

---

## Test Data Characteristics

### Image Requirements

**Dr. Fasal (Diagnosis)**:
- **Format**: JPEG, PNG, WebP
- **Size**: 100 KB - 5 MB
- **Resolution**: 640x480 minimum, 1920x1080 recommended
- **Content**: Clear crop disease symptoms visible
- **Lighting**: Good natural or artificial lighting
- **Focus**: Sharp, not blurry

**Fasal-Parakh (Grading)**:
- **Format**: JPEG, PNG, WebP
- **Size**: 100 KB - 5 MB
- **Resolution**: 640x480 minimum, 1920x1080 recommended
- **Content**: Single produce item, clear view
- **Background**: Plain or minimal background
- **Lighting**: Even lighting, no harsh shadows

### Query Characteristics

**Kisan Mitra**:
- **Length**: 5-100 words
- **Language**: English, Hindi, or other Indian languages
- **Topics**: Farming, crops, diseases, fertilizers, weather, market prices
- **Complexity**: Simple questions to complex multi-part queries

---

## Cost Analysis

### Per Request Costs (Approximate)

| Endpoint | AWS Service | Cost per Request | Smoke Test (5 req) |
|----------|-------------|------------------|-------------------|
| Dr. Fasal | Bedrock Nova Pro | $0.008 | $0.04 |
| Fasal-Parakh | Bedrock Nova Pro | $0.008 | $0.04 |
| Kisan Mitra | Bedrock Claude | $0.003 | $0.015 |
| Voice TTS | Polly | $0.0001 | $0.0005 |
| Translation | Translate | $0.00015 | $0.00075 |
| **Total** | - | - | **~$0.10** |

### Full Load Test Costs (1200 requests)

| Endpoint | Requests | Cost |
|----------|----------|------|
| Dr. Fasal | 300 | $2.40 |
| Fasal-Parakh | 300 | $2.40 |
| Kisan Mitra | 300 | $0.90 |
| Voice TTS | 150 | $0.015 |
| Translation | 150 | $0.0225 |
| **Total** | 1200 | **~$5.75** |

---

## Realistic vs Synthetic Data

### Current Approach: Realistic Data ✅

**Advantages**:
- Tests actual AI model performance
- Validates end-to-end pipeline
- Catches real-world issues
- Provides accurate performance metrics

**Disadvantages**:
- Requires actual image files
- Higher AWS costs
- Slower test execution

### Alternative: Synthetic/Mock Data ❌

**Not Recommended for AI Endpoints** because:
- Doesn't test actual AI models
- Misses Bedrock API issues
- Doesn't validate image processing
- False confidence in performance

---

## Test Data Maintenance

### When to Update Test Data

1. **New crop types added**: Add representative images
2. **New diseases added**: Include in test set
3. **Quality issues found**: Replace problematic images
4. **Performance degradation**: Verify test data quality

### Test Data Versioning

Store test data in version control:
```
scripts/perf-tests/test-data/
├── README.md              # Documentation
├── sample-crop-disease.jpg
├── sample-produce.jpg
└── sample-audio.mp3
```

---

## Troubleshooting

### Issue: Low confidence scores

**Cause**: Poor quality test images

**Solution**: Use high-quality, well-lit images with clear disease symptoms

### Issue: Inconsistent results

**Cause**: Test images with ambiguous symptoms

**Solution**: Use images with clear, unambiguous disease indicators

### Issue: High costs

**Cause**: Running full load tests frequently

**Solution**: Use smoke test ($0.10) for quick validation, full test ($5.75) only when needed

---

**Document Version**: 1.0.0  
**Last Updated**: March 10, 2026  
**Maintained By**: Performance Testing Team
