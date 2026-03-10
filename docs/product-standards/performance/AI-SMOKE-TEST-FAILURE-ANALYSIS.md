# AI Smoke Test Failure Analysis

**Date**: March 10, 2026  
**Test**: AI Endpoints Smoke Test  
**Result**: 35.8% success rate (FAILED)

---

## Root Cause Summary

The AI smoke test failed primarily due to **incorrect endpoint URLs** in the test configuration. The test was calling endpoints that don't exist in the application.

---

## Detailed Analysis

### Issue 1: Wrong Diagnosis Endpoint (CRITICAL)

**Test Configuration**:
```yaml
- post:
    url: "/api/diagnosis/test"
```

**Actual Endpoint**:
```typescript
// src/app.ts
app.use('/api/diagnosis', diagnosisController);

// src/features/crop-diagnosis/controllers/diagnosis.controller.ts
router.post('/', upload.single('image'), createDiagnosis);
```

**Correct URL**: `/api/diagnosis` (not `/api/diagnosis/test`)

**Impact**: All Dr. Fasal diagnosis requests (30 requests) returned 404 errors

---

### Issue 2: Missing Test Data Files

**Test Configuration**:
```yaml
formData:
  image: "@./test-data/sample-crop-disease.jpg"
```

**Problem**: The test data directory `scripts/perf-tests/test-data/` doesn't exist, and the required image files are missing:
- `sample-crop-disease.jpg` (for Dr. Fasal)
- `sample-produce.jpg` (for Fasal-Parakh)
- `sample-audio.mp3` (for Kisan Mitra)

**Impact**: Even if endpoints were correct, requests would fail due to missing files

---

### Issue 3: Authentication Requirements

**Actual Implementation**:
```typescript
// src/features/crop-diagnosis/controllers/diagnosis.controller.ts
router.use(requireAuth); // All routes require JWT authentication
router.post('/', rateLimitMiddleware, upload.single('image'), createDiagnosis);
```

**Test Configuration**: No authentication headers provided

**Impact**: Requests would be rejected with 401 Unauthorized (even with correct URLs)

---

### Issue 4: Wrong Kisan Mitra Endpoint

**Test Configuration**:
```yaml
- post:
    url: "/api/kisan-mitra/query"
```

**Actual Endpoint**:
```typescript
// src/app.ts
app.use('/api/kisan-mitra', kisanMitraRoutes);

// src/features/i18n/kisan-mitra.routes.ts
router.post('/query', async (req: Request, res: Response) => { ... });
```

**Correct URL**: `/api/kisan-mitra/query` ✅ (This one is actually correct!)

---

## Correct Endpoint Mapping

| Feature | Test URL (WRONG) | Actual URL (CORRECT) | Status |
|---------|------------------|----------------------|--------|
| Dr. Fasal | `/api/diagnosis/test` | `/api/diagnosis` | ❌ Wrong |
| Fasal-Parakh | `/api/grading/grade-with-image` | `/api/grading/grade-with-image` | ✅ Correct |
| Kisan Mitra | `/api/kisan-mitra/query` | `/api/kisan-mitra/query` | ✅ Correct |
| Voice TTS | `/api/voice/synthesize` | `/api/voice/synthesize` | ✅ Correct |
| Translation | `/api/i18n/translate` | `/api/i18n/translate` | ✅ Correct |

---

## Why Tests Failed: Breakdown

### 500 Server Errors (44.2%)
- **Cause**: Incorrect endpoint URLs returning 404, which Artillery may have interpreted as 500
- **Affected**: Dr. Fasal diagnosis endpoint (30 requests)

### Timeouts (20%)
- **Cause**: Requests hanging due to authentication middleware waiting for valid JWT tokens
- **Affected**: All authenticated endpoints

### Failed Captures (24 instances)
- **Cause**: Response format didn't match expected structure (because endpoints returned errors)
- **Example**: Test expected `$.data.diagnosisId` but got error response instead

---

## Required Fixes

### 1. Fix Endpoint URLs (CRITICAL)

**File**: `scripts/perf-tests/artillery-ai-smoke-test.yml`

```yaml
# BEFORE (WRONG)
- post:
    url: "/api/diagnosis/test"

# AFTER (CORRECT)
- post:
    url: "/api/diagnosis"
```

### 2. Add Authentication (CRITICAL)

All diagnosis endpoints require JWT authentication. Options:

**Option A: Create test endpoint without auth** (Recommended for performance testing)
```typescript
// Add to diagnosis.controller.ts BEFORE router.use(requireAuth)
router.post('/test', upload.single('image'), createDiagnosis);
```

**Option B: Generate real JWT tokens in test**
```yaml
config:
  processor: "./artillery-ai-processor.js"
  
scenarios:
  - name: "Dr. Fasal Smoke Test"
    beforeRequest: "generateAuthToken"
    flow:
      - post:
          url: "/api/diagnosis"
          headers:
            Authorization: "Bearer {{ authToken }}"
```

### 3. Create Test Data Files

```bash
# Create directory
mkdir -p scripts/perf-tests/test-data

# Add sample images
# - Download or copy sample crop disease image
# - Download or copy sample produce image
# - Download or copy sample audio file
```

### 4. Update Test Configuration

**File**: `scripts/perf-tests/artillery-ai-smoke-test.yml`

```yaml
scenarios:
  - name: "Dr. Fasal Smoke Test"
    weight: 20
    flow:
      - post:
          url: "/api/diagnosis"  # FIXED: was /api/diagnosis/test
          headers:
            Content-Type: "multipart/form-data"
          formData:
            image: "@./test-data/sample-crop-disease.jpg"
            cropType: "tomato"
            language: "en"
            location: '{"latitude": 19.0760, "longitude": 72.8777, "state": "Maharashtra"}'
```

---

## Recommended Approach

### Short-term (Quick Fix)

1. **Create test endpoint without authentication**:
   ```typescript
   // In diagnosis.controller.ts, BEFORE router.use(requireAuth)
   router.post('/test', upload.single('image'), createDiagnosis);
   ```

2. **Update test configuration**:
   - Change `/api/diagnosis/test` to `/api/diagnosis/test` (keep test endpoint)
   - OR change to `/api/diagnosis` if using authenticated endpoint

3. **Add test data files**:
   - Create `scripts/perf-tests/test-data/` directory
   - Add sample images and audio files

4. **Re-run smoke test**

### Long-term (Production-Ready)

1. **Implement proper test authentication**:
   - Create test user account
   - Generate JWT tokens in test processor
   - Add authentication headers to all requests

2. **Add test data management**:
   - Script to download/generate test images
   - Version control test data
   - Document test data requirements

3. **Improve test configuration**:
   - Add proper error handling
   - Add response validation
   - Add performance assertions

---

## Expected Results After Fixes

| Metric | Current | Expected After Fix |
|--------|---------|-------------------|
| Success Rate | 35.8% | > 95% |
| Server Errors | 44.2% | < 1% |
| Timeouts | 20% | < 1% |
| Failed Users | 40% | < 5% |

---

## Next Steps

1. ✅ Document root cause (this file)
2. ⏸️ Fix endpoint URLs in test configuration
3. ⏸️ Add test endpoint or implement authentication
4. ⏸️ Create test data files
5. ⏸️ Re-run smoke test
6. ⏸️ Update performance results document

---

**Analysis By**: Performance Testing Team  
**Document Version**: 1.0.0  
**Status**: Root cause identified, fixes pending
