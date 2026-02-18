---
parent_spec: bharat-mandi-main
implements_requirements: [6]
depends_on: [database-sync-postgresql-sqlite, persist-listings-transactions]
status: ready
type: feature-enhancement
---

# Design Document: Listing Media Support

**Parent Spec:** [Bharat Mandi Design](../bharat-mandi/design.md)  
**Related Requirements:** [Listing Media Support Requirements](./requirements.md)  
**Depends On:** [Dual Database Sync Design](../database-sync-postgresql-sqlite/design.md), [Persist Listings Design](../persist-listings-transactions/design.md)  
**Status:** 📝 Spec Ready

## Overview

This document outlines the design for adding comprehensive media support to marketplace listings. The feature enables farmers to attach photos, videos, and PDF documents to their listings, with full CRUD operations (create, read, update, delete) and offline support through the existing dual database architecture.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Marketplace Listing                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │  Listing   │  │   Media    │  │   Media Storage        │ │
│  │   Data     │──│ Management │──│   (AWS S3 / Local)     │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Dual Database Architecture                      │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │   PostgreSQL         │    │      SQLite              │  │
│  │  - listing_media     │◄──►│  - listing_media_cache   │  │
│  │  - metadata          │    │  - pending_media_ops     │  │
│  └──────────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sync Engine                               │
│  - Upload queued media files                                 │
│  - Sync metadata changes                                     │
│  - Delete media from storage                                 │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### PostgreSQL Schema

```sql
-- Media table for listing attachments
CREATE TABLE listing_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('photo', 'video', 'document')),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_listing_media_listing_id ON listing_media(listing_id);
CREATE INDEX idx_listing_media_type ON listing_media(media_type);
CREATE INDEX idx_listing_media_primary ON listing_media(listing_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_listing_media_order ON listing_media(listing_id, display_order);

-- Ensure only one primary media per listing
CREATE UNIQUE INDEX idx_one_primary_per_listing ON listing_media(listing_id) WHERE is_primary = TRUE;

-- Trigger to update listing's updated_at when media changes
CREATE OR REPLACE FUNCTION update_listing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE listings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.listing_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_on_media_change
AFTER INSERT OR UPDATE OR DELETE ON listing_media
FOR EACH ROW
EXECUTE FUNCTION update_listing_timestamp();
```

### SQLite Schema

```sql
-- Cached media metadata
CREATE TABLE listing_media_cache (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'document')),
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER DEFAULT 0,
    uploaded_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES cached_listings(id) ON DELETE CASCADE
);

-- Pending media operations queue
CREATE TABLE pending_media_ops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('upload', 'delete', 'reorder', 'set_primary')),
    listing_id TEXT NOT NULL,
    media_id TEXT,
    file_path TEXT,
    metadata TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Local file storage for offline uploads
CREATE TABLE local_media_files (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    local_file_path TEXT NOT NULL,
    media_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_media_cache_listing ON listing_media_cache(listing_id);
CREATE INDEX idx_pending_media_ops_listing ON pending_media_ops(listing_id);
CREATE INDEX idx_local_media_listing ON local_media_files(listing_id);
CREATE INDEX idx_local_media_status ON local_media_files(upload_status);
```

## Data Models

### TypeScript Interfaces

```typescript
// Media types
export type MediaType = 'photo' | 'video' | 'document';
export type MediaOperation = 'upload' | 'delete' | 'reorder' | 'set_primary';
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

// Media item interface
export interface ListingMedia {
  id: string;
  listingId: string;
  mediaType: MediaType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  thumbnailUrl?: string;
  displayOrder: number;
  isPrimary: boolean;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Media upload request
export interface MediaUploadRequest {
  listingId: string;
  file: File | Buffer;
  mediaType: MediaType;
  fileName: string;
  mimeType: string;
}

// Media upload response
export interface MediaUploadResponse {
  mediaId: string;
  storageUrl: string;
  thumbnailUrl?: string;
  success: boolean;
  error?: string;
}

// Pending media operation
export interface PendingMediaOperation {
  id: number;
  operationType: MediaOperation;
  listingId: string;
  mediaId?: string;
  filePath?: string;
  metadata?: any;
  retryCount: number;
  createdAt: Date;
}

// Local media file
export interface LocalMediaFile {
  id: string;
  listingId: string;
  localFilePath: string;
  mediaType: MediaType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadStatus: UploadStatus;
  createdAt: Date;
}
```

## API Design

### REST Endpoints

