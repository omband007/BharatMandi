/**
 * Authentication Routes
 * 
 * API endpoints for PIN/biometric authentication, JWT token management, and account security.
 * 
 * CREATED FOR: Unified authentication & profile management
 * INTEGRATES WITH: src/features/profile/services/auth.service.ts
 */

import { Router, Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { RegistrationService } from '../services/registration.service';

const router = Router();
const registrationService = new RegistrationService();

// ============================================================================
// PIN MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/profiles/auth/setup-pin
 * Set up PIN for a user
 * Requirement 6: Optional PIN Setup
 */
router.post('/setup-pin', async (req: Request, res: Response) => {
  try {
    const { userId, pin, confirmPin } = req.body;

    // Validate request
    if (!userId || !pin || !confirmPin) {
      return res.status(400).json({
        success: false,
        error: 'User ID, PIN, and confirmation are required'
      });
    }

    const result = await authService.setupPIN(userId, pin, confirmPin);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] Setup PIN error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set up PIN'
    });
  }
});

/**
 * POST /api/v1/profiles/auth/change-pin
 * Change PIN for a user (requires OTP verification first)
 * Requirement 23: Password Reset (PIN Reset)
 * 
 * Note: OTP verification should be done before calling this endpoint
 */
router.post('/change-pin', async (req: Request, res: Response) => {
  try {
    const { userId, otp, newPin, confirmNewPin } = req.body;

    // Validate request
    if (!userId || !otp || !newPin || !confirmNewPin) {
      return res.status(400).json({
        success: false,
        error: 'User ID, OTP, new PIN, and confirmation are required'
      });
    }

    // TODO: Verify OTP before allowing PIN change
    // For now, we'll assume OTP was verified in a previous step
    // In production, implement OTP verification here

    const result = await authService.changePIN(userId, newPin, confirmNewPin);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] Change PIN error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change PIN'
    });
  }
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/profiles/auth/login/pin
 * Login with mobile number and PIN
 * Requirements: 10 (PIN Login), 24A (Account Lockout Protection)
 */
router.post('/login/pin', async (req: Request, res: Response) => {
  try {
    const { mobileNumber, pin } = req.body;

    // Validate request
    if (!mobileNumber || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number and PIN are required'
      });
    }

    const result = await authService.loginWithPIN(mobileNumber, pin);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: result.token,
        profile: result.profile
      },
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] PIN login error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

/**
 * POST /api/v1/profiles/auth/login/biometric
 * Login with biometric authentication
 * Requirements: 11 (Biometric Login), 24A (Account Lockout Protection)
 * 
 * Note: Biometric verification happens on the device first
 */
router.post('/login/biometric', async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;

    // Validate request
    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is required'
      });
    }

    // Note: In production, you might want to verify a biometric token here
    // For now, we assume the device has already verified biometric locally

    const result = await authService.loginWithBiometric(mobileNumber);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: result.token,
        profile: result.profile
      },
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] Biometric login error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Biometric login failed'
    });
  }
});

/**
 * POST /api/v1/profiles/auth/login/otp
 * Login with OTP (always available, even when account is locked)
 * Requirement 9: OTP Login
 * Requirement 24A.8: Allow OTP-based login even when account is locked
 * 
 * Note: This uses the existing registration service OTP flow
 */
router.post('/login/otp', async (req: Request, res: Response) => {
  try {
    const { mobileNumber, otp } = req.body;

    // Validate request
    if (!mobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number and OTP are required'
      });
    }

    // Login with OTP using auth service
    const loginResult = await authService.loginWithOTP(mobileNumber, otp);

    if (!loginResult.success) {
      return res.status(401).json({
        success: false,
        error: loginResult.message || 'Invalid or expired OTP'
      });
    }

    // OTP verified and login successful
    res.status(200).json({
      success: true,
      data: {
        token: loginResult.token,
        profile: loginResult.profile
      },
      message: 'OTP login successful'
    });
  } catch (error) {
    console.error('[AuthRoutes] OTP login error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'OTP login failed'
    });
  }
});

// ============================================================================
// TOKEN MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/profiles/auth/verify-token
 * Verify JWT token
 * Requirement 12.4: Validate tokens on protected API endpoints
 */
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    // Validate request
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const result = authService.verifyToken(token);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        payload: result.payload
      }
    });
  } catch (error) {
    console.error('[AuthRoutes] Verify token error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Token verification failed'
    });
  }
});

/**
 * POST /api/v1/profiles/auth/refresh-token
 * Refresh JWT token
 * Requirement 12.5: Refresh tokens automatically before expiration
 */
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    // Validate request
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const result = authService.refreshToken(token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: result.token
      },
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

/**
 * POST /api/v1/profiles/auth/logout
 * Logout (invalidate session)
 * Requirement 12.6: Allow users to log out and invalidate their session
 * 
 * Note: With JWT, logout is typically handled client-side by removing the token.
 * For server-side logout, you would need to implement a token blacklist.
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // The client should remove the token from storage
    
    // TODO: Implement token blacklist if server-side logout is required
    // For now, we'll just return success

    res.status(200).json({
      success: true,
      message: 'Logged out successfully. Please remove the token from client storage.'
    });
  } catch (error) {
    console.error('[AuthRoutes] Logout error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed'
    });
  }
});

// ============================================================================
// BIOMETRIC MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/profiles/auth/biometric/enable
 * Enable biometric authentication
 * Requirement 7: Optional Biometric Setup
 */
router.post('/biometric/enable', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate request
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const result = await authService.enableBiometric(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] Enable biometric error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable biometric'
    });
  }
});

/**
 * POST /api/v1/profiles/auth/biometric/disable
 * Disable biometric authentication
 * Requirement 7.7: Allow users to disable biometric authentication
 */
router.post('/biometric/disable', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate request
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const result = await authService.disableBiometric(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[AuthRoutes] Disable biometric error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable biometric'
    });
  }
});

export default router;

