/**
 * Profile Management Routes
 * 
 * API endpoints for profile registration, management, and gamification.
 */

import { Router, Request, Response } from 'express';
import { RegistrationService } from '../services/registration.service';
import type { RegisterRequest, VerifyOTPRequest } from '../types/profile.types';

const router = Router();
const registrationService = new RegistrationService();

// ============================================================================
// REGISTRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/profiles/register
 * Initiate registration with mobile number
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const request: RegisterRequest = {
      mobileNumber: req.body.mobileNumber,
      referralCode: req.body.referralCode
    };

    // Validate request
    if (!request.mobileNumber) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is required'
      });
    }

    const response = await registrationService.register(request);

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[ProfileRoutes] Registration error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed'
    });
  }
});

/**
 * POST /api/v1/profiles/verify-otp
 * Verify OTP and create user profile
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const request: VerifyOTPRequest = {
      userId: req.body.userId,
      otp: req.body.otp
    };

    // Validate request
    if (!request.userId || !request.otp) {
      return res.status(400).json({
        success: false,
        error: 'User ID and OTP are required'
      });
    }

    const response = await registrationService.verifyOTP(request);

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[ProfileRoutes] OTP verification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'OTP verification failed'
    });
  }
});

/**
 * POST /api/v1/profiles/resend-otp
 * Resend OTP to mobile number
 */
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is required'
      });
    }

    const otpSent = await registrationService.resendOTP(mobileNumber);

    res.status(200).json({
      success: true,
      data: { otpSent }
    });
  } catch (error) {
    console.error('[ProfileRoutes] Resend OTP error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend OTP'
    });
  }
});

// ============================================================================
// PROFILE MANAGEMENT ENDPOINTS (TODO: Implement in next tasks)
// ============================================================================

/**
 * GET /api/v1/profiles/:userId
 * Get user profile
 */
router.get('/:userId', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
});

/**
 * PATCH /api/v1/profiles/:userId/fields
 * Update profile field
 */
router.patch('/:userId/fields', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
});

/**
 * POST /api/v1/profiles/:userId/picture
 * Upload profile picture
 */
router.post('/:userId/picture', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
});

// ============================================================================
// GAMIFICATION ENDPOINTS (TODO: Implement in next tasks)
// ============================================================================

/**
 * GET /api/v1/profiles/:userId/dashboard
 * Get integrated dashboard
 */
router.get('/:userId/dashboard', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
});

export default router;
