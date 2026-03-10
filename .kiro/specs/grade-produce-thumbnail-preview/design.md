# Design Document: Grade Produce Thumbnail Preview

## Overview

This feature adds thumbnail preview functionality to the Grade Produce tile (Tile 1) in listing.html. When a user selects an image for grading, a thumbnail preview will be displayed immediately within the same tile, providing visual confirmation before they click the "Grade Produce" button. The implementation follows the existing pattern from crop-diagnosis.html to maintain consistency across the application.

The feature enhances user experience by:
- Providing immediate visual feedback when an image is selected
- Allowing users to verify their selection before grading
- Enabling easy image replacement without page refresh
- Maintaining a clean, focused interface by hiding the upload area when preview is shown

## Architecture

### Component Structure

The feature consists of three main UI components within Tile 1:

1. **Upload Area** (`#uploadArea` or file input wrapper)
   - Visible by default when no image is selected
   - Hidden when preview is displayed
   - Contains the file input element (`#gradingImage`)

2. **Preview Container** (`#previewContainer`)
   - Hidden by default
   - Displayed when a valid image is selected
   - Contains the thumbnail image and action buttons
   - Positioned between the upload area and grade button

3. **Action Buttons**
   - Grade Produce button (existing `#gradeProduceBtn`)
   - Change Image button (new, within preview container)

### State Management

The feature manages UI state through DOM visibility and the existing `enableGradeButton()` function:

- **No Image Selected**: Upload area visible, preview hidden, grade button disabled
- **Valid Image Selected**: Upload area hidden, preview visible, grade button enabled
- **After Grading**: Preview remains visible, grade button enabled, results displayed below

### Event Flow

```
User selects file → FileReader reads file → Preview displayed → Upload area hidden → Grade button enabled
                                                                                    ↓
User clicks "Change Image" → Preview hidden → Upload area shown → File input cleared → Grade button disabled
```

## Components and Interfaces

### HTML Structure

The preview container will be inserted into Tile 1 with the following structure:

```html
<div id="previewContainer" style="display: none;">
    <img id="previewImage" class="preview-image" alt="Preview">
    <div class="button-group">
        <button class="analyze-button" id="gradeProduceBtn" onclick="gradeProduceProduce()">
            🔍 Grade Produce
        </button>
        <button class="change-image-button" onclick="changeGradingImage()">
            🔄 Change Image
        </button>
    </div>
</div>
```

### CSS Classes

Reusing existing classes from crop-diagnosis.html:

- `.preview-image`: Styles for the thumbnail image (max-width: 100%, max-height: 300px, border-radius: 10px, centered)
- `.button-group`: Flexbox container for buttons (display: flex, gap: 10px)
- `.analyze-button`: Primary action button styling (green background)
- `.change-image-button`: Secondary action button styling (gray background)

Additional inline styles for the preview container:
- `display: none` (initial state)
- `margin: 20px 0` (spacing)

### JavaScript Functions

#### New Functions

