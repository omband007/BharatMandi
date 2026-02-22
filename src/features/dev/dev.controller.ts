/**
 * Development Controller
 * 
 * Provides development-only endpoints for testing and data management
 * WARNING: These endpoints should NEVER be exposed in production!
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type { DatabaseManager } from '../../shared/database/db-abstraction';

const router = Router();

// Get shared DatabaseManager instance
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized');
  }
  return dbManager;
}

/**
 * POST /api/dev/clear-sync-queue
 * Clear the sync queue only (useful when queue has stale items)
 */
router.post('/clear-sync-queue', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is not available in production'
      });
    }

    console.log('[DevController] Clearing sync queue...');

    const dbManager = getDbManager();
    const sqliteAdapter = dbManager.getSQLiteAdapter();

    // Get count before
    const before = await sqliteAdapter.get('SELECT COUNT(*) as count FROM pending_sync_queue');
    console.log(`[DevController] Found ${before.count} items in sync queue`);

    // Clear the sync queue
    await sqliteAdapter.run('DELETE FROM pending_sync_queue');
    
    console.log('[DevController] ✓ Sync queue cleared');

    res.json({
      success: true,
      message: 'Sync queue cleared successfully',
      itemsCleared: before.count
    });
  } catch (error) {
    console.error('[DevController] Clear sync queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear sync queue',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/dev/clean-all-data
 * Clean all test data from databases and file system
 * 
 * WARNING: This deletes ALL data! Only use in development!
 */
router.post('/clean-all-data', async (req: Request, res: Response) => {
  try {
    // Safety check - only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is not available in production'
      });
    }

    console.log('[DevController] Starting clean all data operation...');

    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();
    const sqliteAdapter = dbManager.getSQLiteAdapter();

    // 1. Clean PostgreSQL tables (CASCADE handles referential integrity)
    console.log('[DevController] Cleaning PostgreSQL tables...');
    try {
      // Delete in correct order to respect foreign key constraints
      await pgAdapter.query('DELETE FROM listing_media');
      await pgAdapter.query('DELETE FROM listings');
      await pgAdapter.query('DELETE FROM transactions');
      await pgAdapter.query('DELETE FROM escrow_accounts');
      await pgAdapter.query('DELETE FROM users');
      console.log('[DevController] ✓ PostgreSQL tables cleaned');
    } catch (error) {
      console.error('[DevController] Error cleaning PostgreSQL:', error);
      throw error; // Re-throw to fail the request
    }

    // 2. Clean SQLite tables
    console.log('[DevController] Cleaning SQLite tables...');
    try {
      await sqliteAdapter.run('DELETE FROM listing_media_cache');
      await sqliteAdapter.run('DELETE FROM listings');
      await sqliteAdapter.run('DELETE FROM pending_sync_queue'); // Clear sync queue FIRST
      await sqliteAdapter.run('DELETE FROM transactions');
      await sqliteAdapter.run('DELETE FROM escrow_accounts');
      await sqliteAdapter.run('DELETE FROM users');
      await sqliteAdapter.run('DELETE FROM otp_sessions');
      await sqliteAdapter.run('DELETE FROM account_security');
      console.log('[DevController] ✓ SQLite tables cleaned');
    } catch (error) {
      console.error('[DevController] Error cleaning SQLite:', error);
      throw error; // Re-throw to fail the request
    }

    // 3. Clean media files from file system
    console.log('[DevController] Cleaning media files...');
    const mediaPath = path.join(__dirname, '../../../data/media/listings');
    try {
      if (fs.existsSync(mediaPath)) {
        fs.rmSync(mediaPath, { recursive: true, force: true });
        console.log('[DevController] ✓ Media files deleted');
      }
    } catch (error) {
      console.error('[DevController] Error cleaning media files:', error);
    }

    console.log('[DevController] ✓ Clean all data operation completed');

    res.json({
      success: true,
      message: 'All test data cleaned successfully',
      cleaned: {
        postgresql: ['listing_media', 'listings', 'escrow_accounts', 'transactions', 'users'],
        sqlite: ['listing_media_cache', 'listings', 'pending_sync_queue', 'users', 'transactions', 'escrow_accounts', 'otp_sessions', 'account_security'],
        filesystem: ['data/media/listings']
      }
    });
  } catch (error) {
    console.error('[DevController] Clean all data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/dev/delete-media
 * Delete all media files and records
 */
router.post('/delete-media', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is not available in production'
      });
    }

    console.log('[DevController] Deleting all media...');

    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();
    const sqliteAdapter = dbManager.getSQLiteAdapter();

    // Delete from PostgreSQL
    await pgAdapter.query('DELETE FROM listing_media');
    
    // Delete from SQLite
    await sqliteAdapter.run('DELETE FROM listing_media_cache');
    
    // Delete files
    const mediaPath = path.join(__dirname, '../../../data/media/listings');
    if (fs.existsSync(mediaPath)) {
      fs.rmSync(mediaPath, { recursive: true, force: true });
    }

    console.log('[DevController] ✓ All media deleted');

    res.json({
      success: true,
      message: 'All media deleted successfully'
    });
  } catch (error) {
    console.error('[DevController] Delete media error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete media',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/dev/delete-listings
 * Delete all listings (and their media due to CASCADE)
 */
router.post('/delete-listings', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is not available in production'
      });
    }

    console.log('[DevController] Deleting all listings...');

    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();
    const sqliteAdapter = dbManager.getSQLiteAdapter();

    // Delete from PostgreSQL (CASCADE will delete media too)
    await pgAdapter.query('DELETE FROM listings');
    
    // Delete from SQLite
    await sqliteAdapter.run('DELETE FROM listings');
    await sqliteAdapter.run('DELETE FROM listing_media_cache');
    
    // Delete media files
    const mediaPath = path.join(__dirname, '../../../data/media/listings');
    if (fs.existsSync(mediaPath)) {
      fs.rmSync(mediaPath, { recursive: true, force: true });
    }

    console.log('[DevController] ✓ All listings deleted');

    res.json({
      success: true,
      message: 'All listings and their media deleted successfully'
    });
  } catch (error) {
    console.error('[DevController] Delete listings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete listings',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/dev/stats
 * Get database statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();

    // Get PostgreSQL counts
    const [pgUsers, pgListings, pgMedia, pgTransactions] = await Promise.all([
      pgAdapter.query('SELECT COUNT(*) as count FROM users'),
      pgAdapter.query('SELECT COUNT(*) as count FROM listings'),
      pgAdapter.query('SELECT COUNT(*) as count FROM listing_media'),
      pgAdapter.query('SELECT COUNT(*) as count FROM transactions')
    ]);

    // Skip SQLite for now due to lock contention issues
    // TODO: Fix SQLite locking issue with sync engine
    res.json({
      success: true,
      postgresql: {
        users: pgUsers.rows[0].count,
        listings: pgListings.rows[0].count,
        media: pgMedia.rows[0].count,
        transactions: pgTransactions.rows[0].count
      },
      sqlite: {
        users: 'N/A',
        listings: 'N/A',
        mediaCache: 'N/A',
        syncQueue: 'N/A',
        note: 'SQLite stats temporarily disabled due to lock contention'
      }
    });
  } catch (error) {
    console.error('[DevController] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export const devController = router;
