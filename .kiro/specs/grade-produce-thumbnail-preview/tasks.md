# Implementation Plan: Grade Produce Thumbnail Preview

## Overview

This implementation adds thumbnail preview functionality to the Grade Produce tile (Tile 1) in listing.html. The feature follows the existing pattern from crop-diagnosis.html, allowing users to see a preview of their selected image before grading. The implementation involves HTML structure changes, CSS styling (reusing existing classes), and JavaScript functions for handling file selection and image changes.

## Tasks

- [x] 1. Add HTML structure for preview container
  - Add preview container div with hidden state by default
  - Add preview image element with appropriate styling classes
  - Add "Change Image" button within preview container
  - Position preview container between file input and grade button
  - _Requirements: 1.1, 1.2, 2.1, 3.1_

- [x] 2. Add CSS styles for preview functionality
  - Add .preview-image class with max-width 100%, max-height 300px
  - Add styles for centered image display with rounded corners
  - Reuse existing .button-group and .button-secondary classes from crop-diagnosis.html
  - Add .hidden utility class if not already present
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2_

- [x] 3. Implement handleGradingFileSelect() function
  - [x] 3.1 Create handleGradingFileSelect() function to handle file selection
    - Read selected file and create data URL for preview
    - Validate file is an image type (image/*)
    - Display preview image in preview container
    - Hide file input area when preview is shown
    - Show preview container when image is loaded
    - Enable grade button when valid image is selected
    - _Requirements: 1.1, 2.1, 2.3, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4, 9.3, 9.4_

  - [ ]* 3.2 Write unit tests for handleGradingFileSelect()
    - Test valid image file selection
    - Test invalid file type handling
    - Test UI state transitions
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4. Implement changeGradingImage() function
  - [x] 4.1 Create changeGradingImage() function to reset image selection
    - Clear file input value
    - Hide preview container
    - Show file input area
    - Disable grade button
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Write unit tests for changeGradingImage()
    - Test file input reset
    - Test UI state transitions
    - Test button state changes
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 5. Modify file input onchange handler
  - Update gradingImage file input to call handleGradingFileSelect() instead of just enableGradeButton()
  - Ensure backward compatibility with existing enableGradeButton() logic
  - _Requirements: 1.1, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. Ensure preview persists after grading
  - Verify preview container remains visible after gradeProduceProduce() completes
  - Verify "Change Image" button remains functional after grading
  - Verify preview and grade certificate display are both visible simultaneously
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Test responsive design
  - Test preview display on mobile devices (< 768px width)
  - Test "Change Image" button accessibility on mobile
  - Verify preview container adapts to tile width
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Checkpoint - Ensure all functionality works
  - Test complete flow: select image → preview → change image → select new image → preview → grade
  - Verify all existing grading features still work (geolocation, certificate generation, auto-populate)
  - Verify error handling for invalid file types
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation reuses existing CSS classes from crop-diagnosis.html for consistency
- All JavaScript functions follow the existing naming convention in listing.html
- No changes needed to gradeProduceProduce() function - preview should persist automatically
- The feature maintains all existing functionality while adding preview capability
