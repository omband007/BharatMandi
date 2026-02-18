---
parent_spec: bharat-mandi-main
implements_requirements: [1]
depends_on: [shared/database]
status: in-progress
type: feature
code_location: src/features/grading/
---

# Tasks: AI-Powered Produce Grading

**Status:** 🚧 Partial Implementation

## Completed Tasks

- [x] 1. AI Vision Service
  - [x] 1.1 Integrate Hugging Face ViT model
  - [x] 1.2 Implement image analysis
  - [x] 1.3 Implement crop detection
  - [x] 1.4 Support 10+ crop types

- [x] 2. Color-Based Fallback
  - [x] 2.1 Implement color analysis with Sharp
  - [x] 2.2 Calculate color uniformity
  - [x] 2.3 Calculate brightness
  - [x] 2.4 Calculate saturation

- [x] 3. Quality Evaluation
  - [x] 3.1 Implement scoring algorithm
  - [x] 3.2 Apply weights (30%, 30%, 40%)
  - [x] 3.3 Assign grades (A/B/C)
  - [x] 3.4 Calculate confidence scores

- [x] 4. Digital Certificate Generation
  - [x] 4.1 Generate unique certificate IDs
  - [x] 4.2 Calculate SHA-256 image hash
  - [x] 4.3 Include all required fields
  - [x] 4.4 Store certificates

- [x] 5. API Endpoints
  - [x] 5.1 POST /api/grading/grade-with-image
  - [x] 5.2 POST /api/grading/grade
  - [x] 5.3 Image validation
  - [x] 5.4 Error handling

## Pending Tasks

- [ ] 6. Database Migration
  - [ ] 6.1 Replace memory-db with DatabaseManager
  - [ ] 6.2 Create certificate table in PostgreSQL
  - [ ] 6.3 Create certificate cache in SQLite
  - [ ] 6.4 Update grading service to use DatabaseManager
  - [ ] 6.5 Add certificate sync to SyncEngine

- [ ] 7. Offline AI Models
  - [ ] 7.1 Download TensorFlow Lite models
  - [ ] 7.2 Implement local inference
  - [ ] 7.3 Add model update mechanism
  - [ ] 7.4 Test offline grading accuracy

- [ ] 8. Enhanced Testing
  - [ ] 8.1 Write comprehensive unit tests
  - [ ] 8.2 Write property-based tests
    - Grade consistency for same image
    - Certificate uniqueness
    - Quality score bounds
  - [ ] 8.3 Write integration tests
  - [ ] 8.4 Test offline fallback

- [ ] 9. Defect Detection
  - [ ] 9.1 Train defect detection model
  - [ ] 9.2 Implement defect analysis
  - [ ] 9.3 Include defects in grading
  - [ ] 9.4 Update certificate with defect info

- [ ] 10. Additional Features
  - [ ] 10.1 Size and shape analysis
  - [ ] 10.2 Ripeness detection
  - [ ] 10.3 Shelf life prediction
  - [ ] 10.4 Batch grading support

## Priority Tasks

### High Priority
1. **Database Migration (Task 6)** - Critical for persistence
2. **Enhanced Testing (Task 8)** - Ensure reliability
3. **Offline AI Models (Task 7)** - Enable true offline support

### Medium Priority
4. **Defect Detection (Task 9)** - Improve grading accuracy
5. **Additional Features (Task 10)** - Enhance value proposition

## Implementation Notes

### Current Limitations
- Uses memory-db (data lost on restart)
- No offline AI models (relies on color fallback)
- Limited testing coverage
- No defect detection
- Only 10 crop types supported

### Next Steps
1. Start with Task 6 (Database Migration)
2. Add comprehensive testing (Task 8)
3. Implement offline AI models (Task 7)
4. Enhance with defect detection (Task 9)

## Related Specs

- [Requirements](./requirements.md) - Detailed requirements
- [Design](./design.md) - Technical design
- [Database Spec](../../shared/database/) - Database integration
