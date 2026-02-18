# Implementation Plan: Listing Media Support

## Overview

This implementation plan adds comprehensive media support to marketplace listings, allowing farmers to attach photos, videos, and PDF documents. The feature integrates with the existing dual database architecture (PostgreSQL + SQLite) and supports full offline functionality.

### Technology Stack
- **Backend**: Node.js + Express + TypeScript
- **Storage**: AWS S3 (cloud) + Local filesystem (offline)
- **Image Processing**: Sharp library for thumbnails and compression
- **File Upload**: Multer middleware for multipart/form-data
- **Databases**: PostgreSQL (primary) + SQLite (offline cache)

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create PostgreSQL schema for listing_media
    - Create `listing_media` table with all fields
    - Add indexes for performance (listing_id, media_type, is_primary, display_order)
    - Create unique constraint for one primary media per listing
    - Create trigger to update listing's updated_at timestamp
    - _Requirements: 1.6, 3.4, 8.3_
  
  - [x] 1.2 Create SQLite schema for media caching
    - Create `listing_media_cache` table
    - Create `pending_media_ops` table for sync queue
    - Create `local_media_files` table for offline uploads
    - Add indexes for performance
    - _Requirements: 2.8, 3.8, 6.2_
  
  - [x] 1.3 Write migration scripts
    - Create PostgreSQL migration script
    - Create SQLite migration script
    - Test migrations on clean database
    - _Requirements: All_


- [x] 2. Data Models and Types
  - [x] 2.1 Define TypeScript interfaces
    - Create MediaType, MediaOperation, UploadStatus types
    - Create ListingMedia interface
    - Create MediaUploadRequest, MediaUploadResponse interfaces
    - Create PendingMediaOperation, LocalMediaFile interfaces
    - _Requirements: 1.2, 5.6_
  
  - [x] 2.2 Define validation constants
    - Define ALLOWED_MIME_TYPES map
    - Define MAX_FILE_SIZES map
    - Define MAX_MEDIA_PER_LISTING constant (10)
    - _Requirements: 1.3, 1.8, 2.4_


- [x] 3. Storage Service Implementation
  - [x] 3.1 Implement cloud storage service (AWS S3)
    - Set up AWS S3 client configuration
    - Implement uploadFile method
    - Implement deleteFile method
    - Implement generateSignedUrl method (1-hour expiration)
    - Organize files by listing: `listings/{listingId}/media/{mediaId}.{ext}`
    - _Requirements: 5.1, 5.2, 5.3, 7.1_
  
  - [x] 3.2 Implement local storage service
    - Implement uploadToLocal method
    - Implement deleteFromLocal method
    - Store in: `data/media/{listingId}/{filename}`
    - _Requirements: 6.2_
  
  - [x] 3.3 Implement thumbnail generation
    - Use Sharp library for image processing
    - Generate 200x200px thumbnails for photos
    - Generate video preview (first frame) for videos
    - Compress images (quality: 85%)
    - Store thumbnails: `listings/{listingId}/thumbnails/{mediaId}_thumb.jpg`
    - _Requirements: 5.5_
  
  - [x] 3.4 Write unit tests for storage service
    - Test file upload to S3
    - Test file deletion from S3
    - Test signed URL generation
    - Test thumbnail generation
    - Test local storage operations
    - _Requirements: 5.1, 5.5_


- [x] 4. File Validation Service
  - [x] 4.1 Implement file validation logic
    - Validate file type using MIME type and extension
    - Validate file size against limits (photos ≤5MB, videos ≤50MB, PDFs ≤10MB)
    - Return clear error messages for validation failures
    - _Requirements: 1.3, 1.4_
  
  - [x] 4.2 Write property test for file validation
    - **Property 1: File Size Validation**
    - Test that files exceeding size limits are rejected
    - Test that files within limits are accepted
    - **Validates: Requirements 1.3**
  
  - [x] 4.3 Write unit tests for validation edge cases
    - Test invalid MIME types
    - Test mismatched extension and MIME type
    - Test zero-byte files
    - Test corrupted files
    - _Requirements: 1.3, 1.4_


