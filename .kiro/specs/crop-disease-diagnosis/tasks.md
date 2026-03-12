# Implementation Plan: Crop Disease Diagnosis

## Overview

This implementation plan breaks down the Crop Disease Diagnosis feature into 7 phases over 8 weeks. The feature provides AI-powered disease and pest identification for Indian farmers through image analysis using Amazon Nova Pro, with multilingual support, expert escalation, and comprehensive remedy recommendations.

**Technology Stack**: Node.js/TypeScript, AWS Bedrock Nova Pro, S3, MongoDB, Redis, Express, fast-check

**Key Integration Points**: AWS Bedrock (us-east-1), S3 (ap-southeast-2), MongoDB, existing translation pipeline, Kisan Mitra chat

**Performance Targets**: <3s end-to-end response, <₹1 per diagnosis, >80% confidence threshold

## Tasks

- [ ] 1. Phase 1: Core Infrastructure Setup (Week 1-2)
  - [x] 1.1 Set up AWS S3 bucket for crop diagnosis images
    - Create S3 bucket `bharat-mandi-crop-diagnosis` in ap-southeast-2 region
    - Configure server-side AES-256 encryption
    - Set up lifecycle policy for 2-year retention
    - Configure CORS for web/mobile access
    - Create IAM policies for service access
    - _Requirements: 1.6, 14.2_

  - [x] 1.2 Create MongoDB schema and indexes for diagnosis records
    - Define DiagnosisRecord schema with all required fields (userId, imageUrl, diagnosis, remedies, confidence, timestamps)
    - Create compound indexes: (userId, createdAt), (diagnosis.cropType), (expertReview.required, expertReview.reviewedAt)
    - Add soft delete support with deletedAt field
    - Set up 2-year TTL index for automatic cleanup
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.3 Implement Image Validator service
    - Create ImageValidator class with validateImage(), compressImage(), uploadToS3() methods
    - Implement format validation (JPEG, PNG, WebP only)
    - Implement size validation (100KB - 10MB)
    - Implement dimension validation (minimum 640x480)
    - Add blur detection using sharp library
    - Add lighting/brightness assessment
    - Return detailed ValidationResult with errors and warnings
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 9.6, 9.7_

  - [ ]* 1.4 Write property tests for Image Validator
    - **Property 1: Image Format Validation** - Accept only JPEG, PNG, WebP
    - **Property 2: Image Size Validation** - Accept 100KB-10MB range
    - **Property 3: Image Dimension Validation** - Accept minimum 640x480
    - **Property 4: Validation Error Specificity** - Return specific error messages
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**


  - [x] 1.5 Implement S3 image upload and storage service
    - Create S3Service class with uploadImage(), generatePresignedUrl(), deleteImage() methods
    - Implement image compression to max 5MB using sharp (maintain quality)
    - Generate unique S3 keys: `diagnoses/{userId}/{diagnosisId}/{timestamp}.jpg`
    - Store image metadata in S3 object metadata
    - Implement presigned URL generation with 24-hour expiry
    - _Requirements: 1.6, 1.7, 12.4_

  - [ ]* 1.6 Write property tests for S3 service
    - **Property 5: Unique Image Identifiers** - Each image has unique S3 key
    - **Property 6: Presigned URL Expiry** - URLs valid for 24 hours
    - **Property 46: Image Compression** - Images compressed to ≤5MB
    - **Validates: Requirements 1.6, 1.7, 12.4**

  - [x] 1.7 Create Diagnosis API controller with authentication
    - Create DiagnosisController with POST /api/diagnosis endpoint
    - Integrate existing JWT authentication middleware
    - Implement multipart/form-data parsing for image uploads
    - Add request validation for required fields
    - Implement rate limiting (10 requests/hour per user)
    - Return consistent error response format
    - _Requirements: 14.3, 14.7_

  - [ ]* 1.8 Write unit tests for API controller
    - Test authentication requirement (401 without JWT)
    - Test rate limiting (reject after 10 requests/hour)
    - Test multipart parsing
    - Test error response formatting
    - _Requirements: 14.3, 14.7_

