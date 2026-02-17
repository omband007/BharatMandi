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

import { setupPIN, loginWithPIN, loginWithBiometric, verifyToken } from '../services/auth.service';

/**
 * POST /api/auth/setup-pin
 * Set up PIN for a user
 */
router.post('/setup-pin', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, pin } = req.body;

    if (!phoneNumber || !pin) {
      return res.status(400).json({ error: 'Phone number and PIN are required' });
    }

    const result = await setupPIN(phoneNumber, pin);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message });
  } catch (error) {
    console.error('Error setting up PIN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login with phone number and PIN
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, pin } = req.body;

    if (!phoneNumber || !pin) {
      return res.status(400).json({ error: 'Phone number and PIN are required' });
    }

    const result = await loginWithPIN(phoneNumber, pin);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: result.message,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login/biometric
 * Login with biometric authentication
 * Note: The mobile app should verify biometric locally first,
 * then call this endpoint with the phone number
 */
router.post('/login/biometric', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const result = await loginWithBiometric(phoneNumber);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: result.message,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Error during biometric login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify-token
 * Verify JWT token
 */
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = verifyToken(token);

    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({
      valid: true,
      userId: result.userId,
      phoneNumber: result.phoneNumber,
      userType: result.userType
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

import { getUserProfile, updateUserProfile } from '../services/auth.service';

/**
 * GET /api/auth/profile/:userId
 * Get user profile
 */
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await getUserProfile(userId);

    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }

    res.json({
      message: result.message,
      user: result.user
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/auth/profile/:userId
 * Update user profile
 * Requires OTP verification for sensitive data changes (phone, bank account)
 */
router.put('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, location, phoneNumber, bankAccount, isPhoneVerified } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await updateUserProfile(
      userId,
      {
        name,
        location,
        phoneNumber,
        bankAccount
      },
      isPhoneVerified
    );

    if (!result.success) {
      if (result.requiresVerification) {
        return res.status(403).json({
          error: result.message,
          requiresVerification: true
        });
      }
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: result.message,
      user: result.user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
