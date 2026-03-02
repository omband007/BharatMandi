import * as sqliteHelpers from './sqlite-helpers';
import { getSQLiteDB, openSQLiteDB } from './sqlite-config';
import type { OTPSession } from '../../features/profile/types/profile.types';
import type { User } from './db-abstraction'; // Legacy User type
import type { Listing } from '../../features/marketplace/marketplace.types';
import type { Transaction, EscrowAccount } from '../../features/transactions/transaction.types';
import type { ListingMedia, MediaOperation, MediaType, UploadStatus, PendingMediaOperation, LocalMediaFile } from '../../features/marketplace/media.types';
import type { Notification, NotificationTemplate, NotificationType, TranslationFeedback, TranslationFeedbackStats } from '../../features/notifications/notification.types';
import type { DatabaseAdapter } from './db-abstraction';

/**
 * SQLite Adapter for Bharat Mandi Application
 * Wraps existing sqlite-helpers to provide the same interface as PostgreSQLAdapter
 * Used as offline cache and fallback when PostgreSQL is unavailable
 */
export class SQLiteAdapter implements DatabaseAdapter {
  /**
   * Create a new user in SQLite
   * @param user - User object to create
   * @param pinHash - Optional hashed PIN for the user
   * @returns Created user object
   * @deprecated Use UserProfile instead of User
   */
  async createUser(user: User, pinHash?: string): Promise<User> {
    throw new Error('createUser is deprecated. Use UserProfile registration instead.');
  }

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User object or undefined if not found
   * @deprecated Use UserProfile instead of User
   */
  async getUserById(id: string): Promise<User | undefined> {
    throw new Error('getUserById is deprecated. Use UserProfile queries instead.');
  }