- [x] 2. Checkpoint - Core infrastructure complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Phase 2: Nova Pro Integration (Week 2-3)
  - [x] 3.1 Set up Bedrock client with region-specific configuration
    - Create BedrockService with region mapping (Nova models → us-east-1)
    - Implement client pooling for reusable BedrockRuntimeClient instances
    - Configure AWS credentials and region selection
    - Add timeout configuration (2000ms)
    - _Requirements: 2.1, 2.4_

  - [x] 3.2 Implement Nova Vision Service for image analysis
    - Create NovaVisionService class with analyzeImage() method
    - Implement Converse API integration with multimodal content (image + text)
    - Design structured prompt for consistent JSON responses
    - Configure inference parameters (maxTokens: 2000, temperature: 0.3, topP: 0.9)
    - Parse Nova Pro response into ImageAnalysisResult structure
    - Extract cropType, diseases array, symptoms, confidence, imageQuality
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [x] 3.3 Implement retry logic with exponential backoff
    - Create retryWithBackoff utility function
    - Configure retry for throttling, network errors, timeouts
    - Implement exponential backoff (500ms base, 5s max, 2x multiplier)
    - Set max 3 attempts for Bedrock calls
    - Log retry attempts with context
    - _Requirements: 2.4, 13.1_

  - [ ]* 3.4 Write property tests for Nova Vision Service
    - **Property 7: Diagnosis Response Completeness** - Response includes cropType, diseases, symptoms
    - **Property 10: Confidence Score Range** - Scores between 0-100
    - **Property 12: Confidence Display Format** - Integer percentage format
    - **Validates: Requirements 2.2, 2.3, 2.7, 3.1, 3.4**

  - [x] 3.5 Implement confidence scoring algorithm
    - Create ConfidenceScorer class with calculateOverallConfidence() method
    - Adjust confidence based on image quality (excellent: 1.0, good: 0.95, fair: 0.85, poor: 0.70)
    - Reduce confidence for multiple diseases (>1: 0.90x, >2: 0.85x)
    - Cap maximum confidence at 95%
    - Implement confidence threshold evaluation (80%)
    - _Requirements: 3.1, 3.2, 3.6_

  - [ ]* 3.6 Write property tests for confidence scoring
    - **Property 11: Confidence Threshold Evaluation** - Flag <80% for expert review
    - **Property 13: Low Confidence Warning** - Include warning message
    - **Property 14: Image Quality Impact** - Lower quality = lower confidence
    - **Validates: Requirements 3.2, 3.3, 3.5, 3.6**

  - [x] 3.7 Implement error handling for Bedrock API
    - Define DiagnosisErrorCode enum with all error types
    - Create error response format with code, message, details, retryable flag
    - Handle throttling, timeout, network errors
    - Handle business logic errors (no crop detected, multiple crops, low confidence)
    - Return user-friendly error messages
    - _Requirements: 1.5, 2.4_

  - [ ]* 3.8 Write unit tests for error handling
    - Test throttling error handling
    - Test timeout error handling
    - Test no crop detected scenario
    - Test low confidence scenario
    - Test error response format
    - _Requirements: 1.5, 2.4_

- [x] 4. Checkpoint - Nova Pro integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Phase 3: Remedy Generation (Week 3-4)
  - [x] 5.1 Create disease-remedy knowledge base
    - Design JSON structure for disease-remedy mappings
    - Include chemical remedies (genericName, brandNames, dosage, applicationMethod, frequency, preHarvestInterval, safetyPrecautions)
    - Include organic remedies (name, ingredients, preparation, applicationMethod, frequency, effectiveness)
    - Include preventive measures (category, description, timing, frequency)
    - Populate with at least 20 common Indian crop diseases
    - Organize by disease type (fungal, bacterial, viral, pest, nutrient_deficiency)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1_

  - [x] 5.2 Implement Remedy Generator service
    - Create RemedyGenerator class with generateRemedies() method
    - Load knowledge base from JSON files
    - Match diseases to remedies based on disease name and crop type
    - Return chemical, organic, and preventive recommendations
    - Include cost estimates for chemical and organic options
    - _Requirements: 4.1, 4.8, 5.1, 6.1_

  - [ ]* 5.3 Write property tests for Remedy Generator
    - **Property 15: Chemical Remedy Presence** - At least one chemical remedy with all fields
    - **Property 17: Organic Remedy Presence** - At least one organic remedy with all fields
    - **Property 19: Preventive Measures Count** - At least 3 preventive measures
    - **Property 20: Preventive Measure Categories** - At least 2 different categories
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2**

  - [x] 5.4 Implement regional customization logic
    - Add region-specific remedy filtering based on location.state
    - Include regional product availability
    - Add seasonal guidance based on current date
    - Customize recommendations for crop growth stage
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 5.5 Write property tests for regional customization
    - **Property 39: Regional Remedy Variation** - Different states get different recommendations
    - **Property 40: Seasonal Remedy Variation** - Seasonal diseases include timing guidance
    - **Property 41: Growth Stage Customization** - Recommendations tailored to growth stage
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

  - [x] 5.6 Integrate translation pipeline for remedies
    - Import existing translationService from i18n module
    - Implement batch translation for efficiency
    - Translate disease names, remedy instructions, preventive measures
    - Preserve numeric dosage values during translation
    - Cache translated content for 24 hours
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 5.7 Write property tests for translation
    - **Property 27: Translation Completeness** - All text fields translated
    - **Property 28: Dosage Preservation** - Numeric values unchanged
    - **Property 29: Language Switching** - New requests use new language
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5**

