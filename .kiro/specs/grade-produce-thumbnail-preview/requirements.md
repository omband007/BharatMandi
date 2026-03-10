# Requirements Document

## Introduction

This feature adds thumbnail preview functionality to the Grade Produce tile (Tile 1) in listing.html. When a user selects an image for grading, a thumbnail preview will be displayed immediately in the same tile, providing visual confirmation before they click the "Grade Produce" button. This enhancement follows the existing pattern from crop-diagnosis.html and improves the user experience by allowing users to verify their image selection.

## Glossary

- **Grade_Produce_Tile**: The first tile in listing.html containing the produce grading functionality
- **Thumbnail_Preview**: A scaled-down visual representation of the selected image displayed within the tile
- **File_Input**: The HTML input element with id "gradingImage" that accepts image file selection
- **Preview_Container**: A new HTML container element that will display the thumbnail image
- **Grade_Button**: The button with id "gradeProduceBtn" that triggers the grading analysis

## Requirements

### Requirement 1: Display Thumbnail Preview on Image Selection

**User Story:** As a farmer, I want to see a thumbnail preview of my selected image immediately after choosing a file, so that I can verify I selected the correct image before grading.

#### Acceptance Criteria

1. WHEN a user selects an image file via the File_Input, THE Preview_Container SHALL display a thumbnail preview of the selected image
2. THE Preview_Container SHALL be positioned between the File_Input and the Grade_Button
3. THE thumbnail image SHALL have a maximum width of 100% of the container
4. THE thumbnail image SHALL have a maximum height of 300 pixels
5. THE thumbnail image SHALL maintain its original aspect ratio
6. THE thumbnail image SHALL be centered horizontally within the Preview_Container
7. THE thumbnail image SHALL have rounded corners with an 8-10 pixel border radius

### Requirement 2: Hide Upload Area When Preview is Shown

**User Story:** As a farmer, I want the file input area to be hidden when a preview is shown, so that the interface is clean and focused on my selected image.

#### Acceptance Criteria

1. WHEN the Preview_Container displays a thumbnail, THE File_Input area SHALL be hidden from view
2. WHEN the user changes or removes the image, THE File_Input area SHALL be displayed again
3. THE transition between showing the File_Input and Preview_Container SHALL be smooth and immediate

### Requirement 3: Provide Image Change Functionality

**User Story:** As a farmer, I want to change my selected image before grading, so that I can correct mistakes without refreshing the page.

#### Acceptance Criteria

1. WHEN the Preview_Container is visible, THE system SHALL display a "Change Image" button
2. WHEN the user clicks the "Change Image" button, THE Preview_Container SHALL be hidden
3. WHEN the user clicks the "Change Image" button, THE File_Input area SHALL be displayed
4. WHEN the user clicks the "Change Image" button, THE File_Input value SHALL be cleared
5. WHEN the user clicks the "Change Image" button, THE Grade_Button SHALL be disabled
6. THE "Change Image" button SHALL be styled consistently with existing secondary buttons in the application

### Requirement 4: Clear Preview on New Selection

**User Story:** As a farmer, I want the old thumbnail to be replaced when I select a new image, so that I always see the current selection.

#### Acceptance Criteria

1. WHEN a user selects a new image file while a preview is already displayed, THE Preview_Container SHALL replace the old thumbnail with the new one
2. WHEN a user selects a new image file, THE system SHALL read and display the new file within 500 milliseconds
3. IF the new file fails to load, THEN THE system SHALL display an error message and show the File_Input area again

### Requirement 5: Maintain Preview After Grading

**User Story:** As a farmer, I want to see both my uploaded image thumbnail and the grading results together, so that I can review the image alongside its grade certificate.

#### Acceptance Criteria

1. WHEN the grading process completes successfully, THE Preview_Container SHALL remain visible showing the thumbnail
2. WHEN the grading results are displayed, THE thumbnail preview SHALL remain visible above or beside the grading certificate
3. THE Preview_Container and Grade Certificate Display SHALL both be visible simultaneously after grading
4. THE "Change Image" button SHALL remain available after grading to allow selecting a different image for a new grading

### Requirement 6: Validate Image File Types

**User Story:** As a farmer, I want to be notified if I select an invalid file type, so that I don't waste time trying to grade unsupported files.

#### Acceptance Criteria

1. WHEN a user selects a file that is not an image type, THE system SHALL display an error message
2. WHEN a user selects an invalid file type, THE Preview_Container SHALL not display a thumbnail
3. WHEN a user selects an invalid file type, THE Grade_Button SHALL remain disabled
4. THE error message SHALL clearly state which file types are accepted (image/*)

### Requirement 7: Responsive Design Consistency

**User Story:** As a farmer using different devices, I want the thumbnail preview to look good on all screen sizes, so that I have a consistent experience.

#### Acceptance Criteria

1. THE Preview_Container SHALL be responsive and adapt to the tile width
2. THE thumbnail image SHALL scale appropriately on mobile devices (screens < 768px wide)
3. THE "Change Image" button SHALL remain accessible and properly sized on mobile devices
4. THE Preview_Container styling SHALL match the existing design system colors, borders, and spacing

### Requirement 8: Follow Crop Diagnosis Pattern

**User Story:** As a developer, I want the implementation to follow the existing pattern from crop-diagnosis.html, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE implementation SHALL use similar HTML structure as the preview functionality in crop-diagnosis.html
2. THE implementation SHALL use similar CSS styling as the preview functionality in crop-diagnosis.html
3. THE implementation SHALL use similar JavaScript event handlers as the preview functionality in crop-diagnosis.html
4. THE implementation SHALL reuse existing CSS classes where applicable (e.g., preview-image, button-group)

### Requirement 9: Maintain Existing Functionality

**User Story:** As a farmer, I want all existing grading features to continue working after the thumbnail preview is added, so that my workflow is not disrupted.

#### Acceptance Criteria

1. THE enableGradeButton function SHALL continue to work correctly with the new preview functionality
2. THE gradeProduceProduce function SHALL continue to work correctly with the new preview functionality
3. THE Grade_Button SHALL remain disabled until a valid image is selected
4. THE Grade_Button SHALL remain enabled after a valid image is selected and previewed
5. THE existing geolocation, certificate generation, and result display features SHALL continue to function without modification
