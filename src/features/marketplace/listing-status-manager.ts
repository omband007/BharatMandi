/**
 * ListingStatusManager Service
 * Manages listing status transitions, validation, and audit trail
 * Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.2, 9.3, 11.1, 11.2, 16.1, 16.2, 16.5, 17.1
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseManager } from '../../shared/database/db-abstraction';
import { categoryManager } from './category-manager';

// Listing status enum
export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

// Listing type enum
export enum ListingType {
  PRE_HARVEST = 'PRE_HARVEST',
  POST_HARVEST = 'POST_HARVEST'
}

// Sale channel enum
export enum SaleChannel {
  PLATFORM = 'PLATFORM',
  EXTERNAL = 'EXTERNAL'
}

// Trigger type for status changes
export enum TriggerType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  TRANSACTION = 'TRANSACTION'
}

export interface StatusChangeRecord {
  id: string;
  listing_id: string;
  previous_status: ListingStatus | null;
  new_status: ListingStatus;
  changed_at: Date;
  triggered_by: string; // user_id or 'SYSTEM'
  trigger_type: TriggerType;
  metadata?: Record<string, any>;
}

export interface MarkAsSoldInput {
  listingId: string;
  saleChannel: SaleChannel;
  salePrice?: number; // Optional for EXTERNAL
  saleNotes?: string; // Optional for EXTERNAL
  userId: string; // User marking as sold
}

// Get the shared DatabaseManager instance from app.ts
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized. This should be set by app.ts');
  }
  return dbManager;
}

export class ListingStatusManager {
  /**
   * Valid state transitions
   * Requirements: 11.1, 11.2
   */
  private readonly VALID_TRANSITIONS: Map<ListingStatus, ListingStatus[]> = new Map([
    [ListingStatus.ACTIVE, [ListingStatus.SOLD, ListingStatus.EXPIRED, ListingStatus.CANCELLED]],
    [ListingStatus.CANCELLED, [ListingStatus.ACTIVE]], // Can reactivate cancelled listings
    [ListingStatus.SOLD, []], // Terminal state
    [ListingStatus.EXPIRED, []] // Terminal state
  ]);

  /**
   * Validate if a status transition is allowed
   * Requirements: 11.1, 11.2
   * 
   * @param currentStatus - Current listing status
   * @param newStatus - Desired new status
   * @returns true if transition is valid
   */
  validateTransition(currentStatus: ListingStatus, newStatus: ListingStatus): boolean {
    const allowedTransitions = this.VALID_TRANSITIONS.get(currentStatus);
    if (!allowedTransitions) {
      return false;
    }
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Transition a listing to a new status
   * Requirements: 1.1, 1.2, 1.3, 1.4
   * 
   * @param listingId - Listing ID
   * @param newStatus - New status
   * @param triggeredBy - User ID or 'SYSTEM'
   * @param triggerType - Type of trigger (USER, SYSTEM, TRANSACTION)
   * @param metadata - Additional context
   * @throws Error if transition is invalid
   */
  async transitionStatus(
    listingId: string,
    newStatus: ListingStatus,
    triggeredBy: string,
    triggerType: TriggerType,
    metadata?: Record<string, any>
  ): Promise<void> {
    const dbManager = getDbManager();

    // Get current listing
    const listing = await dbManager.get('SELECT * FROM listings WHERE id = ?', [listingId]);
    if (!listing) {
      throw new Error(`Listing with ID "${listingId}" not found`);
    }

    const currentStatus = listing.status as ListingStatus;

    // Validate transition
    if (!this.validateTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${this.VALID_TRANSITIONS.get(currentStatus)?.join(', ') || 'none'}`
      );
    }

    // Update listing status
    const updateFields: string[] = ['status = ?', 'updated_at = ?'];
    const updateValues: any[] = [newStatus, new Date().toISOString()];

    // Set status-specific timestamp fields
    if (newStatus === ListingStatus.SOLD) {
      updateFields.push('sold_at = ?');
      updateValues.push(new Date().toISOString());
    } else if (newStatus === ListingStatus.EXPIRED) {
      updateFields.push('expired_at = ?');
      updateValues.push(new Date().toISOString());
    } else if (newStatus === ListingStatus.CANCELLED) {
      updateFields.push('cancelled_at = ?', 'cancelled_by = ?');
      updateValues.push(new Date().toISOString(), triggeredBy);
    }

    updateValues.push(listingId);

    await dbManager.run(
      `UPDATE listings SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Record status change in audit trail
    await this.recordStatusChange(
      listingId,
      currentStatus,
      newStatus,
      triggeredBy,
      triggerType,
      metadata
    );
  }

  /**
   * Record a status change in the audit trail
   * Requirements: 1.4
   * 
   * @param listingId - Listing ID
   * @param previousStatus - Previous status
   * @param newStatus - New status
   * @param triggeredBy - User ID or 'SYSTEM'
   * @param triggerType - Type of trigger
   * @param metadata - Additional context
   */
  async recordStatusChange(
    listingId: string,
    previousStatus: ListingStatus | null,
    newStatus: ListingStatus,
    triggeredBy: string,
    triggerType: TriggerType,
    metadata?: Record<string, any>
  ): Promise<void> {
    const dbManager = getDbManager();

    const record: StatusChangeRecord = {
      id: uuidv4(),
      listing_id: listingId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_at: new Date(),
      triggered_by: triggeredBy,
      trigger_type: triggerType,
      metadata
    };

    try {
      await dbManager.run(
        `INSERT INTO listing_status_history 
         (id, listing_id, previous_status, new_status, changed_at, triggered_by, trigger_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.listing_id,
          record.previous_status,
          record.new_status,
          record.changed_at.toISOString(),
          record.triggered_by,
          record.trigger_type,
          metadata ? JSON.stringify(metadata) : null,
          new Date().toISOString()
        ]
      );
    } catch (error) {
      // Log error but don't fail the operation if status history table doesn't exist
      console.warn('[ListingStatusManager] Failed to record status change:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Get listings by status with optional filtering
   * Requirements: 9.1, 9.2, 9.3
   * 
   * @param statuses - Array of statuses to filter by
   * @param farmerId - Optional farmer ID filter
   * @returns Array of listings
   */
  async getListingsByStatus(statuses: ListingStatus[], farmerId?: string): Promise<any[]> {
    const dbManager = getDbManager();

    let query = 'SELECT * FROM listings WHERE status IN (';
    query += statuses.map(() => '?').join(', ');
    query += ')';

    const params: any[] = [...statuses];

    if (farmerId) {
      query += ' AND farmer_id = ?';
      params.push(farmerId);
    }

    query += ' ORDER BY created_at DESC';

    return await dbManager.all(query, params);
  }

  /**
   * Calculate expiry date for a listing
   * Requirements: 16.1, 16.2, 16.5, 17.1
   * 
   * @param harvestDate - Expected or actual harvest date
   * @param categoryId - Produce category ID
   * @returns Calculated expiry date
   */
  async calculateExpiryDate(harvestDate: Date, categoryId: string): Promise<Date> {
    // Get category to retrieve expiry period
    const category = await categoryManager.getCategoryById(categoryId);
    if (!category) {
      throw new Error(`Produce category with ID "${categoryId}" not found`);
    }

    // Calculate expiry date: harvest_date + expiry_period_hours
    const expiryDate = new Date(harvestDate);
    expiryDate.setHours(expiryDate.getHours() + category.expiry_period_hours);

    return expiryDate;
  }

  /**
   * Mark a listing as sold (manual sale confirmation)
   * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10
   * 
   * @param input - Sale confirmation details
   * @throws Error if validation fails or active transaction exists
   */
  async markAsSold(input: MarkAsSoldInput): Promise<void> {
    const dbManager = getDbManager();

    // Get listing
    const listing = await dbManager.get('SELECT * FROM listings WHERE id = ?', [input.listingId]);
    if (!listing) {
      throw new Error(`Listing with ID "${input.listingId}" not found`);
    }

    // Validate listing is ACTIVE
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new Error(`Cannot mark listing as sold. Current status is ${listing.status}, must be ACTIVE`);
    }

    // Validate sale channel
    if (input.saleChannel !== SaleChannel.PLATFORM && input.saleChannel !== SaleChannel.EXTERNAL) {
      throw new Error(`Invalid sale channel. Must be PLATFORM or EXTERNAL`);
    }

    // For PLATFORM sales, no transactionId is required (simplified flow)

    // Check for active transactions (PAYMENT_LOCKED or later states)
    const activeTransaction = await dbManager.get(
      `SELECT * FROM transactions 
       WHERE listing_id = ? 
       AND status IN ('PAYMENT_LOCKED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED')`,
      [input.listingId]
    );

    if (activeTransaction) {
      throw new Error(
        `Cannot manually mark listing as sold. Active transaction exists with status: ${activeTransaction.status}`
      );
    }

    // Update listing
    const updateFields = [
      'status = ?',
      'sold_at = ?',
      'sale_channel = ?',
      'updated_at = ?'
    ];
    const updateValues: any[] = [
      ListingStatus.SOLD,
      new Date().toISOString(),
      input.saleChannel,
      new Date().toISOString()
    ];

    if (input.salePrice !== undefined) {
      updateFields.push('sale_price = ?');
      updateValues.push(input.salePrice);
    }

    if (input.saleNotes) {
      updateFields.push('sale_notes = ?');
      updateValues.push(input.saleNotes);
    }

    updateValues.push(input.listingId);

    await dbManager.run(
      `UPDATE listings SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Record status change in audit trail
    await this.recordStatusChange(
      input.listingId,
      ListingStatus.ACTIVE,
      ListingStatus.SOLD,
      input.userId,
      TriggerType.USER,
      {
        sale_channel: input.saleChannel,
        sale_price: input.salePrice,
        sale_notes: input.saleNotes
      }
    );
  }

  /**
   * Get status history for a listing
   * 
   * @param listingId - Listing ID
   * @returns Array of status change records
   */
  async getStatusHistory(listingId: string): Promise<StatusChangeRecord[]> {
    const dbManager = getDbManager();

    try {
      const rows = await dbManager.all(
        'SELECT * FROM listing_status_history WHERE listing_id = ? ORDER BY changed_at DESC',
        [listingId]
      );

      return rows.map(row => ({
        id: row.id,
        listing_id: row.listing_id,
        previous_status: row.previous_status as ListingStatus | null,
        new_status: row.new_status as ListingStatus,
        changed_at: new Date(row.changed_at),
        triggered_by: row.triggered_by,
        trigger_type: row.trigger_type as TriggerType,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      // Log error but return empty array if status history table doesn't exist
      console.warn('[ListingStatusManager] Failed to get status history:', error instanceof Error ? error.message : error);
      return [];
    }
  }
}

// Export singleton instance
export const listingStatusManager = new ListingStatusManager();