- [x] 6. Checkpoint - Remedy generation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Phase 4: Expert Escalation (Week 4-5)
  - [x] 7.1 Create Expert Review Request schema
    - Define ExpertReviewRequest schema in MongoDB
    - Include fields: diagnosisId, userId, imageUrl, aiDiagnosis, aiRemedies, status, assignedTo, timestamps
    - Create indexes: (status, createdAt), (assignedTo, status)
    - _Requirements: 10.1, 10.3_

  - [x] 7.2 Implement Expert Escalation Service
    - Create ExpertEscalationService class with createReviewRequest() method
    - Automatically create review request when confidence <80%
    - Set status to 'pending' on creation
    - Store AI diagnosis and remedies for expert reference
    - _Requirements: 10.1, 10.3_

  - [ ]* 7.3 Write property tests for expert escalation
    - **Property 33: Expert Review Request Creation** - Created when confidence <80%
    - **Property 35: Review Request Completeness** - Contains all required fields
    - **Validates: Requirements 10.1, 10.3**

  - [x] 7.4 Implement expert notification system
    - Create notification service for multi-channel alerts (SMS, email, push)
    - Send notifications to available experts when review request created
    - Implement expert assignment logic (round-robin or availability-based)
    - Track notification delivery status
    - _Requirements: 10.2_

  - [ ]* 7.5 Write property tests for notifications
    - **Property 34: Expert Notification** - At least one notification sent
    - **Validates: Requirements 10.2**

  - [x] 7.6 Implement expert review submission
    - Create submitReview() method in ExpertEscalationService
    - Allow experts to modify diagnosis, remedies, or both
    - Update DiagnosisRecord with expert review data
    - Set expertReview.reviewedAt timestamp
    - Change review request status to 'completed'
    - _Requirements: 10.5, 10.6_

  - [ ]* 7.7 Write property tests for expert review
    - **Property 37: Expert Review Capabilities** - Can modify diagnosis and remedies
    - **Property 38: Expert Review Badge** - reviewedAt field populated
    - **Validates: Requirements 10.5, 10.6**

  - [x] 7.8 Implement farmer notification on review completion
    - Send notification to farmer when expert completes review
    - Include summary of expert findings
    - Provide link to view updated diagnosis
    - _Requirements: 10.4_

  - [ ]* 7.9 Write property tests for farmer notifications
    - **Property 36: Farmer Notification on Review** - Notification sent when completed
    - **Validates: Requirements 10.4**

- [x] 8. Checkpoint - Expert escalation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Phase 5: History & Caching (Week 5-6)
  - [x] 9.1 Implement Diagnosis History Manager
    - Create HistoryManager class with saveDiagnosis(), getDiagnosis(), getUserHistory() methods
    - Implement saveDiagnosis() to store complete diagnosis record in MongoDB
    - Implement getDiagnosis() to retrieve by diagnosisId
    - Implement getUserHistory() with filtering (cropType, date range) and pagination
    - Sort history by createdAt descending (newest first)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_

  - [ ]* 9.2 Write property tests for History Manager
    - **Property 21: Diagnosis Record Creation** - Record exists in MongoDB
    - **Property 22: Diagnosis Record Completeness** - All required fields present
    - **Property 23: User Association** - userId matches authenticated user
    - **Property 24: History Chronological Ordering** - Sorted by createdAt desc
    - **Property 25: History Retrieval by ID** - getDiagnosis returns complete record
    - **Property 26: History Filtering** - Filters work correctly
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6, 7.7**

  - [x] 9.3 Implement diagnosis deletion with soft delete
    - Create deleteDiagnosis() method in HistoryManager
    - Implement soft delete by setting deletedAt timestamp
    - Schedule S3 image deletion within 24 hours
    - Verify user owns the diagnosis before deletion
    - _Requirements: 14.5, 14.6_

  - [ ]* 9.4 Write property tests for deletion
    - **Property 54: Diagnosis Deletion Completeness** - Both MongoDB and S3 marked for deletion
    - **Validates: Requirements 14.5, 14.6**

  - [x] 9.5 Set up Redis caching layer
    - Install and configure Redis client
    - Create CacheService class with get(), set(), delete() methods
    - Implement 24-hour TTL for cached diagnoses
    - Track cache hit count for metrics
    - _Requirements: 12.3_

  - [x] 9.6 Implement image hashing for cache keys
    - Create generateImageHash() function using SHA-256
    - Use first 16 characters of hash as cache key
    - Implement getCachedDiagnosis() and cacheDiagnosis() methods
    - Check cache before calling Bedrock API
    - _Requirements: 12.3_

  - [ ]* 9.7 Write property tests for caching
    - **Property 45: Cache Hit for Similar Images** - Identical images return cached results
    - **Validates: Requirements 12.3**

  - [x] 9.8 Implement history API endpoints
    - Create GET /api/diagnosis/history endpoint with pagination
    - Create GET /api/diagnosis/:id endpoint for single diagnosis
    - Create DELETE /api/diagnosis/:id endpoint for deletion
    - Create POST /api/diagnosis/:id/feedback endpoint for farmer feedback
    - Add authentication and authorization checks
    - _Requirements: 7.4, 7.6, 14.5_

  - [ ]* 9.9 Write unit tests for history endpoints
    - Test pagination logic
    - Test filtering by crop type and date range
    - Test authorization (users can only access own diagnoses)
    - Test deletion authorization
    - _Requirements: 7.4, 7.6, 7.7, 14.5_