```typescript
// Upload media to listing
POST /api/marketplace/listings/:listingId/media
Content-Type: multipart/form-data
Body: {
  file: File,
  mediaType: 'photo' | 'video' | 'document'
}
Response: {
  success: boolean,
  media: ListingMedia,
  error?: string
}

// Get all media for a listing
GET /api/marketplace/listings/:listingId/media
Response: {
  success: boolean,
  media: ListingMedia[],
  error?: string
}

// Delete media from listing
DELETE /api/marketplace/listings/:listingId/media/:mediaId
Response: {
  success: boolean,
  error?: string
}

// Reorder media
PUT /api/marketplace/listings/:listingId/media/reorder
Body: {
  mediaOrder: { mediaId: string, displayOrder: number }[]
}
Response: {
  success: boolean,
  error?: string
}

// Set primary media
PUT /api/marketplace/listings/:listingId/media/:mediaId/primary
Response: {
  success: boolean,
  error?: string
}
```

## Service Layer Design

### MediaService

```typescript
class MediaService {
  // Upload media file
  async uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse>
  
  // Get all media for a listing
  async getListingMedia(listingId: string): Promise<ListingMedia[]>
  
  // Delete media
  async deleteMedia(listingId: string, mediaId: string): Promise<boolean>
  
  // Reorder media
  async reorderMedia(listingId: string, mediaOrder: { mediaId: string, displayOrder: number }[]): Promise<boolean>
  
  // Set primary media
  async setPrimaryMedia(listingId: string, mediaId: string): Promise<boolean>
  
  // Validate media file
  private validateMediaFile(file: File | Buffer, mediaType: MediaType): { valid: boolean, error?: string }
  
  // Generate thumbnail
  private async generateThumbnail(file: Buffer, mediaType: MediaType): Promise<Buffer>
}
```

### StorageService

```typescript
class StorageService {
  // Upload file to cloud storage
  async uploadFile(file: Buffer, key: string, mimeType: string): Promise<string>
  
  // Delete file from cloud storage
  async deleteFile(key: string): Promise<boolean>
  
  // Generate signed URL
  async generateSignedUrl(key: string, expiresIn: number): Promise<string>
  
  // Upload to local storage (offline)
  async uploadToLocal(file: Buffer, path: string): Promise<string>
  
  // Delete from local storage
  async deleteFromLocal(path: string): Promise<boolean>
}
```

## Database Adapter Extensions

### PostgreSQL Adapter

```typescript
// Add to PostgreSQLAdapter class
async createListingMedia(media: Omit<ListingMedia, 'id' | 'createdAt' | 'updatedAt'>): Promise<ListingMedia>
async getListingMedia(listingId: string): Promise<ListingMedia[]>
async getMediaById(mediaId: string): Promise<ListingMedia | null>
async deleteListingMedia(mediaId: string): Promise<boolean>
async updateMediaOrder(listingId: string, mediaOrder: { mediaId: string, displayOrder: number }[]): Promise<boolean>
async setPrimaryMedia(listingId: string, mediaId: string): Promise<boolean>
async getMediaCount(listingId: string): Promise<number>
```

### SQLite Adapter

```typescript
// Add to SQLiteAdapter class
async cacheListingMedia(media: ListingMedia): Promise<void>
async getCachedListingMedia(listingId: string): Promise<ListingMedia[]>
async deleteCachedMedia(mediaId: string): Promise<boolean>
async queueMediaOperation(operation: Omit<PendingMediaOperation, 'id' | 'createdAt'>): Promise<number>
async getPendingMediaOperations(): Promise<PendingMediaOperation[]>
async deletePendingMediaOperation(id: number): Promise<boolean>
async saveLocalMediaFile(file: LocalMediaFile): Promise<void>
async getLocalMediaFiles(listingId: string): Promise<LocalMediaFile[]>
async updateLocalMediaStatus(id: string, status: UploadStatus): Promise<boolean>
async deleteLocalMediaFile(id: string): Promise<boolean>
```

## Sync Engine Extensions

### Media Sync Logic

```typescript
// Add to SyncEngine class
async syncMediaOperations(): Promise<void> {
  const pendingOps = await this.sqliteAdapter.getPendingMediaOperations();
  
  for (const op of pendingOps) {
    try {
      switch (op.operationType) {
        case 'upload':
          await this.syncMediaUpload(op);
          break;
        case 'delete':
          await this.syncMediaDelete(op);
          break;
        case 'reorder':
          await this.syncMediaReorder(op);
          break;
        case 'set_primary':
          await this.syncSetPrimary(op);
          break;
      }
      
      await this.sqliteAdapter.deletePendingMediaOperation(op.id);
    } catch (error) {
      // Increment retry count
      if (op.retryCount < 3) {
        // Will retry later
      } else {
        // Max retries reached, log error
        console.error(`Media sync failed after 3 retries:`, error);
      }
    }
  }
}

private async syncMediaUpload(op: PendingMediaOperation): Promise<void> {
  // Get local file
  const localFile = await this.sqliteAdapter.getLocalMediaFiles(op.listingId);
  
  // Upload to cloud storage
  const storageUrl = await this.storageService.uploadFile(/* ... */);
  
  // Create media record in PostgreSQL
  await this.pgAdapter.createListingMedia(/* ... */);
  
  // Update local status
  await this.sqliteAdapter.updateLocalMediaStatus(localFile.id, 'completed');
  
  // Delete local file
  await this.sqliteAdapter.deleteLocalMediaFile(localFile.id);
}

private async syncMediaDelete(op: PendingMediaOperation): Promise<void> {
  // Delete from PostgreSQL
  await this.pgAdapter.deleteListingMedia(op.mediaId!);
  
  // Delete from storage
  await this.storageService.deleteFile(/* storage key */);
  
  // Delete from cache
  await this.sqliteAdapter.deleteCachedMedia(op.mediaId!);
}
```

