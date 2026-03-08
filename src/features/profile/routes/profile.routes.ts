/**
 * Profile Management Routes
 * 
 * API endpoints for profile registration, management, and gamification.
 */

import { Router, Request, Response } from 'express';
import { RegistrationService } from '../services/registration.service';
import { ProfileManagerService } from '../services/profile-manager.service';
import { ProfilePictureService } from '../services/profile-picture.service';
import { requireAuth, requireSelfOrAdmin } from '../middleware/auth.middleware';
import type { RegisterRequest, VerifyOTPRequest } from '../types/profile.types';

const router = Router();
const registrationService = new RegistrationService();
const profileManager = new ProfileManagerService();
const profilePictureService = new ProfilePictureService();

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
 * Verify OTP and complete registration with mandatory fields
 * Returns JWT token for immediate authentication
 * Requirements: 2.7, 3.1-3.14
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const request: VerifyOTPRequest = {
      userId: req.body.userId,
      otp: req.body.otp,
      name: req.body.name,
      userType: req.body.userType,
      location: req.body.location
    };

    // Validate request
    if (!request.userId || !request.otp) {
      return res.status(400).json({
        success: false,
        error: 'User ID and OTP are required'
      });
    }

    if (!request.name || !request.userType || !request.location) {
      return res.status(400).json({
        success: false,
        error: 'Name, user type, and location are required for registration'
      });
    }

    const response = await registrationService.verifyOTP(request);

    res.status(200).json({
      success: true,
      data: {
        verified: response.verified,
        profile: response.profile,
        token: response.token  // JWT token for authenticated session
      }
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

    const result = await registrationService.resendOTP(mobileNumber);

    res.status(200).json({
      success: true,
      data: result
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
 * Get user profile (requires authentication)
 */
router.get('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await profileManager.getProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    // Apply privacy filters (for now, assume platform context)
    const filtered = profileManager.applyPrivacyFilters(profile, 'platform');

    res.status(200).json({
      success: true,
      data: filtered
    });
  } catch (error) {
    console.error('[ProfileRoutes] Get profile error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile'
    });
  }
});

/**
 * PATCH /api/v1/profiles/:userId/fields
 * Update profile field (requires authentication and self-access)
 */
router.patch('/:userId/fields', requireAuth, requireSelfOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { fieldName, value } = req.body;

    if (!fieldName || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Field name and value are required'
      });
    }

    const result = await profileManager.updateProfileField(userId, fieldName, value);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[ProfileRoutes] Update field error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update field'
    });
  }
});

/**
 * GET /api/v1/profiles/:userId/export
 * Export profile data
 */
router.get('/:userId/export', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const data = await profileManager.exportProfileData(userId);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ProfileRoutes] Export profile error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export profile'
    });
  }
});

/**
 * DELETE /api/v1/profiles/:userId
 * Delete user profile
 */
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const deleted = await profileManager.deleteProfile(userId);

    res.status(200).json({
      success: true,
      data: { deleted }
    });
  } catch (error) {
    console.error('[ProfileRoutes] Delete profile error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete profile'
    });
  }
});

/**
 * POST /api/v1/profiles/:userId/picture
 * Upload profile picture (requires authentication and self-access)
 */
router.post('/:userId/picture', requireAuth, requireSelfOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // In production, use multer or similar for file upload
    // For now, expect base64 encoded image in body
    const { imageData, mimeType } = req.body;

    if (!imageData || !mimeType) {
      return res.status(400).json({
        success: false,
        error: 'Image data and MIME type are required'
      });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, 'base64');

    const profilePicture = await profilePictureService.uploadProfilePicture(
      userId,
      buffer,
      mimeType,
      buffer.length
    );

    res.status(200).json({
      success: true,
      data: profilePicture
    });
  } catch (error) {
    console.error('[ProfileRoutes] Upload picture error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload picture'
    });
  }
});

/**
 * DELETE /api/v1/profiles/:userId/picture
 * Remove profile picture
 */
router.delete('/:userId/picture', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const removed = await profilePictureService.removeProfilePicture(userId);

    res.status(200).json({
      success: true,
      data: { removed }
    });
  } catch (error) {
    console.error('[ProfileRoutes] Remove picture error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove picture'
    });
  }
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
