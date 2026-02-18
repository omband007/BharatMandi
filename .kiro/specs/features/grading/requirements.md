---
parent_spec: bharat-mandi-main
implements_requirements: [1]
depends_on: [shared/database]
status: in-progress
type: feature
code_location: src/features/grading/
---

# Requirements Document: AI-Powered Produce Grading

**Parent Spec:** [Bharat Mandi Main](../../bharat-mandi-main/requirements.md) - Requirement 1  
**Depends On:** [Dual Database](../../shared/database/requirements.md)  
**Code Location:** `src/features/grading/`  
**Status:** 🚧 Partial Implementation

## Introduction

This document specifies the requirements for the Fasal-Parakh (AI-Powered Produce Grading) feature. The system analyzes produce photos using AI to detect crop type, evaluate quality, and generate Digital Quality Certificates.

## Requirements

### Requirement 1: AI Image Analysis

**User Story:** As a farmer, I want to take a photo of my produce and get instant quality analysis, so that I can prove quality to buyers.

#### Acceptance Criteria

1. WHEN a farmer uploads a produce photo, THE System SHALL analyze it within 5 seconds
2. WHEN analyzing images, THE System SHALL use AI vision models (Hugging Face ViT)
3. WHEN AI is unavailable, THE System SHALL fall back to color-based analysis
4. THE System SHALL detect crop type from the image
5. THE System SHALL support 10+ crop types (wheat, rice, tomato, potato, onion, corn, apple, banana, carrot, cabbage)

### Requirement 2: Quality Evaluation

**User Story:** As a farmer, I want my produce graded objectively, so that buyers trust the quality assessment.

#### Acceptance Criteria

1. WHEN evaluating quality, THE System SHALL analyze color uniformity (30% weight)
2. WHEN evaluating quality, THE System SHALL analyze brightness (30% weight)
3. WHEN evaluating quality, THE System SHALL analyze saturation (40% weight)
4. WHEN quality score ≥80%, THE System SHALL assign grade A
5. WHEN quality score ≥60% and <80%, THE System SHALL assign grade B
6. WHEN quality score <60%, THE System SHALL assign grade C
7. THE System SHALL return a confidence score with each grade

### Requirement 3: Digital Quality Certificate Generation

**User Story:** As a farmer, I want a digital certificate for my graded produce, so that I can attach it to marketplace listings.

#### Acceptance Criteria

1. WHEN grading completes, THE System SHALL generate a Digital Quality Certificate
2. THE Certificate SHALL include: certificate ID, farmer ID, produce type, grade, timestamp, GPS coordinates, image hash
3. THE System SHALL use SHA-256 to hash the produce image
4. THE System SHALL store certificates in the database
5. THE Certificate SHALL be tamper-proof (image hash verification)

### Requirement 4: Offline Grading Support

**User Story:** As a farmer in a rural area, I want to grade produce offline, so that poor connectivity doesn't prevent me from using the feature.

#### Acceptance Criteria

1. WHERE internet connectivity is unavailable, THE System SHALL perform grading using local AI models
2. WHERE AI models are unavailable, THE System SHALL use color-based fallback analysis
3. WHEN offline grading completes, THE System SHALL queue certificate for sync
4. WHEN connectivity restores, THE System SHALL sync certificates to cloud

### Requirement 5: API Endpoints

**User Story:** As a developer, I want RESTful API endpoints for grading, so that I can integrate with the mobile app.

#### Acceptance Criteria

1. THE System SHALL provide POST /api/grading/grade-with-image endpoint (multipart/form-data)
2. THE System SHALL provide POST /api/grading/grade endpoint (base64 image)
3. THE System SHALL accept parameters: image, farmerId, lat, lng, autoDetect
4. THE System SHALL return: grade, confidence, detected crop, certificate
5. THE System SHALL validate image format (JPEG, PNG)
6. THE System SHALL validate image size (≤5MB)

## Implementation Status

🚧 **Partial Implementation**
- ✅ AI vision service with Hugging Face integration
- ✅ Color-based fallback for offline
- ✅ Quality evaluation algorithm
- ✅ Digital certificate generation
- ✅ API endpoints
- ❌ Database persistence (uses memory-db)
- ❌ Offline AI models
- ❌ Certificate sync with dual database
- ❌ Comprehensive testing

## Related Files

- `src/features/grading/grading.service.ts` - Grading business logic
- `src/features/grading/grading.controller.ts` - API endpoints
- `src/features/grading/grading.types.ts` - TypeScript interfaces
- `src/features/grading/ai/ai-vision.service.ts` - AI vision integration
- `src/features/grading/grading.service.test.ts` - Unit tests

## Next Steps

1. Migrate from memory-db to DatabaseManager
2. Add certificate persistence to dual database
3. Implement offline AI model support
4. Add comprehensive testing
5. Implement defect detection
6. Expand crop type support