- [ ] 10. Checkpoint - History and caching complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Phase 6: Integration & Testing (Week 6-7)
  - [x] 11.1 Integrate with Kisan Mitra chat service
    - Import existing kisanMitraService
    - Implement addContext() to share diagnosis context with chat
    - Pass diagnosisId, cropType, diseases, confidence to chat
    - Enable seamless transition from diagnosis to chat
    - Maintain consistent language settings
    - _Requirements: 15.1, 15.2, 15.3, 15.6_

  - [ ]* 11.2 Write property tests for Kisan Mitra integration
    - **Property 56: Chat Context Sharing** - Context available to chat service
    - **Property 58: Language Consistency** - Same language in diagnosis and chat
    - **Validates: Requirements 15.2, 15.3, 15.6**

  - [x] 11.3 Implement end-to-end diagnosis flow
    - Wire all components together: Controller → Validator → S3 → Nova → Remedies → History
    - Implement main diagnose() method in DiagnosisService
    - Handle all error cases with appropriate responses
    - Log each stage with timing metrics
    - Return complete DiagnosisResponse
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 5.1, 6.1, 7.1_

  - [ ]* 11.4 Write integration tests for end-to-end flow
    - Test complete flow from image upload to diagnosis response
    - Test low confidence flow with expert escalation
    - Test caching flow (second identical image)
    - Test error scenarios (invalid image, Bedrock failure, etc.)
    - _Requirements: All core requirements_

  - [ ]* 11.5 Implement offline queue for network resilience (FUTURE)
    - Create upload queue for failed requests
    - Store images locally until upload succeeds
    - Implement automatic retry on connectivity restoration
    - Display upload status indicators
    - Notify farmer after 3 failed attempts
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
    - **NOTE: Marked for future implementation per user request**

  - [ ]* 11.6 Write property tests for offline capability (FUTURE)
    - **Property 49: Upload Retry Queue** - Failed uploads queued
    - **Property 50: Automatic Upload Resumption** - Auto-resume on connectivity
    - **Property 51: Retry Limit Notification** - Notify after 3 failures
    - **Validates: Requirements 13.1, 13.3, 13.5**
    - **NOTE: Marked for future implementation per user request**

  - [ ] 11.7 Implement comprehensive error handling
    - Add error handlers for all error categories (client, server, business logic)
    - Return consistent error response format
    - Include retryable flag and retry guidance
    - Log errors with full context
    - _Requirements: 1.5, 2.4_

  - [ ]* 11.8 Write unit tests for error handling
    - Test all error codes and messages
    - Test retryable vs non-retryable errors
    - Test error response format consistency
    - _Requirements: 1.5, 2.4_