- [-] 5. Database Adapter Extensions
  - [x] 5.1 Extend PostgreSQL adapter with media operations
    - Implement createListingMedia method
    - Implement getListingMedia method
    - Implement getMediaById method
    - Implement deleteListingMedia method
    - Implement updateMediaOrder method
    - Implement setPrimaryMedia method
    - Implement getMediaCount method
    - _Requirements: 1.6, 2.6, 3.4, 8.2_
  
  - [ ] 5.2 Write property test for primary media uniqueness
    - **Property 2: Primary Media Uniqueness**
    - Test that only one media item can be primary per listing
    - Test that setting new primary removes old primary
    - **Validates: Requirements 1.7, 3.5, 8.4**
  
  - [x] 5.3 Extend SQLite adapter with media caching
    - Implement cacheListingMedia method
    - Implement getCachedListingMedia method
    - Implement deleteCachedMedia method
    - Implement queueMediaOperation method
    - Implement getPendingMediaOperations method
    - Implement deletePendingMediaOperation method
    - Implement saveLocalMediaFile method
    - Implement getLocalMediaFiles method
    - Implement updateLocalMediaStatus method
    - Implement deleteLocalMediaFile method
    - _Requirements: 6.2, 6.3, 6.5_
  
  - [ ] 5.4 Write unit tests for database operations
    - Test media CRUD operations in PostgreSQL
    - Test media caching in SQLite
    - Test pending operations queue
    - Test local file tracking
    - _Requirements: 1.6, 2.6, 3.4_


- [ ] 6. Media Service Implementation
  - [x] 6.1 Implement uploadMedia method
    - Validate file type and size
    - Check media count limit (max 10 per listing)
    - Generate thumbnail if photo or video
    - Upload file to storage (cloud or local based on connectivity)
    - Create media record in database
    - Set as primary if first photo
    - Return MediaUploadResponse
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8_
  
  - [ ] 6.2 Write property test for media count limit
    - **Property 3: Media Count Limit**
    - Test that listings cannot exceed 10 media items
    - Test that 11th upload is rejected with clear error
    - **Validates: Requirements 1.8, 2.4**
  
  - [ ] 6.3 Implement getListingMedia method
    - Fetch media from database (PostgreSQL or SQLite based on connectivity)
    - Return media sorted by display_order
    - Generate signed URLs for storage access
    - _Requirements: 4.2, 4.3_
  
  - [ ] 6.4 Implement deleteMedia method
    - Verify user owns the listing
    - Delete file from storage
    - Delete media record from database
    - If primary media deleted, set next photo as primary
    - Update listing's updated_at timestamp
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7_
  
  - [ ] 6.5 Write property test for primary media reassignment
    - **Property 4: Primary Media Reassignment on Delete**
    - Test that deleting primary photo sets next photo as primary
    - Test that deleting last photo sets primary to null
    - **Validates: Requirements 3.5, 3.6**
  
  - [ ] 6.6 Implement reorderMedia method
    - Validate all media IDs belong to the listing
    - Update display_order for each media item
    - Update listing's updated_at timestamp
    - _Requirements: 8.1, 8.2, 8.5, 8.6_
  
  - [ ] 6.7 Implement setPrimaryMedia method
    - Verify media is a photo (not video or document)
    - Set is_primary = false for current primary
    - Set is_primary = true for selected media
    - Update listing's updated_at timestamp
    - _Requirements: 8.3, 8.4_
  
  - [ ] 6.8 Write unit tests for media service
    - Test upload flow (online and offline)
    - Test delete flow (online and offline)
    - Test reorder flow
    - Test set primary flow
    - Test error handling
    - _Requirements: All_


- [ ] 7. API Controller Implementation
  - [ ] 7.1 Implement upload media endpoint
    - POST /api/marketplace/listings/:listingId/media
    - Use Multer middleware for file upload
    - Validate user owns listing
    - Call mediaService.uploadMedia
    - Return success response with media data
    - Handle errors with appropriate status codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 7.2 Implement get media endpoint
    - GET /api/marketplace/listings/:listingId/media
    - Call mediaService.getListingMedia
    - Return array of media items
    - _Requirements: 4.2_
  
  - [ ] 7.3 Implement delete media endpoint
    - DELETE /api/marketplace/listings/:listingId/media/:mediaId
    - Validate user owns listing
    - Call mediaService.deleteMedia
    - Return success response
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 7.4 Implement reorder media endpoint
    - PUT /api/marketplace/listings/:listingId/media/reorder
    - Validate user owns listing
    - Call mediaService.reorderMedia
    - Return success response
    - _Requirements: 8.1, 8.2_
  
  - [ ] 7.5 Implement set primary endpoint
    - PUT /api/marketplace/listings/:listingId/media/:mediaId/primary
    - Validate user owns listing
    - Call mediaService.setPrimaryMedia
    - Return success response
    - _Requirements: 8.3, 8.4_
  
  - [ ] 7.6 Write integration tests for API endpoints
    - Test upload endpoint with valid file
    - Test upload endpoint with invalid file
    - Test get media endpoint
    - Test delete endpoint
    - Test reorder endpoint
    - Test set primary endpoint
    - Test authentication and authorization
    - _Requirements: All_


