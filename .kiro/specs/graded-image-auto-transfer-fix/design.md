# Graded Image Auto-Transfer Bugfix Design

## Overview

The bug prevents graded images from being automatically transferred from Tile 1 (Grade Produce) to Tile 2 (Create New Listing). Currently, `gradeProduceProduce()` stores only certificate data in `state.currentCertificate` but not the actual image file. The fix requires storing the graded image file in state, displaying it in Tile 2's media preview, and including it as the first photo when creating listings. This is a minimal state management enhancement that preserves all existing functionality.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a user successfully grades produce but the graded image file is not stored in state
- **Property (P)**: The desired behavior - graded image should be stored, displayed in preview, and included as first photo in listing
- **Preservation**: Existing manual upload, certificate attachment, and listing creation functionality that must remain unchanged
- **gradeProduceProduce()**: The function in `public/listing.html` (line ~1684) that handles produce grading via AI API
- **createListing()**: The function in `public/listing.html` (line ~1053) that creates marketplace listings with media
- **state.currentCertificate**: The state property that stores certificate data after grading
- **state.gradedImageFile**: New state property to store the graded image file (to be added)
- **createMediaPreview**: The div element that displays media file thumbnails in Tile 2

## Bug Details

### Fault Condition

The bug manifests when a user successfully grades produce in Tile 1 and then navigates to Tile 2 to create a listing. The `gradeProduceProduce()` function stores certificate data but does not capture the image file from the file input, making it impossible for `createListing()` to access and include the graded image.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type GradingOperation
  OUTPUT: boolean
  
  RETURN input.gradingSuccessful == true
         AND input.certificateGenerated == true
         AND state.currentCertificate != null
         AND state.gradedImageFile == null