  /**
   * Get user by phone number
   * @param phoneNumber - User's phone number
   * @returns User object or undefined if not found
   * @deprecated Use UserProfile instead of User
   */
  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    throw new Error('getUserByPhone is deprecated. Use UserProfile queries instead.');
  }

  /**
   * Update user information
   * @param userId - User ID to update
   * @param updates - Partial user object with fields to update
   * @returns Updated user object or undefined if not found
   * @deprecated Use UserProfile instead of User
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    throw new Error('updateUser is deprecated. Use UserProfile updates instead.');
  }

  /**
   * Get all users
   * @returns Array of all users
   * @deprecated Use UserProfile instead of User
   */
  async getAllUsers(): Promise<User[]> {
    throw new Error('getAllUsers is deprecated. Use UserProfile queries instead.');
  }

  /**
   * Get user's PIN hash
   * @param phoneNumber - User's phone number
   * @returns PIN hash or undefined if not found
   * @deprecated Use UserProfile auth service instead
   */
  async getUserPinHash(phoneNumber: string): Promise<string | undefined> {
    throw new Error('getUserPinHash is deprecated. Use UserProfile auth service instead.');
  }

  /**
   * Update user's PIN
   * @param phoneNumber - User's phone number
   * @param pinHash - New hashed PIN
   * @deprecated Use UserProfile auth service instead
   */
  async updateUserPin(phoneNumber: string, pinHash: string): Promise<void> {
    throw new Error('updateUserPin is deprecated. Use UserProfile auth service instead.');
  }

  /**
   * Get failed login attempts for a user
   * @param phoneNumber - User's phone number
   * @returns Object with failed_attempts and locked_until or undefined
   * @deprecated Use UserProfile auth service instead
   */
  async getFailedAttempts(phoneNumber: string): Promise<{ failed_attempts: number; locked_until?: string } | undefined> {
    throw new Error('getFailedAttempts is deprecated. Use UserProfile auth service instead.');
  }

  /**
   * Increment failed login attempts
   * @param phoneNumber - User's phone number
   * @deprecated Use UserProfile auth service instead
   */
  async incrementFailedAttempts(phoneNumber: string): Promise<void> {
    throw new Error('incrementFailedAttempts is deprecated. Use UserProfile auth service instead.');
  }

  /**
   * Reset failed login attempts
   * @param phoneNumber - User's phone number
   * @deprecated Use UserProfile auth service instead
   */
  async resetFailedAttempts(phoneNumber: string): Promise<void> {
    throw new Error('resetFailedAttempts is deprecated. Use UserProfile auth service instead.');
  }

  /**
   * Lock user account until specified time
   * @param phoneNumber - User's phone number
   * @param lockUntil - Date until which account should be locked
   * @deprecated Use UserProfile auth service instead
   */
  async lockAccount(phoneNumber: string, lockUntil: Date): Promise<void> {
    throw new Error('lockAccount is deprecated. Use UserProfile auth service instead.');
  }

  /**
   * Create OTP session
   * @param session - OTP session object
   */
  async createOTPSession(session: OTPSession): Promise<void> {
    return await sqliteHelpers.createOTPSession(session);
  }

  /**
   * Get OTP session for a phone number
   * @param phoneNumber - User's phone number
   * @returns OTP session or undefined if not found
   */
  async getOTPSession(phoneNumber: string): Promise<OTPSession | undefined> {
    return await sqliteHelpers.getOTPSession(phoneNumber);
  }

  /**
   * Update OTP attempts
   * @param phoneNumber - User's phone number
   * @param attempts - New attempts count
   */
  async updateOTPAttempts(phoneNumber: string, attempts: number): Promise<void> {
    return await sqliteHelpers.updateOTPAttempts(phoneNumber, attempts);
  }

  /**
   * Delete OTP session
   * @param phoneNumber - User's phone number
   */
  async deleteOTPSession(phoneNumber: string): Promise<void> {
    return await sqliteHelpers.deleteOTPSession(phoneNumber);
  }

  // ============================================================================
  // Listing Operations
  // ============================================================================

  async createListing(listing: Listing): Promise<Listing> {
    return await sqliteHelpers.createListing(listing);
  }

  async getListing(id: string): Promise<Listing | undefined> {
    return await sqliteHelpers.getListing(id);
  }

  async getActiveListings(): Promise<Listing[]> {
    return await sqliteHelpers.getActiveListings();
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    return await sqliteHelpers.updateListing(id, updates);
  }

  // ============================================================================
  // Transaction Operations
  // ============================================================================

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    return await sqliteHelpers.createTransaction(transaction);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return await sqliteHelpers.getTransaction(id);
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    return await sqliteHelpers.updateTransaction(id, updates);
  }

  // ============================================================================
  // Escrow Operations
  // ============================================================================

  async createEscrow(escrow: EscrowAccount): Promise<EscrowAccount> {
    return await sqliteHelpers.createEscrow(escrow);
  }

  async getEscrow(id: string): Promise<EscrowAccount | undefined> {
    return await sqliteHelpers.getEscrow(id);
  }

  async getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined> {
    return await sqliteHelpers.getEscrowByTransaction(transactionId);
  }

  async updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined> {
    return await sqliteHelpers.updateEscrow(id, updates);
  }

  // ============================================================================
  // Listing Media Operations (Cache)
  // ============================================================================

  /**
   * Cache listing media in SQLite
   * @param media - Media object to cache
   * @returns Cached media object
   */
  async cacheListingMedia(media: ListingMedia): Promise<ListingMedia> {
    const db = getSQLiteDB();
    
    await db.run(
      `INSERT OR REPLACE INTO listing_media_cache (
        id, listing_id, media_type, file_name, file_size, mime_type,
        storage_url, thumbnail_url, display_order, is_primary, uploaded_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        media.id,
        media.listingId,
        media.mediaType,
        media.fileName,
        media.fileSize,
        media.mimeType,
        media.storageUrl,
        media.thumbnailUrl || null,
        media.displayOrder,
        media.isPrimary ? 1 : 0,
        media.uploadedAt.toISOString(),
        media.createdAt.toISOString(),
        media.updatedAt.toISOString()
      ]
    );
    
    return media;
  }

  /**
   * Get cached listing media from SQLite
   * @param listingId - Listing ID
   * @returns Array of cached media items
   */
  async getCachedListingMedia(listingId: string): Promise<ListingMedia[]> {
    const db = getSQLiteDB();
    const rows = await db.all(
      'SELECT * FROM listing_media_cache WHERE listing_id = ? ORDER BY display_order ASC',
      [listingId]
    );
    
    return rows.map(row => this.mapRowToListingMedia(row));
  }

  /**
   * Delete cached media from SQLite
   * @param mediaId - Media ID to delete
   * @returns true if deleted, false otherwise
   */
  async deleteCachedMedia(mediaId: string): Promise<boolean> {
    const db = getSQLiteDB();
    const result = await db.run(
      'DELETE FROM listing_media_cache WHERE id = ?',
      [mediaId]
    );
    
    return (result.changes || 0) > 0;
  }

  /**
   * Queue a media operation for later sync
   * @param operation - Operation details
   * @returns Operation ID
   */
  async queueMediaOperation(operation: {
    operationType: MediaOperation;
    listingId: string;
    mediaId?: string;
    filePath?: string;
    metadata?: any;
  }): Promise<number> {
    const db = getSQLiteDB();
    const result = await db.run(
      `INSERT INTO pending_media_ops (
        operation_type, listing_id, media_id, file_path, metadata, retry_count, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [
        operation.operationType,
        operation.listingId,
        operation.mediaId || null,
        operation.filePath || null,
        operation.metadata ? JSON.stringify(operation.metadata) : null,
        new Date().toISOString()
      ]
    );
    
    return result.lastID || 0;
  }

  /**
   * Get pending media operations from queue
   * @returns Array of pending operations
   */
  async getPendingMediaOperations(): Promise<PendingMediaOperation[]> {
    const db = getSQLiteDB();
    const rows = await db.all(
      'SELECT * FROM pending_media_ops ORDER BY created_at ASC'
    );
    
    return rows.map(row => ({
      id: row.id,
      operationType: row.operation_type as MediaOperation,
      listingId: row.listing_id,
      mediaId: row.media_id || undefined,
      filePath: row.file_path || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      retryCount: row.retry_count,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Delete a pending media operation from queue
   * @param operationId - Operation ID to delete
   * @returns true if deleted, false otherwise
   */
  async deletePendingMediaOperation(operationId: number): Promise<boolean> {
    const db = getSQLiteDB();
    const result = await db.run(
      'DELETE FROM pending_media_ops WHERE id = ?',
      [operationId]
    );
    
    return (result.changes || 0) > 0;
  }

  /**
   * Save local media file for offline upload
   * @param localFile - Local file details
   * @returns Saved local file object
   */
  async saveLocalMediaFile(localFile: LocalMediaFile): Promise<LocalMediaFile> {
    const db = getSQLiteDB();
    
    await db.run(
      `INSERT INTO local_media_files (
        id, listing_id, local_file_path, media_type, file_name,
        file_size, mime_type, upload_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localFile.id,
        localFile.listingId,
        localFile.localFilePath,
        localFile.mediaType,
        localFile.fileName,
        localFile.fileSize,
        localFile.mimeType,
        localFile.uploadStatus,
        localFile.createdAt.toISOString()
      ]
    );
    
    return localFile;
  }

  /**
   * Get local media files for a listing
   * @param listingId - Listing ID
   * @returns Array of local media files
   */
  async getLocalMediaFiles(listingId: string): Promise<LocalMediaFile[]> {
    const db = getSQLiteDB();
    const rows = await db.all(
      'SELECT * FROM local_media_files WHERE listing_id = ?',
      [listingId]
    );
    
    return rows.map(row => ({
      id: row.id,
      listingId: row.listing_id,
      localFilePath: row.local_file_path,
      mediaType: row.media_type as MediaType,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadStatus: row.upload_status as UploadStatus,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Update local media file upload status
   * @param fileId - File ID
   * @param status - New upload status
   * @returns true if updated, false otherwise
   */
  async updateLocalMediaStatus(fileId: string, status: UploadStatus): Promise<boolean> {
    const db = getSQLiteDB();
    const result = await db.run(
      'UPDATE local_media_files SET upload_status = ? WHERE id = ?',
      [status, fileId]
    );
    
    return (result.changes || 0) > 0;
  }

  /**
   * Delete local media file
   * @param fileId - File ID to delete
   * @returns true if deleted, false otherwise
   */
  async deleteLocalMediaFile(fileId: string): Promise<boolean> {
    const db = getSQLiteDB();
    const result = await db.run(
      'DELETE FROM local_media_files WHERE id = ?',
      [fileId]
    );
    
    return (result.changes || 0) > 0;
  }

  /**
   * Map database row to ListingMedia object
   * @param row - Database row
   * @returns ListingMedia object
   */
  private mapRowToListingMedia(row: any): ListingMedia {
    return {
      id: row.id,
      listingId: row.listing_id,
      mediaType: row.media_type as MediaType,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      storageUrl: row.storage_url,
      thumbnailUrl: row.thumbnail_url || undefined,
      displayOrder: row.display_order,
      isPrimary: row.is_primary === 1,
      uploadedAt: new Date(row.uploaded_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Execute raw SQL query (for development/admin operations)
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Query result
   */
  async run(sql: string, params?: any[]): Promise<any> {
    const db = await openSQLiteDB();
    return new Promise((resolve, reject) => {
      db.run(sql, params || [], function(this: any, err: any) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }

  /**
   * Get single row from SQLite (for development/admin operations)
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Single row result
   */
  async get(sql: string, params?: any[]): Promise<any> {
    const db = await openSQLiteDB();
    return new Promise((resolve, reject) => {
      db.get(sql, params || [], (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // ============================================================================
  // Notification Operations (Stubs - SQLite cache not implemented yet)
  // ============================================================================

  async createNotification(notification: Notification): Promise<Notification> {
    console.warn('[SQLiteAdapter] Notification operations not implemented in SQLite cache');
    return notification;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    console.warn('[SQLiteAdapter] Notification operations not implemented in SQLite cache');
    return undefined;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    console.warn('[SQLiteAdapter] Notification operations not implemented in SQLite cache');
    return [];
  }

  async updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | undefined> {
    console.warn('[SQLiteAdapter] Notification operations not implemented in SQLite cache');
    return undefined;
  }

  async getNotificationTemplate(type: NotificationType, language: string): Promise<NotificationTemplate | undefined> {
    console.warn('[SQLiteAdapter] Notification template operations not implemented in SQLite cache');
    return undefined;
  }

  // ============================================================================
  // Translation Feedback Operations (Stubs - SQLite cache not implemented yet)
  // ============================================================================

  async createTranslationFeedback(feedback: Omit<TranslationFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<TranslationFeedback> {
    console.warn('[SQLiteAdapter] Translation feedback operations not implemented in SQLite cache');
    const now = new Date();
    return {
      ...feedback,
      id: `temp-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    } as TranslationFeedback;
  }

  async getTranslationFeedback(id: string): Promise<TranslationFeedback | undefined> {
    console.warn('[SQLiteAdapter] Translation feedback operations not implemented in SQLite cache');
    return undefined;
  }

  async getTranslationFeedbackStats(targetLanguage?: string): Promise<TranslationFeedbackStats> {
    console.warn('[SQLiteAdapter] Translation feedback operations not implemented in SQLite cache');
    return {
      totalFeedback: 0,
      byLanguage: {},
      byType: {} as any,
      byStatus: {} as any
    };
  }

  async updateTranslationFeedback(id: string, updates: Partial<TranslationFeedback>): Promise<TranslationFeedback | undefined> {
    console.warn('[SQLiteAdapter] Translation feedback operations not implemented in SQLite cache');
    return undefined;
  }
}
