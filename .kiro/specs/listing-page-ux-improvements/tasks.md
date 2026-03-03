# Listing Page UX Improvements - Implementation Tasks

## Task 1: Reorganize Tiles
- [x] 1.1 Update tile numbers in HTML
  - Change tile 4 number to 1
  - Change tile 1 number to 2
  - Change tile 2 number to 3
  - Change tile 3 number to 4
  - Keep tile 5 unchanged
- [x] 1.2 Reorder tile HTML blocks
  - Move Quality Grading tile (tile4) before Create New Listing
  - Update tile IDs accordingly
- [x] 1.3 Change "Quality Grading" title to "Grade Produce"
- [x] 1.4 Update tile-grid CSS if needed for proper display

## Task 2: Implement Certificate Download
- [x] 2.1 Add download button to grading results display
- [x] 2.2 Create `downloadCertificate()` function
  - Generate certificate using HTML5 Canvas
  - Include all certificate details (ID, crop, grade, confidence, date, geotag, farmer ID)
  - Draw certificate border and header
  - Add grade badge with color coding
  - Convert canvas to blob and trigger download
- [x] 2.3 Create helper function `createCertificateCanvas(certificate)`
- [x] 2.4 Add CSS styling for download button
- [x] 2.5 Test certificate download in multiple browsers

## Task 3: Add Geotag to Certificates
- [x] 3.1 Update `gradeProduceProduce()` function
  - Enhance geolocation capture with error handling
  - Include accuracy in geotag data
  - Handle permission denied gracefully
- [x] 3.2 Update grading results display
  - Change "Detected Crop" label to "Crop"
  - Add geotag display with lat/lng
  - Show "Not certified, user uploaded image" when no geotag
- [x] 3.3 Update certificate generation to include geotag
- [ ] 3.4 Test geolocation on different devices

## Task 4: Add Certificate Attachment Checkbox
- [x] 4.1 Add checkbox HTML in Create New Listing tile
  - Label: "Attach quality certificate to this listing"
  - Info text showing certificate status
- [x] 4.2 Create `toggleCertificateAttachment()` function
  - Check if certificate exists
  - Update info text based on state
  - Disable checkbox if no certificate available
- [ ] 4.3 Create `generateCertificateBlob(certificate)` function
  - Reuse certificate canvas generation
  - Return blob instead of downloading
- [x] 4.4 Update `createListing()` function
  - Check if certificate checkbox is checked
  - Generate certificate blob
  - Append to formData as media file
- [ ] 4.5 Update state management to track certificate attachment
- [ ] 4.6 Test certificate attachment end-to-end

## Task 5: Implement Image Reordering Preview
- [ ] 5.1 Update preview grid HTML structure
  - Add `media-preview-reorder` class
  - Make items draggable
- [ ] 5.2 Add CSS for draggable preview items
  - Dragging state styles
  - Primary badge styles
  - Preview actions button styles
- [ ] 5.3 Create `renderPreviewGrid()` function
  - Generate preview items for each file
  - Add drag-and-drop event listeners
  - Add action buttons (move left/right, set primary)
  - Mark first item as primary
- [ ] 5.4 Implement drag-and-drop handlers
  - `handleDragStart(e)`
  - `handleDragOver(e)`
  - `handleDrop(e)`
  - `handleDragEnd(e)`
- [ ] 5.5 Create `movePreviewItem(index, direction)` function
- [ ] 5.6 Create `setPrimaryPreview(index)` function
- [ ] 5.7 Update `previewCreateFiles()` to use new preview system
- [ ] 5.8 Update `createListing()` to use reordered files
- [ ] 5.9 Add `previewFiles` array to state management
- [ ] 5.10 Test drag-and-drop on desktop and touch devices

## Task 6: Auto-Load Listings
- [x] 6.1 Remove "Load My Listings" button from HTML
- [x] 6.2 Update `DOMContentLoaded` event handler
  - Call `loadMyListings()` if user is logged in
  - Add login state change detection
  - Auto-load when user logs in
- [x] 6.3 Update `createListing()` function
  - Remove setTimeout for auto-refresh
  - Call `loadMyListings()` directly after success
- [ ] 6.4 Add loading indicator during auto-load
- [ ] 6.5 Test auto-load on page refresh
- [ ] 6.6 Test auto-load after login
- [ ] 6.7 Test auto-load after creating listing

## Task 7: Update Listing Details Tile
- [ ] 7.1 Change tile title from "Listing Details & Media" to "Listing Details"
- [ ] 7.2 Verify media management works in view mode
  - Upload additional media
  - Reorder media
  - Set primary media
  - Delete media
- [ ] 7.3 Test all media operations
- [ ] 7.4 Ensure no regressions in existing functionality

## Task 8: Verify Data Purge Endpoints
- [ ] 8.1 Test `/api/dev/delete-media` endpoint
  - Send POST request
  - Verify response status and data
  - Check database and file system
- [ ] 8.2 Test `/api/dev/delete-listings` endpoint
  - Send POST request
  - Verify response status and data
  - Check cascade delete works
- [ ] 8.3 Test `/api/dev/clean-all-data` endpoint
  - Send POST request
  - Verify response status and data
  - Check all data is cleaned
- [ ] 8.4 Create verification test script (optional)
- [ ] 8.5 Document any issues found

## Task 9: Error Handling and Edge Cases
- [ ] 9.1 Handle geolocation permission denied
  - Show user-friendly message
  - Continue with grading without geotag
- [ ] 9.2 Handle certificate generation failure
  - Show warning message
  - Allow listing creation to continue
- [ ] 9.3 Handle no certificates available
  - Disable certificate checkbox
  - Show helpful message
- [ ] 9.4 Handle empty listings
  - Show empty state message
  - Provide guidance to create first listing
- [ ] 9.5 Handle network errors
  - Show error messages
  - Provide retry options

## Task 10: Testing and Validation
- [ ] 10.1 Manual testing checklist
  - Verify tile order (1: Grade Produce, 2: Create Listing, 3: My Listings, 4: Listing Details, 5: Certificates)
  - Test certificate download
  - Test geotag display
  - Test certificate attachment
  - Test image reordering
  - Test auto-load listings
  - Test media management
- [ ] 10.2 Browser compatibility testing
  - Chrome
  - Firefox
  - Safari
  - Edge
- [ ] 10.3 Responsive design testing
  - Desktop (1920x1080)
  - Tablet (768x1024)
  - Mobile (375x667)
- [ ] 10.4 Accessibility testing
  - Keyboard navigation
  - Screen reader support
  - Focus indicators
- [ ] 10.5 Performance testing
  - Image preview load time
  - Auto-load speed
  - Certificate generation time

## Task 11: Documentation and Cleanup
- [ ] 11.1 Update code comments
- [x] 11.2 Remove console.log statements (keep error logs)
- [ ] 11.3 Update info card with new features
- [ ] 11.4 Add inline documentation for new functions
- [ ] 11.5 Create user guide (optional)

## Task 12: Final Review
- [ ] 12.1 Code review
  - Check for code quality
  - Verify error handling
  - Ensure consistent styling
- [ ] 12.2 Regression testing
  - Verify existing features still work
  - Check login/logout flow
  - Test listing CRUD operations
- [ ] 12.3 User acceptance testing
  - Get feedback from stakeholders
  - Address any issues
- [ ] 12.4 Mark spec as complete
