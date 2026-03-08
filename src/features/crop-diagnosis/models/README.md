# Crop Diagnosis MongoDB Models

This directory contains MongoDB schemas and models for the Crop Disease Diagnosis feature.

## Models

### DiagnosisRecord

Stores complete diagnosis records including image metadata, AI analysis results, remedies, and expert reviews.

**Collection**: `crop_diagnoses`

**Key Fields**:
- `userId`: User who submitted the diagnosis
- `imageUrl`: S3 key for the crop image
- `imageMetadata`: Image format, size, and dimensions
- `diagnosis`: AI analysis results (crop type, diseases, symptoms, confidence)
- `remedies`: Chemical, organic, and preventive recommendations
- `location`: Optional GPS coordinates and location data
- `language`: User's preferred language for results
- `expertReview`: Expert review data (if required)
- `feedback`: User feedback on diagnosis accuracy
- `deletedAt`: Soft delete timestamp

**Indexes**:
1. `{ userId: 1, createdAt: -1 }` - User history queries (newest first)
2. `{ 'diagnosis.cropType': 1 }` - Filter by crop type
3. `{ 'expertReview.required': 1, 'expertReview.reviewedAt': 1 }` - Expert review queries
4. `{ createdAt: 1 }` with TTL (2 years) - Automatic cleanup
5. `{ deletedAt: 1 }` - Soft delete queries

**Requirements Satisfied**:
- 7.1: Store diagnosis records with all required fields
- 7.2: Associate records with user accounts
- 7.3: Support 2-year retention with automatic cleanup
- 7.4: Retrieve history sorted by date
- 7.5: Retain records for at least 2 years
- 7.6: View full details of past diagnoses
- 7.7: Support filtering by crop type and date range
- 14.6: Soft delete support

### ExpertReviewRequest

Stores expert review requests for low-confidence diagnoses.

**Collection**: `expert_review_requests`

**Key Fields**:
- `diagnosisId`: Reference to the DiagnosisRecord
- `userId`: User who submitted the original diagnosis
- `imageUrl`: S3 key for the crop image
- `aiDiagnosis`: Original AI diagnosis results
- `aiRemedies`: Original AI remedy recommendations
- `status`: Review status (pending, in_progress, completed)
- `assignedTo`: Expert assigned to review
- `expertDiagnosis`: Expert's diagnosis
- `expertRemedies`: Expert's remedy recommendations
- `expertNotes`: Additional expert notes
- `reviewDurationMinutes`: Time taken for review
- `completedAt`: Review completion timestamp

**Indexes**:
1. `{ diagnosisId: 1 }` - Link to diagnosis record
2. `{ userId: 1 }` - User's review requests
3. `{ status: 1 }` - Filter by status
4. `{ assignedTo: 1 }` - Expert's assigned reviews
5. `{ status: 1, createdAt: 1 }` - SLA monitoring

**Requirements Satisfied**:
- 10.1: Create expert review requests for low confidence
- 10.3: Provide experts with AI analysis and confidence scores

## Usage

```typescript
import { 
  DiagnosisRecordModel, 
  ExpertReviewRequestModel 
} from './models';

// Create a diagnosis record
const diagnosis = await DiagnosisRecordModel.create({
  userId: 'user123',
  imageUrl: 'diagnoses/user123/diag456/image.jpg',
  imageMetadata: {
    format: 'jpeg',
    sizeBytes: 2048576,
    dimensions: { width: 1920, height: 1080 }
  },
  diagnosis: {
    cropType: 'tomato',
    diseases: [{
      name: 'Late Blight',
      scientificName: 'Phytophthora infestans',
      type: 'fungal',
      severity: 'high',
      confidence: 85,
      affectedParts: ['leaves', 'stem']
    }],
    symptoms: ['Brown spots on leaves', 'Wilting'],
    confidence: 85
  },
  remedies: {
    chemical: [...],
    organic: [...],
    preventive: [...]
  },
  language: 'en'
});

// Query user history
const history = await DiagnosisRecordModel
  .find({ userId: 'user123', deletedAt: { $exists: false } })
  .sort({ createdAt: -1 })
  .limit(20);

// Create expert review request
const reviewRequest = await ExpertReviewRequestModel.create({
  diagnosisId: diagnosis._id,
  userId: 'user123',
  imageUrl: diagnosis.imageUrl,
  aiDiagnosis: {
    cropType: diagnosis.diagnosis.cropType,
    diseases: diagnosis.diagnosis.diseases,
    confidence: diagnosis.diagnosis.confidence
  },
  aiRemedies: diagnosis.remedies,
  status: 'pending'
});
```

## TTL Index

The `createdAt` field has a TTL (Time To Live) index set to 2 years (63,072,000 seconds). MongoDB will automatically delete documents 2 years after creation, but only if `deletedAt` does not exist (soft-deleted records are excluded from TTL).

## Soft Delete

Records are soft-deleted by setting the `deletedAt` timestamp. Queries should filter out soft-deleted records:

```typescript
// Exclude soft-deleted records
const activeDiagnoses = await DiagnosisRecordModel.find({
  userId: 'user123',
  deletedAt: { $exists: false }
});

// Find soft-deleted records
const deletedDiagnoses = await DiagnosisRecordModel.find({
  userId: 'user123',
  deletedAt: { $exists: true }
});
```

## Testing

Run schema tests:

```bash
npm test -- src/features/crop-diagnosis/models/__tests__/diagnosis.schema.test.ts
```

## Notes

- All confidence scores are stored as integers between 0-100
- Language codes follow ISO 639-1 standard
- Image formats are limited to JPEG, PNG, and WebP
- Disease types include: fungal, bacterial, viral, pest, nutrient_deficiency
- Severity levels: low, medium, high
- Preventive measure categories: crop_rotation, irrigation, spacing, soil_health, timing
