import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from '../../shared/types/common.types';
import { db } from '../../shared/database/memory-db';

const router = Router();

/**
 * POST /api/users
 * Create a new user (farmer or buyer)
 */
router.post('/', (req: Request, res: Response) => {
  const { name, phone, type, location } = req.body;
  
  const user = db.createUser({
    id: uuidv4(),
    name,
    phone,
    type: type as UserType,
    location,
    createdAt: new Date()
  });

  res.status(201).json(user);
});

/**
 * GET /api/users
 * Get all users
 */
router.get('/', (req: Request, res: Response) => {
  res.json(db.getAllUsers());
});

// Export as usersController for feature-based architecture
export const usersController = router;