- [ ] 8. Sync Engine Extensions
  - [ ] 8.1 Implement syncMediaOperations method
    - Fetch pending media operations from SQLite
    - Process each operation based on type
    - Retry failed operations with exponential backoff
    - Delete completed operations from queue
    - _Requirements: 2.8, 3.8, 6.3, 6.7_
  
  - [ ] 8.2 Implement syncMediaUpload method
    - Get local file from local_media_files table
    - Upload file to cloud storage
    - Create media record in PostgreSQL
    - Update local file status to 'completed'
    - Delete local file after successful upload
    - _Requirements: 6.3_
  
  - [ ] 8.3 Implement syncMediaDelete method
    - Delete media from PostgreSQL
    - Delete file from cloud storage
    - Delete cached media from SQLite
    - _Requirements: 6.5_
  
  - [ ] 8.4 Implement syncMediaReorder method
    - Update media display_order in PostgreSQL
    - Update cached media in SQLite
    - _Requirements: 8.7_
  
  - [ ] 8.5 Implement syncSetPrimary method
    - Update is_primary flags in PostgreSQL
    - Update cached media in SQLite
    - _Requirements: 8.7_
  
  - [ ] 8.6 Write property test for sync completeness
    - **Property 5: Media Sync Completeness**
    - Test that all queued operations are eventually synced
    - Test that failed operations are retried
    - Test that operations are processed in order
    - **Validates: Requirements 6.3, 6.7**
  
  - [ ] 8.7 Write unit tests for sync operations
    - Test upload sync
    - Test delete sync
    - Test reorder sync
    - Test set primary sync
    - Test retry logic
    - Test error handling
    - _Requirements: 6.3, 6.5, 6.7, 8.7_


- [ ] 9. Offline Support Implementation
  - [ ] 9.1 Implement offline upload flow
    - Detect offline state
    - Save file to local storage
    - Create entry in local_media_files table
    - Queue upload operation in pending_media_ops
    - Display "Queued for upload" status to user
    - _Requirements: 6.1, 6.2_
  
  - [ ] 9.2 Implement offline delete flow
    - Mark media as deleted in cache
    - Queue delete operation
    - Display sync status to user
    - _Requirements: 6.5_
  
  - [ ] 9.3 Implement offline reorder flow
    - Update display_order in cache
    - Queue reorder operation
    - _Requirements: 8.7_
  
  - [ ] 9.4 Implement sync status display
    - Show pending operations count
    - Show upload progress
    - Show sync errors
    - Allow manual retry
    - _Requirements: 6.6, 6.7_
  
  - [ ] 9.5 Write property test for offline queue integrity
    - **Property 6: Offline Queue Integrity**
    - Test that offline operations are queued correctly
    - Test that queue is processed when online
    - Test that operations maintain order
    - **Validates: Requirements 6.2, 6.3**


- [ ] 10. Security Implementation
  - [ ] 10.1 Implement access control
    - Verify user owns listing before upload/delete
    - Verify user can view listing before accessing media
    - _Requirements: 7.2_
  
  - [ ] 10.2 Implement signed URL generation
    - Generate signed URLs with 1-hour expiration
    - Refresh URLs when expired
    - _Requirements: 7.1_
  
  - [ ] 10.3 Implement malware scanning (optional)
    - Integrate ClamAV or similar
    - Scan files before upload
    - Reject infected files
    - _Requirements: 7.3_
  
  - [ ] 10.4 Implement rate limiting
    - Limit upload requests per user (e.g., 10 per minute)
    - Prevent DoS attacks
    - _Requirements: 7.3_
  
  - [ ] 10.5 Implement audit logging
    - Log all media access events
    - Log upload/delete operations
    - Store logs securely
    - _Requirements: 7.8_
  
  - [ ] 10.6 Write security tests
    - Test unauthorized access attempts
    - Test expired URL handling
    - Test rate limiting
    - _Requirements: 7.1, 7.2, 7.3_