END FUNCTION
```

### Examples

- **Example 1**: User uploads tomato.jpg to grade produce → grading succeeds → certificate stored in state → user opens Tile 2 → graded image not visible in preview → user must re-upload tomato.jpg manually
- **Example 2**: User grades bell pepper image → creates listing with manual upload → graded image and manually uploaded image are duplicates → inefficient workflow
- **Example 3**: User grades produce → certificate checkbox auto-checked → creates listing → certificate attached but graded image missing → listing has certificate but no product photo
- **Edge Case**: User grades produce → manually uploads different images → creates listing → graded image should be first, followed by manual uploads in order

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Manual media file uploads in Tile 2 must continue to work exactly as before
- Certificate attachment functionality must remain unchanged (certificate as last image)
- Listing creation without grading must continue to work (manual workflow)
- Media preview display mechanism must remain unchanged
- Auto-population of produce type field must continue to work
- Auto-checking of certificate checkbox must continue to work
- Form clearing after successful listing creation must remain unchanged

**Scope:**
All inputs that do NOT involve grading produce should be completely unaffected by this fix. This includes:
- Creating listings without grading (manual upload only)
- Uploading media files via the file input in Tile 2
- Attaching certificates to listings
- All other listing creation workflows

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing State Storage**: The `gradeProduceProduce()` function does not store the image file from `document.getElementById('gradingImage').files[0]` in the state object
   - Line ~1693: File is accessed but only used for FormData upload
   - Line ~1757: Only certificate data is stored in `state.currentCertificate`
   - No corresponding `state.gradedImageFile` assignment exists

2. **No Preview Update**: After grading completes, there is no code to update the `createMediaPreview` div with the graded image
   - The preview only updates when user manually selects files via `previewCreateFiles()`
   - No mechanism exists to inject the graded image into the preview

3. **No File Inclusion in FormData**: The `createListing()` function only appends files from `document.getElementById('createMediaFiles').files`
   - Line ~1107: Only manual uploads are included
   - No logic exists to prepend the graded image file before manual uploads

## Correctness Properties

Property 1: Fault Condition - Graded Image Auto-Transfer

_For any_ grading operation where produce is successfully graded and a certificate is generated, the fixed system SHALL store the graded image file in state, display it in Tile 2's media preview section, and include it as the first photo when creating a listing.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Functionality

_For any_ listing creation operation that does NOT involve grading (manual upload only), the fixed system SHALL produce exactly the same behavior as the original system, preserving manual upload, certificate attachment, and all other listing creation functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `public/listing.html`

**Function**: `gradeProduceProduce()` (line ~1684)

**Specific Changes**:
1. **Store Graded Image File**: After successful grading, store the image file in state
   - Add `state.gradedImageFile = fileInput.files[0];` after line ~1757 (where certificate is stored)
   - This captures the file object for later use

2. **Update Media Preview**: After storing the file, update the preview in Tile 2
   - Call a new helper function `updateMediaPreviewWithGradedImage()` after storing the file
   - This function should create an img element and prepend it to `createMediaPreview` div
   - Show the preview div by removing the 'hidden' class

**Function**: `createListing()` (line ~1053)

**Specific Changes**:
3. **Include Graded Image in FormData**: Prepend the graded image before manual uploads
   - Before line ~1107 (where manual uploads are appended), check if `state.gradedImageFile` exists
   - If it exists, append it first: `formData.append('media', state.gradedImageFile)`
   - Then append manual uploads as before

4. **Clear Graded Image After Use**: After successful listing creation, clear the graded image from state
   - Add `state.gradedImageFile = null;` in the form clearing section (after line ~1172)
   - This prevents the graded image from being reused in subsequent listings

**New Helper Function**: `updateMediaPreviewWithGradedImage()`

**Specific Changes**:
5. **Create Preview Update Function**: Add a new function to update the preview with the graded image
   - Read the graded image file using FileReader
   - Create an img element with class 'media-thumb'
   - Prepend it to the `createMediaPreview` div (so it appears first)
   - Remove the 'hidden' class from the preview div

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the grading workflow and inspect state and DOM to verify the bug exists. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **State Storage Test**: Grade produce → inspect `state.gradedImageFile` → expect null (will fail on unfixed code)
2. **Preview Display Test**: Grade produce → inspect `createMediaPreview` innerHTML → expect empty (will fail on unfixed code)
3. **Listing Creation Test**: Grade produce → create listing → inspect FormData → expect graded image missing (will fail on unfixed code)
4. **Manual Upload Test**: Upload files manually → inspect preview → expect files displayed (should pass on unfixed code)

**Expected Counterexamples**:
- `state.gradedImageFile` is null after grading completes
- `createMediaPreview` div remains hidden or empty after grading
- Graded image is not included in the FormData when creating listing
- Possible causes: missing state assignment, no preview update logic, no FormData inclusion logic

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := gradeProduceProduce_fixed(input)
  ASSERT state.gradedImageFile != null
  ASSERT createMediaPreview.innerHTML contains img element
  
  result2 := createListing_fixed()
  ASSERT formData contains gradedImageFile as first media
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT createListing_original(input) = createListing_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-grading workflows

**Test Plan**: Observe behavior on UNFIXED code first for manual uploads and listing creation, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Manual Upload Preservation**: Observe that manual file uploads work correctly on unfixed code, then write test to verify this continues after fix
2. **Certificate Attachment Preservation**: Observe that certificate attachment works correctly on unfixed code, then write test to verify this continues after fix
3. **No-Grading Workflow Preservation**: Observe that creating listings without grading works correctly on unfixed code, then write test to verify this continues after fix
4. **Form Clearing Preservation**: Observe that form clearing works correctly on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test that `gradeProduceProduce()` stores the image file in state after successful grading
- Test that `updateMediaPreviewWithGradedImage()` creates and displays the preview correctly
- Test that `createListing()` includes the graded image as the first media file
- Test that graded image is cleared from state after listing creation
- Test edge case: grading → manual upload → listing creation (graded image first, then manual uploads)

### Property-Based Tests

- Generate random grading scenarios and verify image is always stored and displayed
- Generate random manual upload scenarios and verify existing behavior is preserved
- Generate random combinations of grading + manual uploads and verify correct ordering
- Test that all non-grading workflows continue to work across many scenarios

### Integration Tests

- Test full workflow: grade produce → verify preview updates → create listing → verify graded image included
- Test mixed workflow: grade produce → manually upload files → create listing → verify graded image is first
- Test certificate workflow: grade produce → attach certificate → create listing → verify graded image first, certificate last
- Test form clearing: grade produce → create listing → verify graded image cleared from state and preview
