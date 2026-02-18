---
parent_spec: bharat-mandi-main
implements_requirements: [1]
depends_on: [shared/database]
status: in-progress
type: feature
code_location: src/features/grading/
---

# Design Document: AI-Powered Produce Grading

**Parent Spec:** [Bharat Mandi Main Design](../../bharat-mandi-main/design.md)  
**Related Requirements:** [Grading Requirements](./requirements.md)  
**Depends On:** [Dual Database Design](../../shared/database/design.md)  
**Code Location:** `src/features/grading/`  
**Status:** 🚧 Partial Implementation

## Overview

The Fasal-Parakh grading system uses AI vision models to analyze produce photos, detect crop types, evaluate quality, and generate tamper-proof Digital Quality Certificates.

## Architecture

```
┌─────────────────────────────────────────┐
│      Grading Controller                  │
│  POST /api/grading/grade-with-image     │
│  POST /api/grading/grade                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Grading Service                     │
│  - gradeProduceImage()                  │
│  - generateCertificate()                │
└──────────────┬──────────────────────────┘
               │
               ├──────────────┐
               ▼              ▼
┌──────────────────┐  ┌──────────────────┐
│  AI Vision       │  │  Database        │
│  Service         │  │  Manager         │
│  - analyzeImage()│  │  - saveCert()    │
│  - detectCrop()  │  │                  │
│  - evaluateQual()│  │                  │
└──────────────────┘  └──────────────────┘
```

## AI Vision Service

### Hugging Face Integration

```typescript
class AIVisionService {
  // Primary: Hugging Face ViT model
  async analyzeImage(imageBuffer: Buffer): Promise<Analysis> {
    try {
      // Call Hugging Face API
      const result = await this.callHuggingFace(imageBuffer);
      return this.parseHuggingFaceResult(result);
    } catch (error) {
      // Fallback to color-based analysis
      return this.colorBasedAnalysis(imageBuffer);
    }
  }
  
  // Fallback: Color-based analysis
  private async colorBasedAnalysis(imageBuffer: Buffer): Promise<Analysis> {
    const stats = await sharp(imageBuffer).stats();
    // Analyze color distribution, brightness, saturation
    return this.calculateQualityFromColors(stats);
  }
}
```

### Supported Crops

1. Wheat
2. Rice
3. Tomato
4. Potato
5. Onion
6. Corn
7. Apple
8. Banana
9. Carrot
10. Cabbage

## Quality Evaluation Algorithm

### Scoring Components

```typescript
interface QualityMetrics {
  colorUniformity: number;  // 0-100, weight: 30%
  brightness: number;       // 0-100, weight: 30%
  saturation: number;       // 0-100, weight: 40%
}

function calculateGrade(metrics: QualityMetrics): ProduceGrade {
  const score = 
    (metrics.colorUniformity * 0.30) +
    (metrics.brightness * 0.30) +
    (metrics.saturation * 0.40);
  
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  return 'C';
}
```

### Grade Thresholds

- **Grade A:** ≥80% quality score (Premium)
- **Grade B:** 60-79% quality score (Good)
- **Grade C:** <60% quality score (Fair)

## Digital Quality Certificate

### Certificate Structure

```typescript
interface DigitalQualityCertificate {
  id: string;                    // UUID
  farmerId: string;              // Farmer who created it
  produceType: string;           // Detected or provided crop type
  grade: ProduceGrade;           // A, B, or C
  timestamp: Date;               // When graded
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  imageHash: string;             // SHA-256 hash (first 16 chars)
}
```

### Tamper-Proof Design

1. **Image Hash:** SHA-256 hash of original image
2. **Immutable:** Once created, cannot be modified
3. **Verifiable:** Buyers can verify image matches hash
4. **Timestamped:** Includes creation timestamp
5. **Geotagged:** Includes GPS coordinates

## Data Models

```typescript
interface GradingResult {
  grade: ProduceGrade;
  confidence: number;           // 0-1
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface GradingAnalysis {
  detectedCrop: string;
  details: {
    colorUniformity: number;
    brightness: number;
    saturation: number;
    qualityScore: number;
  };
}
```

## API Design

### POST /api/grading/grade-with-image

**Request (multipart/form-data):**
```
image: File (JPEG/PNG, ≤5MB)
farmerId: string
lat: number
lng: number
autoDetect: boolean (optional, default: true)
```

