import { pool } from './pg-config';
import type { OTPSession } from '../../features/profile/types/profile.types';
import type { User } from './db-abstraction'; // Legacy User type
import type { Listing } from '../../features/marketplace/marketplace.types';
import type { ListingMedia } from '../../features/marketplace/media.types';
import type { Transaction, EscrowAccount } from '../../features/transactions/transaction.types';
import type { Notification, NotificationTemplate, NotificationType, TranslationFeedback, TranslationFeedbackStats, FeedbackType, FeedbackStatus } from '../../features/notifications/notification.types';
import type { DatabaseAdapter } from './db-abstraction';

/**
 * PostgreSQL Adapter for Bharat Mandi Application
 * Implements database operations for PostgreSQL as the primary database
 */
export class PostgreSQLAdapter implements DatabaseAdapter {
  /**
   * Create a new user in PostgreSQL
   * @param user - User object to create
   * @param pinHash - Optional hashed PIN for the user
   * @returns Created user object
   */
  async createUser(user: User, pinHash?: string): Promise<User> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO users (
          id, phone_number, name, user_type, location, bank_account, 
          pin_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          user.id,
          user.phoneNumber,
          user.name,
          user.userType,
          JSON.stringify(user.location),
          user.bankAccount ? JSON.stringify(user.bankAccount) : null,
          pinHash,
          user.createdAt,
          user.updatedAt || user.createdAt
        ]
      );
      return this.mapRowToUser(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User object or undefined if not found
   */
  async getUserById(id: string): Promise<User | undefined> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : undefined;
  }

  /**
   * Get user by phone number
   * @param phoneNumber - User's phone number
   * @returns User object or undefined if not found
   */
  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : undefined;
  }

  /**
   * Update user information
   * @param userId - User ID to update
   * @param updates - Partial user object with fields to update
   * @returns Updated user object or undefined if not found
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.phoneNumber !== undefined) {
      fields.push(`phone_number = $${paramIndex++}`);
      values.push(updates.phoneNumber);
    }
    if (updates.userType !== undefined) {
      fields.push(`user_type = $${paramIndex++}`);
      values.push(updates.userType);
    }
    if (updates.location !== undefined) {
      fields.push(`location = $${paramIndex++}`);
      values.push(JSON.stringify(updates.location));
    }
    if (updates.bankAccount !== undefined) {
      fields.push(`bank_account = $${paramIndex++}`);
      values.push(JSON.stringify(updates.bankAccount));
    }

    if (fields.length === 0) {
      return this.getUserById(userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : undefined;
  }

  /**
   * Get all users
   * @returns Array of all users
   */
  async getAllUsers(): Promise<User[]> {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows.map(row => this.mapRowToUser(row));
  }

  /**
   * Get user's PIN hash
   * @param phoneNumber - User's phone number
   * @returns PIN hash or undefined if not found
   */
  async getUserPinHash(phoneNumber: string): Promise<string | undefined> {
    const result = await pool.query(
      'SELECT pin_hash FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    return result.rows[0]?.pin_hash;
  }

  /**
   * Update user's PIN
   * @param phoneNumber - User's phone number
   * @param pinHash - New hashed PIN
   */
  async updateUserPin(phoneNumber: string, pinHash: string): Promise<void> {
    await pool.query(
      'UPDATE users SET pin_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $2',
      [pinHash, phoneNumber]
    );
  }

  /**
   * Get failed login attempts for a user
   * @param phoneNumber - User's phone number
   * @returns Object with failed_attempts and locked_until or undefined
   */
  async getFailedAttempts(phoneNumber: string): Promise<{ failed_attempts: number; locked_until?: string } | undefined> {
    const result = await pool.query(
      'SELECT failed_attempts, locked_until FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    if (!result.rows[0]) return undefined;
    
    return {
      failed_attempts: result.rows[0].failed_attempts,
      locked_until: result.rows[0].locked_until ? result.rows[0].locked_until.toISOString() : undefined
    };
  }

  /**
   * Increment failed login attempts
   * @param phoneNumber - User's phone number
   */
  async incrementFailedAttempts(phoneNumber: string): Promise<void> {
    await pool.query(
      'UPDATE users SET failed_attempts = failed_attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $1',
      [phoneNumber]
    );
  }

  /**
   * Reset failed login attempts
   * @param phoneNumber - User's phone number
   */
  async resetFailedAttempts(phoneNumber: string): Promise<void> {
    await pool.query(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $1',
      [phoneNumber]
    );
  }

  /**
   * Lock user account until specified time
   * @param phoneNumber - User's phone number
   * @param lockUntil - Date until which account should be locked
   */
  async lockAccount(phoneNumber: string, lockUntil: Date): Promise<void> {
    await pool.query(
      'UPDATE users SET locked_until = $1, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $2',
      [lockUntil, phoneNumber]
    );
  }

  /**
   * Create OTP session
   * @param session - OTP session object
   */
  async createOTPSession(session: OTPSession): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Delete existing sessions for this phone number
      await client.query('DELETE FROM otp_sessions WHERE phone_number = $1', [session.phoneNumber]);
      // Insert new session
      await client.query(
        'INSERT INTO otp_sessions (phone_number, otp, expires_at, attempts) VALUES ($1, $2, $3, $4)',
        [session.phoneNumber, session.otp, session.expiresAt, session.attempts]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get OTP session for a phone number
   * @param phoneNumber - User's phone number
   * @returns OTP session or undefined if not found
   */
  async getOTPSession(phoneNumber: string): Promise<OTPSession | undefined> {
    const result = await pool.query(
      'SELECT * FROM otp_sessions WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1',
      [phoneNumber]
    );
    if (!result.rows[0]) return undefined;
    
    const row = result.rows[0];
    return {
      phoneNumber: row.phone_number,
      otp: row.otp,
      expiresAt: new Date(row.expires_at),
      attempts: row.attempts
    };
  }

  /**
   * Update OTP attempts
   * @param phoneNumber - User's phone number
   * @param attempts - New attempts count
   */
  async updateOTPAttempts(phoneNumber: string, attempts: number): Promise<void> {
    await pool.query(
      'UPDATE otp_sessions SET attempts = $1 WHERE phone_number = $2',
      [attempts, phoneNumber]
    );
  }

  /**
   * Delete OTP session
   * @param phoneNumber - User's phone number
   */
  async deleteOTPSession(phoneNumber: string): Promise<void> {
    await pool.query(
      'DELETE FROM otp_sessions WHERE phone_number = $1',
      [phoneNumber]
    );
  }

  /**
   * Check PostgreSQL connection health
   * @returns true if connection is healthy, false otherwise
   */
  async checkConnection(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT 1');
      return result.rowCount === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper method to map PostgreSQL row to User object
   * @param row - Database row
   * @returns User object
   */
  private mapRowToUser(row: any): User {
    // PostgreSQL JSONB columns return objects directly, not strings
    // Only parse if it's actually a string (shouldn't happen with JSONB)
    let location = row.location;
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        console.error('Error parsing location JSON:', e);
        location = { address: '', latitude: 0, longitude: 0 };
      }
    }

    let bankAccount = row.bank_account;
    if (bankAccount && typeof bankAccount === 'string') {
      try {
        bankAccount = JSON.parse(bankAccount);
      } catch (e) {
        console.error('Error parsing bank_account JSON:', e);
        bankAccount = undefined;
      }
    }

    return {
      id: row.id,
      phoneNumber: row.phone_number,
      name: row.name,
      userType: row.user_type,
      location,
      bankAccount,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }

  // ============================================================================
  // Listing Operations
  // ============================================================================

  async createListing(listing: Listing): Promise<Listing> {
    const result = await pool.query(
      `INSERT INTO listings (
        id, farmer_id, produce_type, quantity, price_per_kg, 
        certificate_id, expected_harvest_date, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        listing.id,
        listing.farmerId,
        listing.produceType,
        listing.quantity,
        listing.pricePerKg,
        listing.certificateId,
        listing.expectedHarvestDate || null,
        listing.isActive,
        listing.createdAt
      ]
    );
    return this.mapRowToListing(result.rows[0]);
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const result = await pool.query(
      'SELECT * FROM listings WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToListing(result.rows[0]) : undefined;
  }

  async getActiveListings(): Promise<Listing[]> {
    const result = await pool.query(
      'SELECT * FROM listings WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows.map(row => this.mapRowToListing(row));
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.quantity !== undefined) {
      fields.push(`quantity = $${paramIndex++}`);
      values.push(updates.quantity);
    }
    if (updates.pricePerKg !== undefined) {
      fields.push(`price_per_kg = $${paramIndex++}`);
      values.push(updates.pricePerKg);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    if (updates.expectedHarvestDate !== undefined) {
      fields.push(`expected_harvest_date = $${paramIndex++}`);
      values.push(updates.expectedHarvestDate);
    }

    if (fields.length === 0) return this.getListing(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE listings SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapRowToListing(result.rows[0]) : undefined;
  }

  private mapRowToListing(row: any): Listing {
    return {
      id: row.id,
      farmerId: row.farmer_id,
      produceType: row.produce_type,
      quantity: parseFloat(row.quantity),
      pricePerKg: parseFloat(row.price_per_kg),
      certificateId: row.certificate_id,
      expectedHarvestDate: row.expected_harvest_date ? new Date(row.expected_harvest_date) : undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at)
    };
  }

  // ============================================================================
  // Transaction Operations
  // ============================================================================

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    const result = await pool.query(
      `INSERT INTO transactions (
        id, listing_id, farmer_id, buyer_id, amount, status, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        transaction.id,
        transaction.listingId,
        transaction.farmerId,
        transaction.buyerId,
        transaction.amount,
        transaction.status,
        transaction.createdAt,
        transaction.updatedAt
      ]
    );
    return this.mapRowToTransaction(result.rows[0]);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToTransaction(result.rows[0]) : undefined;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.dispatchedAt !== undefined) {
      fields.push(`dispatched_at = $${paramIndex++}`);
      values.push(updates.dispatchedAt);
    }
    if (updates.deliveredAt !== undefined) {
      fields.push(`delivered_at = $${paramIndex++}`);
      values.push(updates.deliveredAt);
    }
    if (updates.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completedAt);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapRowToTransaction(result.rows[0]) : undefined;
  }

  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      listingId: row.listing_id,
      farmerId: row.farmer_id,
      buyerId: row.buyer_id,
      amount: parseFloat(row.amount),
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      dispatchedAt: row.dispatched_at ? new Date(row.dispatched_at) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }

  // ============================================================================
  // Escrow Operations
  // ============================================================================

  async createEscrow(escrow: EscrowAccount): Promise<EscrowAccount> {
    const result = await pool.query(
      `INSERT INTO escrow_accounts (
        id, transaction_id, amount, status, is_locked, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        escrow.id,
        escrow.transactionId,
        escrow.amount,
        escrow.status,
        escrow.isLocked,
        escrow.createdAt
      ]
    );
    return this.mapRowToEscrow(result.rows[0]);
  }

  async getEscrow(id: string): Promise<EscrowAccount | undefined> {
    const result = await pool.query(
      'SELECT * FROM escrow_accounts WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToEscrow(result.rows[0]) : undefined;
  }

  async getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined> {
    const result = await pool.query(
      'SELECT * FROM escrow_accounts WHERE transaction_id = $1',
      [transactionId]
    );
    return result.rows[0] ? this.mapRowToEscrow(result.rows[0]) : undefined;
  }

  async updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.isLocked !== undefined) {
      fields.push(`is_locked = $${paramIndex++}`);
      values.push(updates.isLocked);
    }
    if (updates.releasedAt !== undefined) {
      fields.push(`released_at = $${paramIndex++}`);
      values.push(updates.releasedAt);
    }

    if (fields.length === 0) return this.getEscrow(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE escrow_accounts SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapRowToEscrow(result.rows[0]) : undefined;
  }

  private mapRowToEscrow(row: any): EscrowAccount {
    return {
      id: row.id,
      transactionId: row.transaction_id,
      amount: parseFloat(row.amount),
      status: row.status,
      isLocked: row.is_locked,
      createdAt: new Date(row.created_at),
      releasedAt: row.released_at ? new Date(row.released_at) : undefined
    };
  }

  // ============================================================================
  // Listing Media Operations
  // ============================================================================

  async createListingMedia(media: Omit<ListingMedia, 'id' | 'createdAt' | 'updatedAt'>): Promise<ListingMedia> {
    const result = await pool.query(
      `INSERT INTO listing_media (
        id, listing_id, media_type, file_name, file_size, mime_type,
        storage_url, thumbnail_url, display_order, is_primary, uploaded_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        media.listingId,
        media.mediaType,
        media.fileName,
        media.fileSize,
        media.mimeType,
        media.storageUrl,
        media.thumbnailUrl || null,
        media.displayOrder,
        media.isPrimary,
        media.uploadedAt
      ]
    );
    return this.mapRowToListingMedia(result.rows[0]);
  }

  async getListingMedia(listingId: string): Promise<ListingMedia[]> {
    const result = await pool.query(
      'SELECT * FROM listing_media WHERE listing_id = $1 ORDER BY display_order ASC',
      [listingId]
    );
    return result.rows.map(row => this.mapRowToListingMedia(row));
  }

  async getMediaById(mediaId: string): Promise<ListingMedia | null> {
    const result = await pool.query(
      'SELECT * FROM listing_media WHERE id = $1',
      [mediaId]
    );
    return result.rows[0] ? this.mapRowToListingMedia(result.rows[0]) : null;
  }

  async deleteListingMedia(mediaId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM listing_media WHERE id = $1',
      [mediaId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateMediaOrder(listingId: string, mediaOrder: { mediaId: string, displayOrder: number }[]): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const { mediaId, displayOrder } of mediaOrder) {
        await client.query(
          'UPDATE listing_media SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND listing_id = $3',
          [displayOrder, mediaId, listingId]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating media order:', error);
      return false;
    } finally {
      client.release();
    }
  }

  async setPrimaryMedia(listingId: string, mediaId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove primary flag from all media for this listing
      await client.query(
        'UPDATE listing_media SET is_primary = false, updated_at = CURRENT_TIMESTAMP WHERE listing_id = $1',
        [listingId]
      );
      
      // Set new primary media
      await client.query(
        'UPDATE listing_media SET is_primary = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND listing_id = $2',
        [mediaId, listingId]
      );
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error setting primary media:', error);
      return false;
    } finally {
      client.release();
    }
  }

  async getMediaCount(listingId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM listing_media WHERE listing_id = $1',
      [listingId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // ============================================================================
  // Notification Operations
  // ============================================================================

  async createNotification(notification: Notification): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (
        id, user_id, type, title, message, data, is_read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.data ? JSON.stringify(notification.data) : null,
        notification.isRead,
        notification.createdAt
      ]
    );
    return this.mapRowToNotification(result.rows[0]);
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToNotification(result.rows[0]) : undefined;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(row => this.mapRowToNotification(row));
  }

  async updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.isRead !== undefined) {
      fields.push(`is_read = $${paramIndex++}`);
      values.push(updates.isRead);
    }

    if (fields.length === 0) {
      return this.getNotification(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE notifications SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] ? this.mapRowToNotification(result.rows[0]) : undefined;
  }

  async getNotificationTemplate(type: NotificationType, language: string): Promise<NotificationTemplate | undefined> {
    const result = await pool.query(
      'SELECT * FROM notification_templates WHERE type = $1 AND language = $2',
      [type, language]
    );
    return result.rows[0] ? this.mapRowToNotificationTemplate(result.rows[0]) : undefined;
  }

  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data ? JSON.parse(row.data) : undefined,
      isRead: row.is_read,
      createdAt: new Date(row.created_at)
    };
  }

  private mapRowToNotificationTemplate(row: any): NotificationTemplate {
    return {
      id: row.id,
      type: row.type,
      language: row.language,
      template: row.template,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Execute raw SQL query (for development/admin operations)
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Query result
   */
  async query(sql: string, params?: any[]): Promise<any> {
    return await pool.query(sql, params);
  }

  private mapRowToListingMedia(row: any): ListingMedia {
    return {
      id: row.id,
      listingId: row.listing_id,
      mediaType: row.media_type,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      storageUrl: row.storage_url,
      thumbnailUrl: row.thumbnail_url,
      displayOrder: row.display_order,
      isPrimary: row.is_primary,
      uploadedAt: new Date(row.uploaded_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // ============================================================================
  // Translation Feedback Operations
  // ============================================================================

  /**
   * Create translation feedback
   * @param feedback - Translation feedback object to create
   * @returns Created translation feedback object
   */
  async createTranslationFeedback(feedback: Omit<TranslationFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<TranslationFeedback> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO translation_feedback (
          user_id, original_text, translated_text, source_language, target_language,
          suggested_translation, feedback_type, context, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          feedback.userId,
          feedback.originalText,
          feedback.translatedText,
          feedback.sourceLanguage,
          feedback.targetLanguage,
          feedback.suggestedTranslation || null,
          feedback.feedbackType,
          feedback.context || null,
          feedback.status || 'pending'
        ]
      );
      return this.mapRowToTranslationFeedback(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get translation feedback by ID
   * @param id - Feedback ID
   * @returns Translation feedback object or undefined if not found
   */
  async getTranslationFeedback(id: string): Promise<TranslationFeedback | undefined> {
    const result = await pool.query(
      'SELECT * FROM translation_feedback WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToTranslationFeedback(result.rows[0]) : undefined;
  }

  /**
   * Get translation feedback statistics
   * @param targetLanguage - Optional language filter
   * @returns Translation feedback statistics
   */
  async getTranslationFeedbackStats(targetLanguage?: string): Promise<TranslationFeedbackStats> {
    const client = await pool.connect();
    try {
      // Total feedback count
      const totalQuery = targetLanguage
        ? 'SELECT COUNT(*) as count FROM translation_feedback WHERE target_language = $1'
        : 'SELECT COUNT(*) as count FROM translation_feedback';
      const totalParams = targetLanguage ? [targetLanguage] : [];
      const totalResult = await client.query(totalQuery, totalParams);
      const totalFeedback = parseInt(totalResult.rows[0].count);

      // By language
      const byLanguageQuery = targetLanguage
        ? 'SELECT target_language, COUNT(*) as count FROM translation_feedback WHERE target_language = $1 GROUP BY target_language'
        : 'SELECT target_language, COUNT(*) as count FROM translation_feedback GROUP BY target_language';
      const byLanguageParams = targetLanguage ? [targetLanguage] : [];
      const byLanguageResult = await client.query(byLanguageQuery, byLanguageParams);
      const byLanguage: Record<string, number> = {};
      byLanguageResult.rows.forEach(row => {
        byLanguage[row.target_language] = parseInt(row.count);
      });

      // By type
      const byTypeQuery = targetLanguage
        ? 'SELECT feedback_type, COUNT(*) as count FROM translation_feedback WHERE target_language = $1 GROUP BY feedback_type'
        : 'SELECT feedback_type, COUNT(*) as count FROM translation_feedback GROUP BY feedback_type';
      const byTypeParams = targetLanguage ? [targetLanguage] : [];
      const byTypeResult = await client.query(byTypeQuery, byTypeParams);
      const byType: Record<FeedbackType, number> = {} as Record<FeedbackType, number>;
      byTypeResult.rows.forEach(row => {
        byType[row.feedback_type as FeedbackType] = parseInt(row.count);
      });

      // By status
      const byStatusQuery = targetLanguage
        ? 'SELECT status, COUNT(*) as count FROM translation_feedback WHERE target_language = $1 GROUP BY status'
        : 'SELECT status, COUNT(*) as count FROM translation_feedback GROUP BY status';
      const byStatusParams = targetLanguage ? [targetLanguage] : [];
      const byStatusResult = await client.query(byStatusQuery, byStatusParams);
      const byStatus: Record<FeedbackStatus, number> = {} as Record<FeedbackStatus, number>;
      byStatusResult.rows.forEach(row => {
        byStatus[row.status as FeedbackStatus] = parseInt(row.count);
      });

      // Average resolution time (in hours)
      const resolutionQuery = targetLanguage
        ? `SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600) as avg_hours 
           FROM translation_feedback 
           WHERE reviewed_at IS NOT NULL AND target_language = $1`
        : `SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600) as avg_hours 
           FROM translation_feedback 
           WHERE reviewed_at IS NOT NULL`;
      const resolutionParams = targetLanguage ? [targetLanguage] : [];
      const resolutionResult = await client.query(resolutionQuery, resolutionParams);
      const averageResolutionTime = resolutionResult.rows[0].avg_hours 
        ? parseFloat(resolutionResult.rows[0].avg_hours) 
        : undefined;

      return {
        totalFeedback,
        byLanguage,
        byType,
        byStatus,
        averageResolutionTime
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update translation feedback
   * @param id - Feedback ID to update
   * @param updates - Partial feedback object with fields to update
   * @returns Updated feedback object or undefined if not found
   */
  async updateTranslationFeedback(id: string, updates: Partial<TranslationFeedback>): Promise<TranslationFeedback | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.adminNotes !== undefined) {
      fields.push(`admin_notes = $${paramIndex++}`);
      values.push(updates.adminNotes);
    }
    if (updates.reviewedBy !== undefined) {
      fields.push(`reviewed_by = $${paramIndex++}`);
      values.push(updates.reviewedBy);
    }
    if (updates.reviewedAt !== undefined) {
      fields.push(`reviewed_at = $${paramIndex++}`);
      values.push(updates.reviewedAt);
    }

    if (fields.length === 0) {
      return this.getTranslationFeedback(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE translation_feedback 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] ? this.mapRowToTranslationFeedback(result.rows[0]) : undefined;
  }

  private mapRowToTranslationFeedback(row: any): TranslationFeedback {
    return {
      id: row.id,
      userId: row.user_id,
      originalText: row.original_text,
      translatedText: row.translated_text,
      sourceLanguage: row.source_language,
      targetLanguage: row.target_language,
      suggestedTranslation: row.suggested_translation,
      feedbackType: row.feedback_type,
      context: row.context,
      status: row.status,
      adminNotes: row.admin_notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      reviewedBy: row.reviewed_by
    };
  }
}
