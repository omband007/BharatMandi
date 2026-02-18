---
parent_spec: bharat-mandi-main
implements_requirements: [6]
depends_on: [database-sync-postgresql-sqlite, persist-listings-transactions]
status: ready
type: feature-enhancement
---

# Requirements Document: Listing Media Support

**Parent Spec:** [Bharat Mandi](../../bharat-mandi-main/requirements.md) - Requirement 6 (Digital Mandi)  
**Depends On:** [Dual Database Sync](../database-sync-postgresql-sqlite/requirements.md), [Persist Listings & Transactions](../persist-listings-transactions/requirements.md)  
**Status:** 📝 Spec Ready

## Introduction

This feature adds comprehensive media support to marketplace listings in Bharat Mandi. Farmers can attach multiple photos, videos, and PDF documents to their produce listings to provide buyers with better visual information and supporting documentation (like quality certificates, test reports, etc.). Media can be added during listing creation or managed later through add/delete operations.

## Glossary

- **Listing**: A marketplace entry for produce that a farmer wants to sell
- **Media**: Digital files (photos, videos, PDFs) attached to a listing
- **Media_Type**: Category of media - photo, video, or document (PDF)
- **Media_Item**: Individual media file with metadata (URL, type, size, upload date)
- **Primary_Media**: The first or featured media item displayed prominently in listing previews
- **Media_Storage**: Cloud storage service (e.g., AWS S3) for storing media files
- **Media_Metadata**: Information about media files (filename, size, type, upload timestamp, URL)

## Requirements

### Requirement 1: Add Media During Listing Creation

**User Story:** As a farmer, I want to attach photos, videos, and documents when creating a listing, so that buyers can see my produce and supporting documentation.

#### Acceptance Criteria

1. WHEN a farmer creates a new listing, THE Bharat_Mandi_Platform SHALL allow uploading multiple media files
2. WHEN uploading media, THE Bharat_Mandi_Platform SHALL support photo formats (JPEG, PNG, WebP), video formats (MP4, MOV), and PDF documents
3. WHEN a farmer selects media files, THE Bharat_Mandi_Platform SHALL validate file types and sizes (photos ≤5MB, videos ≤50MB, PDFs ≤10MB)
4. WHEN media validation fails, THE Bharat_Mandi_Platform SHALL display clear error messages indicating the issue
5. WHEN media files are valid, THE Bharat_Mandi_Platform SHALL upload them to Media_Storage and generate secure URLs
6. WHEN media upload completes, THE Bharat_Mandi_Platform SHALL store Media_Metadata in the database linked to the listing
7. WHEN a listing is created with media, THE Bharat_Mandi_Platform SHALL set the first uploaded photo as Primary_Media
8. WHEN creating a listing, THE Bharat_Mandi_Platform SHALL allow farmers to upload 0 to 10 media items per listing

### Requirement 2: Add Media to Existing Listing

**User Story:** As a farmer, I want to add more photos, videos, or documents to my existing listing, so that I can provide additional information to buyers.

#### Acceptance Criteria

1. WHEN a farmer views their own listing, THE Bharat_Mandi_Platform SHALL display an "Add Media" option
2. WHEN a farmer selects "Add Media", THE Bharat_Mandi_Platform SHALL allow uploading additional media files
3. WHEN adding media to existing listing, THE Bharat_Mandi_Platform SHALL enforce the same validation rules as during creation
4. WHEN adding media, THE Bharat_Mandi_Platform SHALL prevent exceeding the maximum limit of 10 media items per listing
5. WHEN the limit is reached, THE Bharat_Mandi_Platform SHALL display a message indicating the maximum has been reached
6. WHEN new media is uploaded, THE Bharat_Mandi_Platform SHALL append it to the existing media collection
7. WHEN new media is added, THE Bharat_Mandi_Platform SHALL update the listing's last_modified timestamp
8. WHEN adding media offline, THE Bharat_Mandi_Platform SHALL queue the upload and sync when connectivity is restored

### Requirement 3: Delete Media from Listing

**User Story:** As a farmer, I want to remove photos, videos, or documents from my listing, so that I can keep my listing up-to-date and remove outdated or incorrect media.

#### Acceptance Criteria

1. WHEN a farmer views their own listing, THE Bharat_Mandi_Platform SHALL display a delete option for each media item
2. WHEN a farmer selects delete, THE Bharat_Mandi_Platform SHALL prompt for confirmation before deletion
3. WHEN deletion is confirmed, THE Bharat_Mandi_Platform SHALL remove the media file from Media_Storage
4. WHEN media is deleted, THE Bharat_Mandi_Platform SHALL remove the Media_Metadata record from the database
5. WHEN the Primary_Media is deleted, THE Bharat_Mandi_Platform SHALL automatically set the next available photo as Primary_Media
6. IF no photos remain after deletion, THE Bharat_Mandi_Platform SHALL set Primary_Media to null
7. WHEN media is deleted, THE Bharat_Mandi_Platform SHALL update the listing's last_modified timestamp
8. WHEN deleting media offline, THE Bharat_Mandi_Platform SHALL queue the deletion and sync when connectivity is restored

### Requirement 4: View and Display Media

**User Story:** As a buyer, I want to view all photos, videos, and documents attached to a listing, so that I can make informed purchase decisions.

#### Acceptance Criteria

