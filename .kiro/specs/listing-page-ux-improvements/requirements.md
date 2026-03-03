# Listing Page UX Improvements - Requirements

## Overview
Enhance the listing.html page with improved user experience including better tile organization, auto-loading functionality, image management, and certificate integration.

## User Stories

### US-1: Quality Grading First
**As a** farmer  
**I want** the quality grading feature to be the first tile on the page  
**So that** I can grade my produce before creating a listing

**Acceptance Criteria**:
- Quality Grading tile (currently tile 4) is moved to position 1
- Tile title changed from "Quality Grading" to "Grade Produce"
- Grade Produce appears before Create New Listing
- Certificate can be downloaded as an image
- Download button appears after grading is complete

### US-2: Certificate Attachment
**As a** farmer  
**I want** to attach my quality certificate when creating a listing  
**So that** buyers can see the certified quality of my produce

**Acceptance Criteria**:
- Checkbox appears in Create New Listing tile: "Attach quality certificate"
- Checkbox is only enabled if a certificate exists
- When checked, certificate is added as an image to the listing
- Certificate image is included in the listing media

### US-3: Auto-Load Listings
**As a** farmer  
**I want** my listings to load automatically when I open the page  
**So that** I don't have to click a button every time

**Acceptance Criteria**:
- "Load My Listings" button is removed
- Listings load automatically on page load for logged-in users
- Listings refresh automatically after creating a new listing
- Loading indicator shows while listings are being fetched
- Empty state message shows if no listings exist

### US-4: Image Reordering in Create Listing
**As a** farmer  
**I want** to rearrange my uploaded images before creating a listing  
**So that** I can control which image appears first

**Acceptance Criteria**:
- Preview grid shows all selected images before upload
- Drag-and-drop or arrow buttons to reorder images
- Click to set any image as primary
- First image is primary by default
- Primary image is visually indicated with a badge
- Reordering functionality matches media-test.html implementation

### US-5: Enhanced Listing Details
**As a** farmer  
**I want** comprehensive media management in the listing details view  
**So that** I can manage my listing media without switching to edit mode

**Acceptance Criteria**:
- Tile 3 title changed from "View/Edit Listing" to "Listing Details"
- Media grid displayed in view mode
- Ability to rearrange media order (drag-and-drop or arrows)
- Ability to delete individual media items
- Ability to upload additional media
- Ability to set primary media
- All changes save immediately without entering edit mode

### US-6: Improved Grading Display
**As a** farmer  
**I want** to see geotag information in my certificates  
**So that** I can prove where my produce was grown

**Acceptance Criteria**:
- "Detected Crop" label changed to "Crop"
- Geotag (latitude, longitude) displayed in certificate
- For images without geotag: show "Not certified, user uploaded image"
- Geotag captured from browser location API during grading
- Certificate download includes geotag information

### US-7: Data Purge Verification
**As a** developer  
**I want** to verify all data purge endpoints work correctly  
**So that** I can clean test data reliably

**Acceptance Criteria**:
- `/api/dev/delete-media` endpoint tested and working
- `/api/dev/delete-listings` endpoint tested and working
- `/api/dev/clean-all-data` endpoint tested and working
- All endpoints return proper success/error responses
- File system and database are properly synchronized after purge

## Non-Functional Requirements

### NFR-1: Performance
- Auto-loading listings should complete within 2 seconds
- Image reordering should be smooth with no lag
- Certificate download should generate within 1 second

### NFR-2: Usability
- All UI changes should maintain consistent styling
- Drag-and-drop should have visual feedback
- Loading states should be clearly indicated
- Error messages should be user-friendly

### NFR-3: Compatibility
- Works in Chrome, Firefox, Safari, Edge
- Responsive design maintained on mobile devices
- Geolocation works with user permission

## Technical Constraints

- Backend API endpoints already exist for media management
- media-test.html contains reference implementation for image reordering
- Certificate generation uses existing grading API
- Geolocation requires browser permission

## Success Metrics

- Reduced clicks to create a listing (no manual load button)
- Improved user flow (grading before listing)
- Increased certificate attachment rate
- Faster listing creation with image preview

## Out of Scope

- Backend API changes (all endpoints exist)
- New grading algorithms
- Certificate format changes beyond geotag
- Multi-language support for new UI elements
