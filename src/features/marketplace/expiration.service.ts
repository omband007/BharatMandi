/**
 * ExpirationService
 * Automatically expires listings based on expiry_date
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import type { DatabaseManager } from '../../shared/database/db-abstraction';
import { listingStatusManager, ListingStatus, TriggerType } from './listing-status-manager';

// Get the shared DatabaseManager instance from app.ts
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized. This should be set by app.ts');
  }
  return dbManager;
}

export class ExpirationService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Check for expired listings and transition them to EXPIRED status
   * Requirements: 4.1, 4.3, 4.4
   * 
   * @returns Number of listings expired
   */
  async checkExpiredListings(): Promise<number> {
    const dbManager = getDbManager();

    try {
      // Query ACTIVE listings where expiry_date < NOW()
      const expiredListings = await dbManager.all(
        `SELECT id, expiry_date FROM listings 
         WHERE status = ? AND expiry_date < ?`,
        [ListingStatus.ACTIVE, new Date().toISOString()]
      );

      console.log(`[ExpirationService] Found ${expiredListings.length} expired listings`);

      // Expire each listing
      let expiredCount = 0;
      for (const listing of expiredListings) {
        try {
          await this.expireListing(listing.id);
          expiredCount++;
        } catch (error) {
          console.error(`[ExpirationService] Failed to expire listing ${listing.id}:`, error);
          // Continue with other listings even if one fails
        }
      }

      console.log(`[ExpirationService] Successfully expired ${expiredCount} listings`);
      return expiredCount;
    } catch (error) {
      console.error('[ExpirationService] Error checking expired listings:', error);
      throw error;
    }
  }

  /**
   * Expire a single listing
   * Requirements: 4.3, 4.5, 4.6
   * 
   * @param listingId - Listing ID to expire
   */
  async expireListing(listingId: string): Promise<void> {
    try {
      // Transition status to EXPIRED
      await listingStatusManager.transitionStatus(
        listingId,
        ListingStatus.EXPIRED,
        'SYSTEM',
        TriggerType.SYSTEM,
        {
          reason: 'automatic_expiration',
          expired_at: new Date().toISOString()
        }
      );

      console.log(`[ExpirationService] Expired listing: ${listingId}`);
    } catch (error) {
      console.error(`[ExpirationService] Failed to expire listing ${listingId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule periodic expiration checks
   * Requirements: 4.2
   * 
   * Runs checkExpiredListings() every hour
   */
  scheduleExpirationCheck(): void {
    if (this.intervalId) {
      console.log('[ExpirationService] Expiration check already scheduled');
      return;
    }

    console.log('[ExpirationService] Starting expiration scheduler (runs every hour)');

    // Run immediately on startup
    this.checkExpiredListings().catch(error => {
      console.error('[ExpirationService] Initial expiration check failed:', error);
    });

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkExpiredListings().catch(error => {
        console.error('[ExpirationService] Scheduled expiration check failed:', error);
      });
    }, this.CHECK_INTERVAL_MS);

    console.log('[ExpirationService] Expiration scheduler started');
  }

  /**
   * Stop the expiration scheduler
   * Used for graceful shutdown
   */
  stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ExpirationService] Expiration scheduler stopped');
    }
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get upcoming expirations (listings expiring in next N hours)
   * Useful for notifications or monitoring
   * 
   * @param hoursAhead - Number of hours to look ahead
   * @returns Array of listings expiring soon
   */
  async getUpcomingExpirations(hoursAhead: number = 24): Promise<any[]> {
    const dbManager = getDbManager();

    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + hoursAhead);

    return await dbManager.all(
      `SELECT * FROM listings 
       WHERE status = ? 
       AND expiry_date > ? 
       AND expiry_date <= ?
       ORDER BY expiry_date ASC`,
      [ListingStatus.ACTIVE, new Date().toISOString(), futureDate.toISOString()]
    );
  }

  /**
   * Get expiration statistics
   * Useful for monitoring and analytics
   * 
   * @returns Statistics about expired listings
   */
  async getExpirationStats(): Promise<{
    total_expired: number;
    expired_today: number;
    expired_this_week: number;
    expired_this_month: number;
  }> {
    const dbManager = getDbManager();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, week, month] = await Promise.all([
      dbManager.get('SELECT COUNT(*) as count FROM listings WHERE status = ?', [ListingStatus.EXPIRED]),
      dbManager.get(
        'SELECT COUNT(*) as count FROM listings WHERE status = ? AND expired_at >= ?',
        [ListingStatus.EXPIRED, todayStart.toISOString()]
      ),
      dbManager.get(
        'SELECT COUNT(*) as count FROM listings WHERE status = ? AND expired_at >= ?',
        [ListingStatus.EXPIRED, weekStart.toISOString()]
      ),
      dbManager.get(
        'SELECT COUNT(*) as count FROM listings WHERE status = ? AND expired_at >= ?',
        [ListingStatus.EXPIRED, monthStart.toISOString()]
      )
    ]);

    return {
      total_expired: total?.count || 0,
      expired_today: today?.count || 0,
      expired_this_week: week?.count || 0,
      expired_this_month: month?.count || 0
    };
  }
}

// Export singleton instance
export const expirationService = new ExpirationService();
