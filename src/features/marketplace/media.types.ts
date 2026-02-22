// Media types for marketplace listings

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
  file: Buffer;
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