**`handleGradingFileSelect(event)`**
- Triggered by the file input's `onchange` event
- Validates file type (image/*)
- Uses FileReader to read the file as Data URL
- Displays preview and hides upload area
- Calls `enableGradeButton()` to update button state
- Shows error message for invalid files

**`changeGradingImage()`**
- Hides preview container
- Shows upload area
- Clears file input value
- Calls `enableGradeButton()` to disable the grade button

#### Modified Functions

**`enableGradeButton()`** (existing)
- No changes required - already checks if file input has files
- Will automatically work with the new preview functionality

**`gradeProduceProduce()`** (existing)
- No changes required
- Preview remains visible after grading completes

### Integration Points

1. **File Input Element**: Add `onchange="handleGradingFileSelect(event)"` to `#gradingImage`
2. **Upload Area**: Wrap existing file input in a container that can be hidden/shown
3. **Preview Container**: Insert after upload area, before grade button
4. **Button Positioning**: Move grade button into preview container's button group

## Data Models

No new data models required. The feature works with:

- **File Object**: Native browser File API object from input element
- **Data URL**: Base64-encoded image string from FileReader
- **DOM Elements**: References to upload area, preview container, preview image, and buttons

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Image Selection Shows Preview

*For any* valid image file selected through the file input, the preview container should become visible and display the image with the correct data URL as its src attribute.

**Validates: Requirements 1.1**

### Property 2: Preview Hides Upload Area

*For any* state where the preview container is visible, the upload area should have display style set to 'none' or be otherwise hidden from view.

**Validates: Requirements 2.1**

### Property 3: Change Image Restores Upload Area

*For any* state where the preview is visible, clicking the "Change Image" button should hide the preview container, show the upload area, clear the file input value, and disable the grade button.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 4: New Selection Replaces Preview

*For any* state where a preview is already displayed, selecting a new valid image file should update the preview image's src attribute to the new file's data URL.

**Validates: Requirements 4.1**

### Property 5: Invalid File Type Shows Error

*For any* file that is not of type image/*, selecting it should display an error message, keep the preview container hidden, and keep the grade button disabled.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 6: Preview Persists After Grading

*For any* successful grading operation, the preview container should remain visible with the thumbnail displayed alongside the grading results.

**Validates: Requirements 5.1, 5.3**

### Property 7: Grade Button State Management

*For any* UI state, the grade button should be disabled when no valid image is selected and enabled when a valid image is selected and previewed.

**Validates: Requirements 9.3, 9.4**

### Property 8: Responsive Container Width

*For any* viewport width, the preview container should adapt its width to match the tile width (100% of parent container).

**Validates: Requirements 7.1**

### Property 9: Mobile Button Accessibility

*For any* viewport width less than 768px, the "Change Image" button should remain visible and have appropriate touch-friendly dimensions (minimum 44x44px touch target).

**Validates: Requirements 7.3**

### Property 10: Existing Functionality Preserved

*For any* grading operation after adding the preview feature, the enableGradeButton and gradeProduceProduce functions should continue to work correctly, and geolocation, certificate generation, and result display features should function without modification.

**Validates: Requirements 9.1, 9.2, 9.5**

## Error Handling

### File Validation Errors

**Invalid File Type**
- Detection: Check `file.type` against allowed types (`image/jpeg`, `image/png`, `image/webp`, etc.)
- Response: Display error message "Please select a valid image file (JPEG, PNG, or WebP)"
- Recovery: Keep upload area visible, preview hidden, grade button disabled

**File Read Errors**
- Detection: FileReader `onerror` event
- Response: Display error message "Failed to read the selected file. Please try again."
- Recovery: Show upload area, hide preview, clear file input

### Edge Cases

**Rapid File Selection**
- Scenario: User quickly selects multiple files in succession
- Handling: Each selection triggers FileReader, which updates preview when complete
- Note: FileReader operations are asynchronous but will complete in order

**Large Image Files**
- Scenario: User selects a very large image file
- Handling: FileReader may take longer to read; no loading indicator needed for preview (grading has its own loading state)
- Note: File size validation is handled by the file input's existing constraints

**Browser Compatibility**
- FileReader API: Supported in all modern browsers (IE10+)
- Fallback: Not required for this feature as the application already uses modern APIs

## Testing Strategy

### Unit Testing Approach

Unit tests will focus on specific examples, edge cases, and integration points:

**File Selection Tests**
- Test that selecting a valid image file triggers the preview display
- Test that selecting an invalid file type shows an error message
- Test that the upload area is hidden when preview is shown
- Test that file input change event handler is properly attached

**Change Image Tests**
- Test that clicking "Change Image" hides the preview
- Test that clicking "Change Image" shows the upload area
- Test that clicking "Change Image" clears the file input value
- Test that clicking "Change Image" disables the grade button

**Integration Tests**
- Test that enableGradeButton() works correctly with preview functionality
- Test that gradeProduceProduce() continues to work after adding preview
- Test that preview remains visible after grading completes
- Test that certificate display appears alongside the preview

**Responsive Design Tests**
- Test that preview container adapts to different viewport widths
- Test that buttons remain accessible on mobile devices (< 768px)
- Test that thumbnail image scales appropriately on small screens

### Property-Based Testing Approach

Property-based tests will verify universal properties across many generated inputs using a JavaScript property-based testing library (fast-check):

**Configuration**
- Library: fast-check (npm package)
- Iterations: Minimum 100 runs per property test
- Test files: `__tests__/thumbnail-preview.property.test.js`

**Property Tests**

Each property test will be tagged with a comment referencing the design document:

```javascript
// Feature: grade-produce-thumbnail-preview, Property 1: Image Selection Shows Preview
test('property: valid image selection shows preview', () => {
  fc.assert(
    fc.property(fc.imageFile(), (imageFile) => {
      // Test that selecting imageFile displays preview
    }),
    { numRuns: 100 }
  );
});
```

**Test Coverage**
- Property 1: Generate random valid image files, verify preview displays
- Property 2: Generate random UI states with preview visible, verify upload area hidden
- Property 3: Generate random preview states, verify change button restores upload area
- Property 4: Generate random image pairs, verify second selection replaces first
- Property 5: Generate random non-image files, verify error handling
- Property 6: Generate random grading results, verify preview persists
- Property 7: Generate random file selection states, verify button state
- Property 8: Generate random viewport widths, verify container responsiveness
- Property 9: Generate random mobile viewport widths, verify button accessibility
- Property 10: Generate random grading operations, verify existing functionality preserved

### Manual Testing Checklist

- Visual verification of thumbnail display quality
- Verification of smooth transitions between states
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing (iOS Safari, Chrome Mobile)
- Accessibility testing (keyboard navigation, screen readers)

## Implementation Notes

### Development Sequence

1. Add preview container HTML structure to listing.html
2. Add CSS classes (reuse from crop-diagnosis.html)
3. Implement `handleGradingFileSelect()` function
4. Implement `changeGradingImage()` function
5. Update file input to call `handleGradingFileSelect()` on change
6. Test integration with existing `enableGradeButton()` function
7. Verify preview persists after grading
8. Test responsive behavior on mobile devices

### Code Reuse

The implementation will closely follow the pattern from crop-diagnosis.html:
- HTML structure: Similar preview container and button group
- CSS classes: Reuse `.preview-image`, `.button-group`, `.analyze-button`, `.change-image-button`
- JavaScript pattern: Similar FileReader usage and state management

### Performance Considerations

- FileReader operations are asynchronous and non-blocking
- Data URLs are stored in memory only (not persisted)
- Preview images are automatically garbage collected when replaced
- No performance impact on existing grading functionality

### Accessibility Considerations

- Preview image includes descriptive `alt` attribute
- Buttons include emoji icons and text labels
- Keyboard navigation supported (tab through buttons)
- Focus management when switching between upload and preview states
- Error messages are announced to screen readers

### Browser Compatibility

- FileReader API: All modern browsers
- Data URLs: All modern browsers
- CSS Flexbox: All modern browsers
- No polyfills required

## Future Enhancements

- Image rotation controls in preview
- Zoom functionality for preview image
- Drag-and-drop file selection directly on preview area
- Multiple image preview for batch grading
- Image cropping before grading
- Preview thumbnail in listing cards after grading