1. WHEN a buyer views a listing, THE Bharat_Mandi_Platform SHALL display the Primary_Media prominently in the listing preview
2. WHEN a buyer opens listing details, THE Bharat_Mandi_Platform SHALL display all attached media in a gallery view
3. WHEN displaying media, THE Bharat_Mandi_Platform SHALL show photos, videos, and documents in separate sections or with clear visual indicators
4. WHEN a buyer taps on a photo, THE Bharat_Mandi_Platform SHALL open it in full-screen view with zoom capability
5. WHEN a buyer taps on a video, THE Bharat_Mandi_Platform SHALL play the video with standard playback controls
6. WHEN a buyer taps on a PDF, THE Bharat_Mandi_Platform SHALL open it in a document viewer or download it
7. WHEN displaying media, THE Bharat_Mandi_Platform SHALL show loading indicators while media is being fetched
8. WHEN media fails to load, THE Bharat_Mandi_Platform SHALL display a placeholder image or error message

### Requirement 5: Media Management and Storage

**User Story:** As the platform, I want to efficiently store and manage media files, so that the system remains performant and cost-effective.

#### Acceptance Criteria

1. WHEN media is uploaded, THE Bharat_Mandi_Platform SHALL store files in cloud storage (AWS S3 or equivalent)
2. WHEN storing media, THE Bharat_Mandi_Platform SHALL organize files by listing ID and media type
3. WHEN generating URLs, THE Bharat_Mandi_Platform SHALL create secure, time-limited signed URLs for media access
4. WHEN a listing is deleted, THE Bharat_Mandi_Platform SHALL delete all associated media files from storage
5. WHEN media is uploaded, THE Bharat_Mandi_Platform SHALL generate thumbnails for photos and video previews
6. WHEN storing metadata, THE Bharat_Mandi_Platform SHALL record filename, file size, media type, upload timestamp, and storage URL
7. WHEN media is accessed, THE Bharat_Mandi_Platform SHALL serve optimized versions based on device and network conditions
8. WHEN storage quota is exceeded, THE Bharat_Mandi_Platform SHALL notify administrators and prevent new uploads

### Requirement 6: Offline Media Support

**User Story:** As a farmer in a rural area, I want to manage listing media even when offline, so that poor connectivity doesn't prevent me from updating my listings.

#### Acceptance Criteria

1. WHERE internet connectivity is unavailable, THE Bharat_Mandi_Platform SHALL allow farmers to select media files for upload
2. WHEN media is selected offline, THE Bharat_Mandi_Platform SHALL store files locally and queue them for upload
3. WHEN connectivity is restored, THE Bharat_Mandi_Platform SHALL automatically upload queued media files
4. WHEN viewing listings offline, THE Bharat_Mandi_Platform SHALL display cached media from previous views
5. WHEN deleting media offline, THE Bharat_Mandi_Platform SHALL mark media for deletion and sync when online
6. WHEN offline operations are queued, THE Bharat_Mandi_Platform SHALL display sync status to the farmer
7. WHEN upload fails after multiple retries, THE Bharat_Mandi_Platform SHALL notify the farmer and allow manual retry
8. WHEN syncing media, THE Bharat_Mandi_Platform SHALL prioritize smaller files and photos over large videos

### Requirement 7: Media Security and Privacy

**User Story:** As a farmer, I want my listing media to be secure and only accessible to authorized users, so that my content is protected.

#### Acceptance Criteria

1. WHEN generating media URLs, THE Bharat_Mandi_Platform SHALL use signed URLs with expiration times
2. WHEN a user accesses media, THE Bharat_Mandi_Platform SHALL verify the user has permission to view the listing
3. WHEN media is uploaded, THE Bharat_Mandi_Platform SHALL scan files for malware and reject infected files
4. WHEN storing media, THE Bharat_Mandi_Platform SHALL not expose direct storage paths or bucket names
5. WHEN a listing is marked as private or deleted, THE Bharat_Mandi_Platform SHALL immediately revoke access to associated media
6. WHEN media contains sensitive information, THE Bharat_Mandi_Platform SHALL allow farmers to mark it as "private" (visible only after purchase intent)
7. WHEN media is deleted, THE Bharat_Mandi_Platform SHALL ensure complete removal from storage within 24 hours
8. WHEN media is accessed, THE Bharat_Mandi_Platform SHALL log access events for audit purposes

### Requirement 8: Media Reordering and Primary Selection

**User Story:** As a farmer, I want to reorder my listing media and choose which photo appears first, so that I can showcase my produce effectively.

#### Acceptance Criteria

1. WHEN a farmer views their listing media, THE Bharat_Mandi_Platform SHALL allow drag-and-drop reordering of media items
2. WHEN media is reordered, THE Bharat_Mandi_Platform SHALL update the display order for all viewers
3. WHEN a farmer selects a photo, THE Bharat_Mandi_Platform SHALL allow setting it as Primary_Media
4. WHEN Primary_Media is changed, THE Bharat_Mandi_Platform SHALL immediately update the listing preview
5. WHEN reordering media, THE Bharat_Mandi_Platform SHALL maintain the order across all devices
6. WHEN media order is changed, THE Bharat_Mandi_Platform SHALL update the listing's last_modified timestamp
7. WHEN reordering offline, THE Bharat_Mandi_Platform SHALL queue the change and sync when connectivity is restored
8. WHEN displaying media, THE Bharat_Mandi_Platform SHALL respect the farmer-defined order