**Response:**
```json
{
  "success": true,
  "grade": "A",
  "confidence": 0.92,
  "detectedCrop": "Tomato",
  "certificate": {
    "id": "cert-uuid",
    "farmerId": "farmer-id",
    "produceType": "Tomato",
    "grade": "A",
    "timestamp": "2026-02-18T10:30:00Z",
    "location": { "latitude": 30.7333, "longitude": 76.7794 },
    "imageHash": "a1b2c3d4e5f6g7h8"
  },
  "analysis": {
    "colorUniformity": 85,
    "brightness": 78,
    "saturation": 82,
    "qualityScore": 81.5
  }
}
```

### POST /api/grading/grade

**Request (JSON):**
```json
{
  "image": "base64-encoded-image",
  "farmerId": "farmer-id",
  "lat": 30.7333,
  "lng": 76.7794,
  "autoDetect": true
}
```

**Response:** Same as above

## Offline Support

### Offline Grading Flow

1. **Check Connectivity:** Detect if online
2. **Try AI Model:** If online, use Hugging Face
3. **Fallback:** If offline, use color-based analysis
4. **Generate Certificate:** Create certificate locally
5. **Queue Sync:** Add certificate to sync queue
6. **Sync Later:** Upload when connectivity restored

### Local AI Models (Future)

- Download TensorFlow Lite models
- Store in app's local directory
- Use for offline grading
- Update models when online

## Image Processing

### Using Sharp Library

```typescript
import sharp from 'sharp';

// Resize and optimize
const processed = await sharp(imageBuffer)
  .resize(800, 800, { fit: 'inside' })
  .jpeg({ quality: 85 })
  .toBuffer();

// Extract color statistics
const stats = await sharp(imageBuffer).stats();
const { mean, stdev } = stats.channels[0]; // Red channel
```

## Security Considerations

### Image Validation

- Validate MIME type (image/jpeg, image/png)
- Validate file size (≤5MB)
- Sanitize file names
- Scan for malware (future)

### Certificate Integrity

- SHA-256 hash prevents tampering
- Timestamp prevents backdating
- GPS coordinates verify location
- Immutable once created

## Performance Optimizations

### Image Processing

- Resize large images before analysis
- Compress images for storage
- Use WebP format when supported
- Cache processed images

### AI Model Calls

- Batch multiple requests
- Cache results for similar images
- Use CDN for model downloads
- Implement request throttling

## Error Handling

### AI Service Failures

- Fallback to color-based analysis
- Return lower confidence score
- Log errors for monitoring
- Retry with exponential backoff

### Image Processing Errors

- Validate image format
- Handle corrupted images
- Return clear error messages
- Suggest corrective actions

## Testing Strategy

### Unit Tests

- Quality evaluation algorithm
- Certificate generation
- Image hash calculation
- Grade assignment logic

### Integration Tests

- End-to-end grading flow
- AI service integration
- Database persistence
- Offline fallback

### Property-Based Tests

- Grade consistency for same image
- Certificate uniqueness
- Hash collision resistance
- Quality score bounds (0-100)

## Migration Plan

### Current State (Partial)

- ✅ AI vision service working
- ✅ Color-based fallback working
- ✅ Certificate generation working
- ❌ Uses memory-db (not persistent)
- ❌ No offline AI models
- ❌ Limited testing

### Migration Steps

1. **Replace memory-db with DatabaseManager**
   - Add certificate table to PostgreSQL
   - Add certificate cache to SQLite
   - Update grading service to use DatabaseManager

2. **Add Offline AI Models**
   - Download TensorFlow Lite models
   - Implement local inference
   - Add model update mechanism

3. **Enhance Testing**
   - Add comprehensive unit tests
   - Add property-based tests
   - Add integration tests

4. **Add Features**
   - Defect detection
   - More crop types
   - Quality trends over time

## Implementation Files

- `grading.service.ts` - Main grading logic
- `grading.controller.ts` - API endpoints
- `grading.types.ts` - TypeScript interfaces
- `ai/ai-vision.service.ts` - AI integration
- `grading.service.test.ts` - Unit tests
- `index.ts` - Module exports

## Future Enhancements

- Defect detection (spots, bruises, rot)
- Size and shape analysis
- Ripeness detection
- Shelf life prediction
- Quality trends dashboard
- Batch grading (multiple images)
- Video analysis
- 3D scanning integration
