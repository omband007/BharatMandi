# Video File Size Validation Property-Based Test Bugfix Design

## Overview

The property-based test "should accept all files within size limits with valid types" is failing when testing video files with MIME type 'video/mp4'. The test generates random file sizes between 1KB and 1024KB (well within the 50MB video limit) and expects validation to pass, but the validation service is incorrectly rejecting these valid video files. This design document formalizes the bug condition, analyzes the root cause, and outlines the fix to ensure video files within size limits are properly accepted while preserving all existing validation behavior.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when video files with valid MIME types and sizes within the 50MB limit are incorrectly rejected by validation
- **Property (P)**: The desired behavior - video files within size limits with valid MIME types should pass validation (result.valid = true)
- **Preservation**: Existing validation behavior for photos, documents, oversized files, invalid MIME types, mismatched extensions, and empty files that must remain unchanged
- **validateMediaFile**: The function in `src/features/marketplace/validation.service.ts` that validates media files against size, MIME type, and extension requirements
- **MAX_FILE_SIZES**: The constant in `src/features/marketplace/media.constants.ts` that defines maximum allowed file sizes (photo: 5MB, video: 50MB, document: 10MB)
- **ALLOWED_MIME_TYPES**: The constant that defines valid MIME types for each media type
- **FILE_EXTENSION_TO_MIME**: The mapping from file extensions to expected MIME types

## Bug Details

### Fault Condition

The bug manifests when the property-based test generates a video file with a size between 1KB and 1024KB and MIME type "video/mp4". The `validateMediaFile` function is either incorrectly validating the file size, incorrectly validating the MIME type, incorrectly validating the file extension, or has a logic error in the validation chain that causes valid video files to be rejected.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { file: Buffer, fileName: string, mimeType: string, mediaType: MediaType }
  OUTPUT: boolean
  
  RETURN input.mediaType == 'video'
         AND input.mimeType IN ['video/mp4', 'video/quicktime']
         AND input.fileName matches pattern '*.mp4' OR '*.mov'
         AND input.file.length > 0
         AND input.file.length <= MAX_FILE_SIZES['video']
         AND validateMediaFile(input.file, input.fileName, input.mimeType, input.mediaType).valid == false
