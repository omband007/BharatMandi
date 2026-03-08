/**
 * StatusSynchronizer Service
 * Synchronizes listing status with transaction and escrow state changes
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 20.4, 20.5
 */

import type { DatabaseManager } from '../../shared/database/db-abstraction';
import { listingStatusManager, ListingStatus, TriggerType, SaleChannel } from './listing-status-manager';

// Get the shared DatabaseManager instance from app.ts
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized. This should be set by app.ts');
  }
  return dbManager;
}

export class StatusSynchronizer {
  /**
   * Handle transaction completion (escrow flow)
   * Requirements: 5.1, 5.2, 5.3
   * 
   * Transitions listing to SOLD when transaction reaches COMPLETED state
   * 
   * @param transactionId - Transaction ID
   */
  async onTransactionCompleted(transactionId: string): Promise<void> {
    const dbManager = getDbManager();

    try {
      // Get transaction details
      const transaction = await dbManager.get(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId]
      );

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Get listing
      const listing = await dbManager.get(
        'SELECT * FROM listings WHERE id = ?',
        [transaction.listing_id]
      );

      if (!listing) {
        throw new Error(`Listing ${transaction.listing_id} not found`);
      }

      // Only update if listing is ACTIVE
      if (listing.status !== ListingStatus.ACTIVE) {
        console.log(
          `[StatusSynchronizer] Skipping listing ${listing.id} - status is ${listing.status}, not ACTIVE`
        );
        return;
      }

      // Update listing with transaction details and sale channel
      await dbManager.run(
        `UPDATE listings 
         SET status = ?, sold_at = ?, transaction_id = ?, sale_channel = ?, updated_at = ?
         WHERE id = ?`,
        [
          ListingStatus.SOLD,
          new Date().toISOString(),
          transactionId,
          SaleChannel.PLATFORM,
          new Date().toISOString(),
          listing.id
        ]
      );

      // Record status change in audit trail
      await listingStatusManager.recordStatusChange(
        listing.id,
        ListingStatus.ACTIVE,
        ListingStatus.SOLD,
        'SYSTEM',
        TriggerType.TRANSACTION,
        {
          transaction_id: transactionId,
          sale_channel: SaleChannel.PLATFORM,
          reason: 'transaction_completed'
        }
      );

      console.log(`[StatusSynchronizer] Listing ${listing.id} marked as SOLD (transaction completed)`);
    } catch (error) {
      console.error(`[StatusSynchronizer] Error handling transaction completion:`, error);
      throw error;
    }
  }

  /**
   * Handle direct payment transaction completion
   * Requirements: 20.4, 20.5, 5.1, 5.2, 5.3
   * 
   * Transitions listing to SOLD when transaction reaches COMPLETED_DIRECT state
   * 
   * @param transactionId - Transaction ID
   */
  async onTransactionCompletedDirect(transactionId: string): Promise<void> {
    const dbManager = getDbManager();

    try {
      // Get transaction details
      const transaction = await dbManager.get(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId]
      );

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Get listing
      const listing = await dbManager.get(
        'SELECT * FROM listings WHERE id = ?',
        [transaction.listing_id]
      );

      if (!listing) {
        throw new Error(`Listing ${transaction.listing_id} not found`);
      }

      // Only update if listing is ACTIVE
      if (listing.status !== ListingStatus.ACTIVE) {
        console.log(
          `[StatusSynchronizer] Skipping listing ${listing.id} - status is ${listing.status}, not ACTIVE`
        );
        return;
      }

      // Update listing with transaction details and PLATFORM channel
      await dbManager.run(
        `UPDATE listings 
         SET status = ?, sold_at = ?, transaction_id = ?, sale_channel = ?, updated_at = ?
         WHERE id = ?`,
        [
          ListingStatus.SOLD,
          new Date().toISOString(),
          transactionId,
          SaleChannel.PLATFORM,
          new Date().toISOString(),
          listing.id
        ]
      );

      // Record status change in audit trail
      await listingStatusManager.recordStatusChange(
        listing.id,
        ListingStatus.ACTIVE,
        ListingStatus.SOLD,
        'SYSTEM',
        TriggerType.TRANSACTION,
        {
          transaction_id: transactionId,
          sale_channel: SaleChannel.PLATFORM,
          reason: 'direct_payment_completed'
        }
      );

      console.log(`[StatusSynchronizer] Listing ${listing.id} marked as SOLD (direct payment completed)`);
    } catch (error) {
      console.error(`[StatusSynchronizer] Error handling direct payment completion:`, error);
      throw error;
    }
  }

  /**
   * Handle transaction cancellation
   * Requirements: 7.1, 7.2, 7.5
   * 
   * Returns listing to ACTIVE if not expired, otherwise marks as EXPIRED
   * 
   * @param transactionId - Transaction ID
   */
  async onTransactionCancelled(transactionId: string): Promise<void> {
    const dbManager = getDbManager();

    try {
      // Get transaction details
      const transaction = await dbManager.get(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId]
      );

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Get listing
      const listing = await dbManager.get(
        'SELECT * FROM listings WHERE id = ?',
        [transaction.listing_id]
      );

      if (!listing) {
        throw new Error(`Listing ${transaction.listing_id} not found`);
      }

      // Determine if listing should be reactivated or expired
      const shouldReactivate = await this.shouldReactivateListing(listing.id);

      if (shouldReactivate) {
        // Return to ACTIVE status
        await listingStatusManager.transitionStatus(
          listing.id,
          ListingStatus.ACTIVE,
          'SYSTEM',
          TriggerType.TRANSACTION,
          {
            transaction_id: transactionId,
            reason: 'transaction_cancelled',
            previous_status: listing.status
          }
        );

        console.log(`[StatusSynchronizer] Listing ${listing.id} returned to ACTIVE (transaction cancelled)`);
      } else {
        // Mark as EXPIRED
        await listingStatusManager.transitionStatus(
          listing.id,
          ListingStatus.EXPIRED,
          'SYSTEM',
          TriggerType.TRANSACTION,
          {
            transaction_id: transactionId,
            reason: 'transaction_cancelled_after_expiry',
            previous_status: listing.status
          }
        );

        console.log(`[StatusSynchronizer] Listing ${listing.id} marked as EXPIRED (transaction cancelled after expiry)`);
      }
    } catch (error) {
      console.error(`[StatusSynchronizer] Error handling transaction cancellation:`, error);
      throw error;
    }
  }

  /**
   * Handle transaction rejection
   * Requirements: 7.3, 7.4, 7.5
   * 
   * Returns listing to ACTIVE if not expired, otherwise marks as EXPIRED
   * 
   * @param transactionId - Transaction ID
   */
  async onTransactionRejected(transactionId: string): Promise<void> {
    const dbManager = getDbManager();

    try {
      // Get transaction details
      const transaction = await dbManager.get(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId]
      );

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Get listing
      const listing = await dbManager.get(
        'SELECT * FROM listings WHERE id = ?',
        [transaction.listing_id]
      );

      if (!listing) {
        throw new Error(`Listing ${transaction.listing_id} not found`);
      }

      // Determine if listing should be reactivated or expired
      const shouldReactivate = await this.shouldReactivateListing(listing.id);

      if (shouldReactivate) {
        // Return to ACTIVE status
        await listingStatusManager.transitionStatus(
          listing.id,
          ListingStatus.ACTIVE,
          'SYSTEM',
          TriggerType.TRANSACTION,
          {
            transaction_id: transactionId,
            reason: 'transaction_rejected',
            previous_status: listing.status
          }
        );

        console.log(`[StatusSynchronizer] Listing ${listing.id} returned to ACTIVE (transaction rejected)`);
      } else {
        // Mark as EXPIRED
        await listingStatusManager.transitionStatus(
          listing.id,
          ListingStatus.EXPIRED,
          'SYSTEM',
          TriggerType.TRANSACTION,
          {
            transaction_id: transactionId,
            reason: 'transaction_rejected_after_expiry',
            previous_status: listing.status
          }
        );

        console.log(`[StatusSynchronizer] Listing ${listing.id} marked as EXPIRED (transaction rejected after expiry)`);
      }
    } catch (error) {
      console.error(`[StatusSynchronizer] Error handling transaction rejection:`, error);
      throw error;
    }
  }

  /**
   * Handle escrow refund
   * Requirements: 7.1, 7.2, 7.5
   * 
   * Returns listing to ACTIVE if not expired, otherwise marks as EXPIRED
   * 
   * @param escrowId - Escrow account ID
   */
  async onEscrowRefunded(escrowId: string): Promise<void> {
    const dbManager = getDbManager();

    try {
      // Get escrow details
      const escrow = await dbManager.get(
        'SELECT * FROM escrow_accounts WHERE id = ?',
        [escrowId]
      );

      if (!escrow) {
        throw new Error(`Escrow account ${escrowId} not found`);
      }

      // Get transaction
      const transaction = await dbManager.get(
        'SELECT * FROM transactions WHERE id = ?',
        [escrow.transaction_id]
      );

      if (!transaction) {
        throw new Error(`Transaction ${escrow.transaction_id} not found`);
      }

      // Get listing
      const listing = await dbManager.get(
        'SELECT * FROM listings WHERE id = ?',
        [transaction.listing_id]
      );

      if (!listing) {
        throw new Error(`Listing ${transaction.listing_id} not found`);
      }

      // Determine if listing should be reactivated or expired
      const shouldReactivate = await this.shouldReactivateListing(listing.id);

      if (shouldReactivate) {
        // Return to ACTIVE status
        await listingStatusManager.transitionStatus(
          listing.id,
          ListingStatus.ACTIVE,
          'SYSTEM',
          TriggerType.TRANSACTION,
          {
            escrow_id: escrowId,
            transaction_id: transaction.id,
            reason: 'escrow_refunded',
            previous_status: listing.status
          }
        );

        console.log(`[StatusSynchronizer] Listing ${listing.id} returned to ACTIVE (escrow refunded)`);
      } else {
        // Mark as EXPIRED
        await listingStatusManager.transitionStatus(
          listing.id,
          ListingStatus.EXPIRED,
          'SYSTEM',
          TriggerType.TRANSACTION,
          {
            escrow_id: escrowId,
            transaction_id: transaction.id,
            reason: 'escrow_refunded_after_expiry',
            previous_status: listing.status
          }
        );

        console.log(`[StatusSynchronizer] Listing ${listing.id} marked as EXPIRED (escrow refunded after expiry)`);
      }
    } catch (error) {
      console.error(`[StatusSynchronizer] Error handling escrow refund:`, error);
      throw error;
    }
  }

  /**
   * Check if a listing should be reactivated
   * Requirements: 7.5
   * 
   * Returns true if expiry_date has not passed, false otherwise
   * 
   * @param listingId - Listing ID
   * @returns true if listing can be reactivated
   */
  async shouldReactivateListing(listingId: string): Promise<boolean> {
    const dbManager = getDbManager();

    const listing = await dbManager.get(
      'SELECT expiry_date FROM listings WHERE id = ?',
      [listingId]
    );

    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const expiryDate = new Date(listing.expiry_date);
    const now = new Date();

    return expiryDate >= now;
  }
}

// Export singleton instance
export const statusSynchronizer = new StatusSynchronizer();
