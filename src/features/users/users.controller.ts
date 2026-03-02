import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from '../../shared/types/common.types';
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
 * POST /api/users
 * Create a new user (farmer or buyer)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, phone, type, location } = req.body;
    
    // Handle both 'phone' and 'phoneNumber' for backward compatibility
    const userPhone = phoneNumber || phone;
    
    if (!userPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();
    
    // Check if user already exists in PostgreSQL
    const existingUserResult = await pgAdapter.query(
      'SELECT id, name, user_type as "userType", phone_number as "phoneNumber" FROM users WHERE phone_number = $1',
      [userPhone]
    );
    
    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0];
      return res.status(409).json({ 
        error: 'User with this phone number already exists',
        existingUser: {
          name: existingUser.name,
          userType: existingUser.userType,
          phoneNumber: existingUser.phoneNumber
        }
      });
    }
    
    // Normalize user type to lowercase for legacy User type
    const normalizedType = (type as string).toLowerCase() as 'farmer' | 'buyer' | 'both';
    
    const user = {
      id: uuidv4(),
      name,
      phoneNumber: userPhone,
      userType: normalizedType,
      location: typeof location === 'string' ? { address: location, latitude: 0, longitude: 0 } : location,
      createdAt: new Date()
    };

    // Create in PostgreSQL (will auto-propagate to SQLite via sync engine)
    await pgAdapter.createUser(user, undefined);
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * GET /api/users
 * Get all users from PostgreSQL (primary database)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbManager = getDbManager();
    const pgAdapter = dbManager.getPostgreSQLAdapter();
    
    // Query PostgreSQL for all users
    const result = await pgAdapter.query(`
      SELECT 
        id,
        name,
        phone_number as "phoneNumber",
        user_type as "userType",
        location,
        created_at as "createdAt"
      FROM users
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Export as usersController for feature-based architecture
export const usersController = router;