- [ ] 11. UI Components (Backend Support)
  - [ ] 11.1 Update listing creation endpoint
    - Accept media files during listing creation
    - Process and upload media
    - Link media to new listing
    - _Requirements: 1.1_
  
  - [ ] 11.2 Update listing detail endpoint
    - Include media array in listing response
    - Include primary media URL
    - Generate signed URLs for all media
    - _Requirements: 4.1, 4.2_
  
  - [ ] 11.3 Update listing update endpoint
    - Preserve existing media when updating listing
    - Update listing's updated_at when media changes
    - _Requirements: 2.7, 3.7_


- [ ] 12. Performance Optimizations
  - [ ] 12.1 Implement image compression
    - Compress images before upload (quality: 85%)
    - Use WebP format when supported
    - _Requirements: 5.7_
  
  - [ ] 12.2 Implement lazy loading
    - Return media metadata without full URLs initially
    - Generate signed URLs on demand
    - _Requirements: 4.7_
  
  - [ ] 12.3 Implement caching
    - Cache media metadata in SQLite
    - Cache thumbnails locally
    - Use HTTP caching headers
    - _Requirements: 6.4_
  
  - [ ] 12.4 Implement progressive loading
    - Load thumbnails first
    - Load full images on demand
    - _Requirements: 4.7_


- [ ] 13. Error Handling and Retry Logic
  - [ ] 13.1 Implement upload retry logic
    - Retry with exponential backoff (2s, 4s, 8s)
    - Maximum 3 retry attempts
    - Notify user after max retries
    - _Requirements: 6.7_
  
  - [ ] 13.2 Implement error messages
    - Clear messages for validation errors
    - Suggestions for corrective actions
    - _Requirements: 1.4_
  
  - [ ] 13.3 Implement fallback mechanisms
    - Fallback to local storage if cloud unavailable
    - Queue for later upload
    - _Requirements: 6.2, 6.3_


- [ ] 14. Testing and Validation
  - [ ] 14.1 Run all unit tests
    - Storage service tests
    - Validation service tests
    - Database adapter tests
    - Media service tests
    - API controller tests
    - Sync engine tests
  
  - [ ] 14.2 Run all property-based tests
    - File size validation
    - Primary media uniqueness
    - Media count limit
    - Primary media reassignment
    - Sync completeness
    - Offline queue integrity
  
  - [ ] 14.3 Run integration tests
    - End-to-end upload flow (online)
    - End-to-end upload flow (offline)
    - End-to-end delete flow (online)
    - End-to-end delete flow (offline)
    - Reorder and set primary flows
    - Sync engine processing
  
  - [ ] 14.4 Manual testing
    - Test with various file types and sizes
    - Test offline scenarios
    - Test error scenarios
    - Test UI interactions


- [ ] 15. Documentation
  - [ ] 15.1 Update API documentation
    - Document all new endpoints
    - Include request/response examples
    - Document error codes
  
  - [ ] 15.2 Update database documentation
    - Document new tables and columns
    - Document indexes and constraints
    - Document triggers
  
  - [ ] 15.3 Create user guide
    - How to upload media
    - How to manage media
    - Offline behavior explanation
    - Troubleshooting common issues


- [ ] 16. Deployment
  - [ ] 16.1 Run database migrations
    - Execute PostgreSQL migration
    - Execute SQLite migration
    - Verify schema changes
  
  - [ ] 16.2 Configure AWS S3
    - Create S3 bucket
    - Configure bucket policies
    - Set up CORS rules
    - Configure lifecycle rules for cleanup
  
  - [ ] 16.3 Deploy backend changes
    - Deploy updated API endpoints
    - Deploy storage service
    - Deploy sync engine changes
  
  - [ ] 16.4 Monitor and validate
    - Monitor upload success rates
    - Monitor storage usage
    - Monitor sync queue processing
    - Check for errors in logs