- [ ] 12. Checkpoint - Integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Phase 7: Optimization & Launch (Week 7-8)
  - [ ] 13.1 Implement cost tracking and monitoring
    - Create cost calculation for each diagnosis (Bedrock + S3 + MongoDB + Translation)
    - Log cost metrics to CloudWatch
    - Set up alerts for costs exceeding ₹1 threshold
    - Track cache hit rate and cost savings
    - _Requirements: 12.1, 12.5_

  - [ ]* 13.2 Write property tests for cost optimization
    - **Property 43: Cost Threshold** - Total cost ≤₹1.00
    - **Property 47: Cost Alert Trigger** - Alert logged when exceeding ₹1
    - **Validates: Requirements 12.1, 12.5**

  - [ ] 13.3 Optimize token usage for Bedrock API
    - Refine prompts to minimize response tokens
    - Use structured output format (JSON)
    - Remove unnecessary verbose instructions
    - Test token usage across various scenarios
    - _Requirements: 12.2_

  - [ ]* 13.4 Write property tests for token optimization
    - **Property 44: Token Optimization** - Prompts minimize response tokens
    - **Validates: Requirements 12.2**

  - [ ] 13.5 Implement performance monitoring
    - Track end-to-end response time for each diagnosis
    - Calculate p95 and p99 percentiles
    - Monitor each stage: upload, validation, analysis, remedy, storage
    - Set up alerts for response times >3000ms
    - _Requirements: 12.6_

  - [ ]* 13.6 Write property tests for performance
    - **Property 8: Analysis Performance** - Nova Pro completes in <2000ms
    - **Property 48: End-to-End Performance** - Total time ≤3000ms at p95
    - **Validates: Requirements 2.4, 12.6**

  - [ ] 13.7 Implement security measures
    - Verify TLS 1.3 encryption for all API calls
    - Verify S3 server-side encryption enabled
    - Implement rate limiting enforcement
    - Add authentication checks on all endpoints
    - _Requirements: 14.1, 14.2, 14.3, 14.7_

  - [ ]* 13.8 Write property tests for security
    - **Property 52: S3 Encryption** - All objects have AES-256 encryption
    - **Property 53: Authentication Requirement** - Reject requests without JWT
    - **Property 55: Rate Limiting** - Reject after 10 requests/hour
    - **Validates: Requirements 14.2, 14.3, 14.7**

  - [ ] 13.9 Create deployment configuration
    - Set up environment variables for production
    - Configure AWS credentials and regions
    - Set up MongoDB connection strings
    - Configure Redis connection
    - Set up CloudWatch logging and metrics
    - _Requirements: All_

  - [ ] 13.10 Write deployment documentation
    - Document environment setup steps
    - Document AWS resource requirements
    - Document MongoDB schema setup
    - Document API endpoints and authentication
    - Document monitoring and alerting setup
    - _Requirements: All_

  - [ ] 13.11 Conduct load testing
    - Simulate 100 concurrent diagnosis requests
    - Measure response times under load
    - Verify system stability
    - Identify bottlenecks and optimize
    - _Requirements: 12.6_

  - [ ]* 13.12 Write performance tests
    - Test concurrent request handling
    - Test cache effectiveness under load
    - Test database query performance
    - _Requirements: 12.6_

- [ ] 14. Final checkpoint - Production ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests use fast-check library with minimum 100 iterations
- All property tests are tagged with format: `Feature: crop-disease-diagnosis, Property {number}: {property_text}`
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Implementation uses TypeScript throughout for type safety
- All AWS services use existing infrastructure patterns from Bharat Mandi platform
- Translation integration reuses existing i18next-based translation service
- Authentication uses existing JWT middleware
- Cost optimization is critical: target <₹1 per diagnosis through caching, compression, and token optimization

## Testing Strategy

### Property-Based Testing
- Library: fast-check (JavaScript/TypeScript)
- Minimum 100 iterations per property test
- Each test validates universal properties across randomized inputs
- Tests complement unit tests by verifying general correctness

### Unit Testing
- Framework: Jest
- Coverage target: >80%
- Focus on specific examples, edge cases, and error conditions

### Integration Testing
- Test end-to-end flows with real AWS services (mocked in CI)
- Verify component interactions
- Test error propagation and recovery

## Implementation Dependencies

### External Services
- AWS Bedrock Nova Pro (us-east-1) - Requires model access approval
- AWS S3 (ap-southeast-2) - Bucket creation and IAM policies
- MongoDB - Database and collection setup
- Redis - Caching layer
- Existing translation service - i18next integration
- Existing Kisan Mitra chat - Context sharing integration

### Development Tools
- Node.js 18+
- TypeScript 5+
- Express.js
- AWS SDK v3
- Mongoose
- Redis client
- Sharp (image processing)
- fast-check (property testing)
- Jest (unit testing)

## Success Criteria

- All core functionality implemented and tested
- Performance targets met: <3s response time, <₹1 per diagnosis
- Security requirements satisfied: TLS 1.3, S3 encryption, authentication, rate limiting
- Integration with Kisan Mitra working seamlessly
- Expert escalation workflow functional
- Multilingual support for 11 Indian languages
- Property-based tests passing for all 58 correctness properties
- Unit test coverage >80%
- Load testing successful with 100 concurrent users
- Production deployment documentation complete
