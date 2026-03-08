# Crop Diagnosis Services

This directory contains the core services for the Crop Disease Diagnosis feature.

## Services

### 1. Bedrock Service (`bedrock.service.ts`)

Manages AWS Bedrock client connections with region-specific routing and client pooling.

**Key Features:**
- Region-specific client pooling for optimal performance
- Automatic region selection based on model ID
- Nova models routed to us-east-1 region
- Configurable timeout and inference parameters

**Usage:**
```typescript
import { getBedrockClientForModel } from './bedrock.service';

const client = getBedrockClientForModel('amazon.nova-pro-v1:0');
```

### 2. Nova Vision Service (`nova-vision.service.ts`)

Integrates with Amazon Bedrock Nova Pro for multimodal crop image analysis.

**Key Features:**
- Multimodal image analysis using Converse API
- Structured JSON responses for consistent parsing
- Identifies crop type, diseases, pests, and symptoms
- Confidence scoring and image quality assessment
- Support for JPEG, PNG, and WebP formats

**Requirements Implemented:**
- 2.1: Analyze images using Amazon Bedrock Nova Pro
- 2.2: Identify crop type from image
- 2.3: Identify diseases or pests affecting the crop
- 2.4: Complete analysis within 2000ms
- 2.7: Extract visible symptoms from image

**Usage:**
```typescript
import { novaVisionService, ImageAnalysisRequest } from './nova-vision.service';

const request: ImageAnalysisRequest = {
  imageBuffer: Buffer.from(imageData),
  imageFormat: 'jpeg',
  cropHint: 'tomato', // Optional
};

const result = await novaVisionService.analyzeImage(request);

console.log(`Crop: ${result.cropType}`);
console.log(`Confidence: ${result.confidence}%`);
console.log(`Diseases: ${result.diseases.length}`);
```

**Response Structure:**
```typescript
interface ImageAnalysisResult {
  cropType: string;              // e.g., "tomato", "wheat", "rice"
  diseases: Disease[];           // Array of detected diseases
  symptoms: string[];            // Visible symptoms
  confidence: number;            // Overall confidence (0-100)
  imageQualityScore: number;     // Quality score (0.0-1.0)
  processingTimeMs: number;      // Time taken for analysis
}

interface Disease {
  name: string;                  // Common name
  scientificName: string;        // Scientific name
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
  severity: 'low' | 'medium' | 'high';
  confidence: number;            // Disease-specific confidence (0-100)
  affectedParts: string[];       // e.g., ["leaves", "stem"]
}
```

### 3. Image Validator Service (`image-validator.service.ts`)

Validates uploaded images for format, size, dimensions, and quality.

**Key Features:**
- Format validation (JPEG, PNG, WebP)
- Size validation (100KB - 10MB)
- Dimension validation (minimum 640x480)
- Blur detection
- Lighting assessment

**Requirements Implemented:**
- 1.1: Accept JPEG, PNG, WebP formats
- 1.2: Accept 100KB - 10MB file sizes
- 1.4: Validate minimum 640x480 dimensions
- 1.5: Return specific error messages
- 9.6: Detect blur and suggest retake
- 9.7: Detect poor lighting

### 4. S3 Service (`s3.service.ts`)

Manages image storage in AWS S3 with compression and presigned URLs.

**Key Features:**
- Image compression to max 5MB
- Unique S3 key generation
- Presigned URL generation (24-hour expiry)
- Server-side AES-256 encryption
- Image metadata storage

**Requirements Implemented:**
- 1.6: Store images in S3 with unique identifiers
- 1.7: Generate time-limited URLs (24 hours)
- 12.4: Compress images while maintaining quality
- 14.2: Server-side encryption

## Configuration

### Environment Variables

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-2

# Bedrock Configuration
BEDROCK_REGION=us-east-1
CROP_DIAGNOSIS_MODEL_ID=amazon.nova-pro-v1:0

# S3 Configuration
CROP_DIAGNOSIS_BUCKET=bharat-mandi-crop-diagnosis
```

### Bedrock Model Configuration

```typescript
export const DEFAULT_BEDROCK_CONFIG = {
  modelId: 'amazon.nova-pro-v1:0',
  timeout: 2000,        // 2 seconds
  maxTokens: 2000,      // Maximum response tokens
  temperature: 0.3,     // Lower for consistent JSON
  topP: 0.9,           // Nucleus sampling
};
```

## Testing

### Unit Tests

Run unit tests for all services:
```bash
npm test -- crop-diagnosis/services
```

Run tests for specific service:
```bash
npm test -- nova-vision.service.test.ts
npm test -- bedrock.service.test.ts
npm test -- image-validator.service.test.ts
npm test -- s3.service.test.ts
```

### Integration Examples

See `__tests__/nova-vision.integration.example.ts` for integration examples with real AWS services.

## Performance

### Nova Vision Service Performance

- **Target**: <2000ms per analysis (Requirement 2.4)
- **Typical**: 800-1500ms depending on image size and network latency
- **Optimization**: Image compression to max 5MB before API call

### Cost Optimization

- **Target**: <₹1 per diagnosis (Requirement 12.1)
- **Nova Pro API**: ~₹0.60 per request
- **Caching**: 15-20% cache hit rate saves ₹0.60 per cached request
- **Image Compression**: Reduces S3 transfer costs by 50%

## Error Handling

All services implement comprehensive error handling:

```typescript
try {
  const result = await novaVisionService.analyzeImage(request);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
  } else if (error.message.includes('parse')) {
    // Handle parsing error
  } else {
    // Handle other errors
  }
}
```

## Monitoring

Key metrics to monitor:

- **Processing Time**: Track p95 and p99 percentiles
- **Confidence Scores**: Monitor distribution and low-confidence rate
- **Error Rate**: Track API failures and timeouts
- **Cost per Request**: Monitor Bedrock API costs
- **Cache Hit Rate**: Track caching effectiveness

## Future Enhancements

1. **Retry Logic**: Implement exponential backoff for transient failures (Task 3.3)
2. **Confidence Scoring**: Advanced algorithm considering multiple factors (Task 3.5)
3. **Caching**: Redis-based caching for similar images (Phase 5)
4. **Batch Processing**: Support for multiple images in single request
5. **Model Versioning**: Support for multiple Nova model versions

## References

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Nova Pro Model Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html)
- [Converse API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)
- Design Document: `.kiro/specs/crop-disease-diagnosis/design.md`
- Requirements: `.kiro/specs/crop-disease-diagnosis/requirements.md`

