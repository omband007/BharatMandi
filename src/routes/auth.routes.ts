import express, { Request, Response } from 'express';
import { requestOTP, verifyOTP, createUser, getUserByPhone } from '../services/auth.service';
import { UserType } from '../types';

const router = express.Router();

/**
 * POST /api/auth/request-otp
 * Request OTP for phone number
 */
router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const result = await requestOTP(phoneNumber);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const result = await verifyOTP(phoneNumber, otp);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Check if user exists
    const existingUser = await getUserByPhone(phoneNumber);

    res.json({
      message: result.message,
      userExists: !!existingUser,
      user: existingUser
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, name, userType, location, bankAccount } = req.body;

    // Validate required fields
    if (!phoneNumber || !name || !userType || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate user type
    if (!Object.values(UserType).includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    // Validate location
    if (!location.latitude || !location.longitude || !location.address) {
      return res.status(400).json({ error: 'Invalid location data' });
    }

    const result = await createUser({
      phoneNumber,
      name,
      userType,
      location,
      bankAccount
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.status(201).json({
      message: result.message,
      user: result.user
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/user/:phoneNumber
 * Get user by phone number
 */
router.get('/user/:phoneNumber', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.params;

    const user = await getUserByPhone(phoneNumber);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