## File Validation Rules

### Size Limits
- Photos: Maximum 5MB
- Videos: Maximum 50MB
- Documents (PDF): Maximum 10MB

### Supported Formats
- Photos: JPEG (.jpg, .jpeg), PNG (.png), WebP (.webp)
- Videos: MP4 (.mp4), MOV (.mov)
- Documents: PDF (.pdf)

### MIME Types
```typescript
const ALLOWED_MIME_TYPES = {
  photo: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime'],
  document: ['application/pdf']
};

const MAX_FILE_SIZES = {
  photo: 5 * 1024 * 1024,      // 5MB
  video: 50 * 1024 * 1024,     // 50MB
  document: 10 * 1024 * 1024   // 10MB
};
```

## Storage Strategy

### Cloud Storage (Online)
- Use AWS S3 or compatible service
- Organize by: `listings/{listingId}/media/{mediaId}.{ext}`
- Generate thumbnails: `listings/{listingId}/thumbnails/{mediaId}_thumb.jpg`
- Use signed URLs with 1-hour expiration
- Enable CDN for faster delivery

### Local Storage (Offline)
- Store in app's local directory: `data/media/{listingId}/{filename}`
- Queue for upload when connectivity restored
- Delete after successful upload
- Compress images before storing locally

## Offline Behavior

### Upload Flow (Offline)
1. User selects media file
2. Validate file type and size
3. Save file to local storage
4. Create entry in `local_media_files` table
5. Create entry in `pending_media_ops` queue
6. Display "Queued for upload" status to user
7. When online, sync engine processes queue
8. Upload to cloud storage
9. Create record in PostgreSQL
10. Delete local file
11. Update UI

### Delete Flow (Offline)
1. User deletes media
2. Mark media as deleted in cache
3. Queue delete operation
4. When online, delete from PostgreSQL and storage
5. Remove from cache

## Security Considerations

### File Upload Security
- Validate file types using MIME type and file extension
- Scan files for malware (integrate ClamAV or similar)
- Limit file sizes to prevent DoS attacks
- Use signed URLs to prevent unauthorized access
- Implement rate limiting on upload endpoints

### Access Control
- Only listing owner can add/delete media
- All users can view media for active listings
- Revoke access when listing is deleted or made private
- Log all media access for audit trail

## Performance Optimizations

### Image Optimization
- Generate thumbnails (200x200px) for photos
- Generate video previews (first frame as thumbnail)
- Compress images before upload (quality: 85%)
- Use WebP format when supported
- Lazy load media in gallery view

### Caching Strategy
- Cache media metadata in SQLite
- Cache thumbnails locally for offline viewing
- Use HTTP caching headers (Cache-Control, ETag)
- Implement progressive image loading

## Error Handling

### Upload Failures
- Retry with exponential backoff (2s, 4s, 8s)
- Maximum 3 retry attempts
- Notify user after max retries
- Allow manual retry from UI

### Storage Failures
- Fallback to local storage if cloud unavailable
- Queue for later upload
- Display sync status to user

### Validation Errors
- Display clear error messages
- Suggest corrective actions (e.g., "File too large, please compress")
- Allow user to select different file

## Testing Strategy

### Unit Tests
- File validation logic
- Thumbnail generation
- URL signing
- Media ordering logic

### Integration Tests
- Upload flow (online and offline)
- Delete flow (online and offline)
- Sync engine media operations
- Database operations

### Property-Based Tests
- Media count limits (max 10 per listing)
- Primary media uniqueness
- Display order consistency
- File size validation

## Migration Plan

### Database Migration
1. Create `listing_media` table in PostgreSQL
2. Create cache tables in SQLite
3. Add indexes for performance
4. Create triggers for timestamp updates

### Data Migration
- No existing data to migrate (new feature)
- Existing listings will have zero media initially

### Rollout Strategy
1. Deploy database schema changes
2. Deploy backend API endpoints
3. Deploy frontend UI components
4. Enable feature flag for gradual rollout
5. Monitor performance and errors
6. Full rollout after validation

## Future Enhancements

### Phase 2 Features
- Video compression before upload
- Multiple thumbnail sizes for responsive design
- Image editing (crop, rotate, filters)
- Bulk upload (select multiple files at once)
- Media analytics (view counts, engagement)
- AI-powered image tagging and search
- Support for more document types (Word, Excel)
- Media watermarking for copyright protection

