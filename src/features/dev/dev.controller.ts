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
 * POST /api/dev/clear-translation-cache
 * Clear all translation cache entries from Redis
 */
router.post('/clear-translation-cache', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is not available in production'
      });
    }

    console.log('[DevController] Clearing translation cache...');

    // Import translation service dynamically to avoid circular dependencies
    const { translationService } = await import('../i18n/translation.service');
    const clearedCount = await translationService.clearCache();

    console.log(`[DevController] ✓ Cleared ${clearedCount} cached translations`);

    res.json({
      success: true,
      message: `Cleared ${clearedCount} cached translations`,
      clearedCount
    });
  } catch (error) {
    console.error('[DevController] Clear translation cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear translation cache',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/dev/clear-diagnosis-cache
 * Clear all diagnosis cache entries from Redis
 */
router.post('/clear-diagnosis-cache', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is not available in production'
      });
    }

    console.log('[DevController] Clearing diagnosis cache...');

    // Import cache service dynamically
    const { cacheService } = await import('../crop-diagnosis/services/cache.service');
    await cacheService.flushAll();

    console.log('[DevController] ✓ Diagnosis cache cleared');

    res.json({
      success: true,
      message: 'Diagnosis cache cleared successfully'
    });
  } catch (error) {
    console.error('[DevController] Clear diagnosis cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear diagnosis cache',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/dev/clear-sync-queue
 * DEPRECATED: SQLite sync queue has been removed
 */
router.post('/clear-sync-queue', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is not available in production'
      });
    }

    res.json({
      success: true,
      message: 'SQLite sync queue has been removed - this endpoint is deprecated',
      itemsCleared: 0
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

    // 2. Clean media files from file system
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

    // Delete from PostgreSQL
    await pgAdapter.query('DELETE FROM listing_media');
    
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

    // Delete from PostgreSQL (CASCADE will delete media too)
    await pgAdapter.query('DELETE FROM listings');
    
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

    res.json({
      success: true,
      postgresql: {
        users: pgUsers.rows[0].count,
        listings: pgListings.rows[0].count,
        media: pgMedia.rows[0].count,
        transactions: pgTransactions.rows[0].count
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

/**
 * POST /api/dev/seed-categories
 * Seed produce categories into the database
 */
router.post('/seed-categories', async (_req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is not available in production'
      });
    }

    console.log('[DevController] Seeding produce categories...');

    const { seedProduceCategories } = await import('../../shared/database/seeds/seed-produce-categories');
    const dbManager = getDbManager();
    
    await seedProduceCategories(dbManager);

    console.log('[DevController] ✓ Categories seeded successfully');

    res.json({
      success: true,
      message: 'Produce categories seeded successfully'
    });
  } catch (error) {
    console.error('[DevController] Seed categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed categories',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/dev/transactions
 * Get all transactions for demo/testing
 */
router.get('/transactions', async (_req: Request, res: Response) => {
  try {
    const dbManager = getDbManager();
    const transactions = await dbManager.all('SELECT * FROM transactions ORDER BY created_at DESC');
    res.json(transactions || []);
  } catch (error) {
    console.error('[DevController] Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export const devController = router;

/**
 * GET /api/dev/users
 * Get all users with their listing counts
 */
router.get('/users', async (_req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();

    const result = await pgAdapter.query(`
      SELECT 
        u.user_id as id,
        u.name,
        u.mobile_number as "phoneNumber",
        u.user_type as "userType",
        u.location,
        u.created_at as "createdAt",
        COUNT(l.id) as "listingCount"
      FROM user_profiles u
      LEFT JOIN listings l ON u.user_id = l.farmer_id
      GROUP BY u.user_id, u.name, u.mobile_number, u.user_type, u.location, u.created_at
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('[DevController] Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * GET /api/dev/users/:id
 * Get user details with their listings
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const { id } = req.params;
    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();

    // Get user
    const userResult = await pgAdapter.query(`
      SELECT 
        user_id as id,
        name,
        mobile_number as "phoneNumber",
        user_type as "userType",
        location,
        created_at as "createdAt"
      FROM user_profiles
      WHERE user_id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's listings
    const listingsResult = await pgAdapter.query(`
      SELECT 
        id,
        produce_type as "produceType",
        quantity,
        price_per_kg as "pricePerKg",
        status,
        created_at as "createdAt"
      FROM listings
      WHERE farmer_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      user: userResult.rows[0],
      listings: listingsResult.rows
    });
  } catch (error) {
    console.error('[DevController] Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

/**
 * PUT /api/dev/users/:id
 * Update user details
 */
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const { id } = req.params;
    const { name, phoneNumber, userType, location } = req.body;
    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (phoneNumber !== undefined) {
      updates.push(`mobile_number = $${paramIndex++}`);
      values.push(phoneNumber);
    }
    if (userType !== undefined) {
      updates.push(`user_type = $${paramIndex++}`);
      values.push(userType);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(JSON.stringify(location));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pgAdapter.query(`
      UPDATE user_profiles
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING user_id as id, name, mobile_number as "phoneNumber", user_type as "userType", location, created_at as "createdAt"
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DevController] Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * GET /api/dev/listings
 * Get all listings with filters
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const { farmerId, status, fromDate, toDate } = req.query;
    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();

    let query = `
      SELECT 
        l.id,
        l.farmer_id as "farmerId",
        u.name as "farmerName",
        l.produce_type as "produceType",
        l.quantity,
        l.price_per_kg as "pricePerKg",
        l.status,
        l.created_at as "createdAt",
        l.updated_at as "updatedAt"
      FROM listings l
      LEFT JOIN user_profiles u ON l.farmer_id = u.user_id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (farmerId) {
      query += ` AND l.farmer_id = $${paramIndex++}`;
      values.push(farmerId);
    }

    if (status) {
      query += ` AND l.status = $${paramIndex++}`;
      values.push(status);
    }

    if (fromDate) {
      query += ` AND l.created_at >= $${paramIndex++}`;
      values.push(fromDate);
    }

    if (toDate) {
      query += ` AND l.created_at <= $${paramIndex++}`;
      values.push(toDate);
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pgAdapter.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('[DevController] Get listings error:', error);
    res.status(500).json({ error: 'Failed to get listings' });
  }
});

/**
 * PUT /api/dev/listings/:id
 * Update listing details
 */
router.put('/listings/:id', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const { id } = req.params;
    const { produceType, quantity, pricePerKg, status } = req.body;
    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (produceType !== undefined) {
      updates.push(`produce_type = $${paramIndex++}`);
      values.push(produceType);
    }
    if (quantity !== undefined) {
      updates.push(`quantity = $${paramIndex++}`);
      values.push(quantity);
    }
    if (pricePerKg !== undefined) {
      updates.push(`price_per_kg = $${paramIndex++}`);
      values.push(pricePerKg);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);
    const result = await pgAdapter.query(`
      UPDATE listings
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        farmer_id as "farmerId",
        produce_type as "produceType",
        quantity,
        price_per_kg as "pricePerKg",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DevController] Update listing error:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});