END FUNCTION
```

### Examples

- **Example 1**: File size 1024 bytes (1KB), fileName 'test.mp4', mimeType 'video/mp4', mediaType 'video'
  - Expected: `result.valid = true`
  - Actual: `result.valid = false` (bug)

- **Example 2**: File size 1048576 bytes (1MB), fileName 'test.mp4', mimeType 'video/mp4', mediaType 'video'
  - Expected: `result.valid = true`
  - Actual: `result.valid = false` (bug)

- **Example 3**: File size 52428800 bytes (50MB exactly), fileName 'test.mp4', mimeType 'video/mp4', mediaType 'video'
  - Expected: `result.valid = true`
  - Actual: Should work based on unit test, but property test may fail

- **Edge Case**: File size 52428801 bytes (50MB + 1 byte), fileName 'test.mp4', mimeType 'video/mp4', mediaType 'video'
  - Expected: `result.valid = false` with error about exceeding maximum
  - Actual: Should work correctly (not part of bug)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Photo file validation (within 5MB limit) must continue to work correctly
- Document file validation (within 10MB limit) must continue to work correctly
- Rejection of oversized files (>50MB for videos) must continue to work with appropriate error messages
- Rejection of invalid MIME types must continue to work
- Rejection of mismatched file extensions and MIME types must continue to work
- Rejection of empty files (0 bytes) must continue to work
- All existing unit tests must continue to pass

**Scope:**
All inputs that do NOT involve video files with valid MIME types and sizes within the 50MB limit should be completely unaffected by this fix. This includes:
- Photo validation (image/jpeg, image/png, image/webp)
- Document validation (application/pdf)
- Oversized file rejection for all media types
- Invalid MIME type rejection
- Extension mismatch rejection
- Empty file rejection

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Validation Chain Logic Error**: The `validateMediaFile` function calls multiple validation methods in sequence. One of these methods may be incorrectly rejecting valid video files, possibly due to:
   - Incorrect comparison logic in `validateFileSize`
   - Incorrect MIME type checking in `validateMimeType`
   - Incorrect extension matching in `validateFileExtension`

2. **Constants Configuration Issue**: The `ALLOWED_MIME_TYPES`, `FILE_EXTENSION_TO_MIME`, or `MAX_FILE_SIZES` constants may have incorrect values or missing entries for video files

3. **Test Setup Issue**: The property-based test itself may have an issue in how it constructs the test file or passes parameters, though this is less likely given the test structure

4. **Edge Case in Size Validation**: The `validateFileSize` method may have an off-by-one error or incorrect comparison operator (e.g., using `>=` instead of `>`)

## Correctness Properties

Property 1: Fault Condition - Video Files Within Size Limits Are Accepted

_For any_ video file input where the file size is greater than 0 and less than or equal to 50MB (52428800 bytes), the MIME type is 'video/mp4' or 'video/quicktime', and the file extension matches the MIME type ('.mp4' or '.mov'), the fixed validateMediaFile function SHALL return `result.valid = true`, indicating the file passes validation.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Video Validation Behavior

_For any_ input that is NOT a video file within size limits (photos, documents, oversized files, invalid MIME types, mismatched extensions, empty files), the fixed validateMediaFile function SHALL produce exactly the same validation result as the original function, preserving all existing validation logic and error messages.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix will involve debugging and correcting the validation logic:

**File**: `src/features/marketplace/validation.service.ts`

**Function**: `validateMediaFile` and its helper methods

**Specific Changes**:
1. **Debug Validation Chain**: Add logging or step through the validation process to identify which validation method is incorrectly rejecting video files
   - Check `validateFileExtension` for correct extension-to-MIME mapping
   - Check `validateMimeType` for correct MIME type allowlist checking
   - Check `validateFileSize` for correct size comparison logic

2. **Fix Size Validation Logic**: If the issue is in `validateFileSize`, ensure the comparison uses `>` (not `>=`) and correctly compares against `MAX_FILE_SIZES[mediaType]`

3. **Fix MIME Type Validation**: If the issue is in `validateMimeType`, ensure 'video/mp4' and 'video/quicktime' are correctly checked against `ALLOWED_MIME_TYPES['video']`

4. **Fix Extension Validation**: If the issue is in `validateFileExtension`, ensure '.mp4' correctly maps to 'video/mp4' in `FILE_EXTENSION_TO_MIME`

5. **Verify Constants**: Ensure `media.constants.ts` has correct values:
   - `MAX_FILE_SIZES.video = 50 * 1024 * 1024` (52428800 bytes)
   - `ALLOWED_MIME_TYPES.video = ['video/mp4', 'video/quicktime']`
   - `FILE_EXTENSION_TO_MIME['.mp4'] = 'video/mp4'`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by running the existing failing property-based test, then verify the fix works correctly and preserves existing behavior by re-running all tests.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Run the existing property-based test "should accept all files within size limits with valid types" on the UNFIXED code. Add debug logging to the validation methods to trace which validation step is failing. Observe the exact error message and validation result for video files.

**Test Cases**:
1. **Small Video Test**: Generate video file with size 1KB, fileName 'test.mp4', mimeType 'video/mp4' (will fail on unfixed code)
2. **Medium Video Test**: Generate video file with size 1MB, fileName 'test.mp4', mimeType 'video/mp4' (will fail on unfixed code)
3. **Large Valid Video Test**: Generate video file with size 49MB, fileName 'test.mp4', mimeType 'video/mp4' (will fail on unfixed code)
4. **Boundary Video Test**: Generate video file with size exactly 50MB, fileName 'test.mp4', mimeType 'video/mp4' (may fail on unfixed code)

**Expected Counterexamples**:
- Video files within size limits are rejected with `result.valid = false`
- Possible error messages: "Invalid MIME type", "File extension does not match", or no error but valid=false
- Possible causes: incorrect MIME type checking, incorrect extension validation, incorrect size comparison

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := validateMediaFile_fixed(input.file, input.fileName, input.mimeType, input.mediaType)
  ASSERT result.valid == true
  ASSERT result.error is undefined
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  originalResult := validateMediaFile_original(input.file, input.fileName, input.mimeType, input.mediaType)
  fixedResult := validateMediaFile_fixed(input.file, input.fileName, input.mimeType, input.mediaType)
  ASSERT originalResult.valid == fixedResult.valid
  ASSERT originalResult.error == fixedResult.error
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for photo and document validation, then write property-based tests capturing that behavior. Verify all existing unit tests continue to pass.

**Test Cases**:
1. **Photo Validation Preservation**: Observe that photo files (JPEG, PNG, WebP) within 5MB work correctly on unfixed code, then verify this continues after fix
2. **Document Validation Preservation**: Observe that PDF files within 10MB work correctly on unfixed code, then verify this continues after fix
3. **Oversized File Rejection Preservation**: Observe that files exceeding size limits are rejected on unfixed code, then verify this continues after fix
4. **Invalid MIME Type Rejection Preservation**: Observe that invalid MIME types are rejected on unfixed code, then verify this continues after fix

### Unit Tests

- Test video file validation with various sizes (1KB, 1MB, 10MB, 49MB, 50MB exactly)
- Test video file validation with both 'video/mp4' and 'video/quicktime' MIME types
- Test video file validation with both '.mp4' and '.mov' extensions
- Test edge cases (50MB + 1 byte should be rejected, 0 bytes should be rejected)
- Verify all existing unit tests continue to pass

### Property-Based Tests

- Re-run the failing property test "should accept all files within size limits with valid types" and verify it passes for all 100 runs
- Generate random video file sizes between 1 byte and 50MB and verify all are accepted
- Generate random photo and document files and verify preservation of existing validation behavior
- Test that oversized files (>50MB for videos) continue to be rejected across many scenarios

### Integration Tests

- Test full file upload flow with video files of various sizes
- Test validation error messages are user-friendly and accurate
- Test that validation works correctly when called from the media controller
