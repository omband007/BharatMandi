/**
 * Authentication Service
 * 
 * Handles PIN/biometric authentication, JWT token management, and account security.
 * 
 * MIGRATED FROM: src/features/auth/auth.service.ts
 * ADAPTED FOR: UserProfile model (comprehensive profile data)
 * CHANGES: 
 * - User → UserProfile type
 * - JWT expiration: 7d → 30d
 * - Uses UserProfileModel instead of DatabaseManager
 * - Account lockout uses profile fields (failedLoginAttempts, lockedUntil)
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserProfileModel } from '../models/profile.sequelize.model';
import * as otpHelpers from '../../../shared/database/otp-helpers';
import type { UserProfile } from '../types/profile.types';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'bharat-mandi-secret-key-change-in-production';
const JWT_EXPIRY = '30d'; // 30 days (per unified spec - Requirement 8.9, 12.2)

// Account Lockout Configuration (per Requirement 24A)
const LOCKOUT_RULES = {
  MAX_FAILED_ATTEMPTS: 3,
  LOCKOUT_DURATION_MINUTES: 30,
  RESET_ON_SUCCESS: true,
  ALLOW_OTP_WHEN_LOCKED: true  // For account recovery
};

// ============================================================================
// TYPES
// ============================================================================

export interface TokenPayload {
  userId: string;
  mobileNumber: string;
  name?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  profile?: UserProfile;
  message: string;
}

export interface SetupPINResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// PIN MANAGEMENT
// ============================================================================

/**
 * Setup PIN for a user
 * Requirement 6: Optional PIN Setup
 */
export async function setupPIN(userId: string, pin: string, confirmPin: string): Promise<SetupPINResponse> {
  try {
    // Validate PIN format (4-6 digits)
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(pin)) {
      return { success: false, message: 'PIN must be 4-6 digits' };
    }

    // Validate PIN confirmation
    if (pin !== confirmPin) {
      return { success: false, message: 'PIN and confirmation do not match' };
    }

    // Get user profile
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    // Check if PIN is already set
    if (profile.pinHash) {
      return { success: false, message: 'PIN already set. Use change PIN to update.' };
    }

    // Hash the PIN (bcrypt with salt rounds: 10)
    const pinHash = await bcrypt.hash(pin, 10);

    // Update profile with PIN hash
    profile.pinHash = pinHash;
    profile.updatedAt = new Date();
    await profile.save();

    return { success: true, message: 'PIN set up successfully' };
  } catch (error) {
    console.error('[AuthService] Error setting up PIN:', error);
    return { success: false, message: 'Failed to set up PIN' };
  }
}

/**
 * Change PIN for a user (requires OTP verification first)
 * Requirement 23: Password Reset (PIN Reset)
 */
export async function changePIN(
  userId: string,
  newPin: string,
  confirmNewPin: string
): Promise<SetupPINResponse> {
  try {
    // Validate new PIN format
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(newPin)) {
      return { success: false, message: 'New PIN must be 4-6 digits' };
    }

    // Validate PIN confirmation
    if (newPin !== confirmNewPin) {
      return { success: false, message: 'New PIN and confirmation do not match' };
    }

    // Get user profile
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    // Hash the new PIN
    const pinHash = await bcrypt.hash(newPin, 10);

    // Update profile with new PIN hash
    profile.pinHash = pinHash;
    profile.updatedAt = new Date();
    await profile.save();

    // Log PIN change event for security audit
    console.log(`[AuthService] PIN changed for user ${userId}`);

    return { success: true, message: 'PIN changed successfully' };
  } catch (error) {
    console.error('[AuthService] Error changing PIN:', error);
    return { success: false, message: 'Failed to change PIN' };
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Login with PIN
 * Requirements: 10 (PIN Login), 24A (Account Lockout Protection)
 */
export async function loginWithPIN(mobileNumber: string, pin: string): Promise<LoginResponse> {
  try {
    // Get user profile by mobile number
    const profile = await UserProfileModel.findOne({ where: { mobileNumber } });
    if (!profile) {
      return { success: false, message: 'User not found' };
    }

    // Check if account is locked (Requirement 24A.3)
    if (isAccountLocked(profile)) {
      const remainingMinutes = Math.ceil((profile.lockedUntil!.getTime() - Date.now()) / 60000);
      return {
        success: false,
        message: `Account is locked. Try again in ${remainingMinutes} minutes or use OTP login.`
      };
    }

    // Check if PIN is set
    if (!profile.pinHash) {
      return { success: false, message: 'PIN not set up. Please set up your PIN first.' };
    }

    // Verify PIN
    const pinValid = await bcrypt.compare(pin, profile.pinHash);

    if (!pinValid) {
      // Handle failed login attempt
      await handleFailedLogin(profile.userId, 'pin');
      
      const attemptsRemaining = LOCKOUT_RULES.MAX_FAILED_ATTEMPTS - (profile.failedLoginAttempts + 1);
      
      if (attemptsRemaining <= 0) {
        return {
          success: false,
          message: 'Too many failed attempts. Account locked for 30 minutes.'
        };
      }
      
      return {
        success: false,
        message: `Invalid PIN. ${attemptsRemaining} attempts remaining.`
      };
    }

    // PIN is valid - handle successful login
    await handleSuccessfulLogin(profile.userId);

    // Generate JWT token
    const token = generateToken(profile);

    // Convert profile to plain object for response
    const profileObj = profile.toJSON();
    // Remove sensitive fields
    delete (profileObj as any).pinHash;

    return {
      success: true,
      token,
      profile: profileObj as unknown as UserProfile,
      message: 'Login successful'
    };
  } catch (error) {
    console.error('[AuthService] Error during PIN login:', error);
    return { success: false, message: 'Login failed' };
  }
}

/**
 * Login with biometric authentication
 * Requirements: 11 (Biometric Login), 24A (Account Lockout Protection)
 * 
 * Note: This requires the mobile app to first verify biometric locally,
 * then call this endpoint with the mobile number
 */
export async function loginWithBiometric(mobileNumber: string): Promise<LoginResponse> {
  try {
    // Get user profile by mobile number
    const profile = await UserProfileModel.findOne({ where: { mobileNumber } });
    if (!profile) {
      return { success: false, message: 'User not found' };
    }

    // Check if biometric is enabled
    if (!profile.biometricEnabled) {
      return {
        success: false,
        message: 'Biometric authentication not enabled. Please enable it in settings.'
      };
    }

    // Check if account is locked (Requirement 24A.3)
    if (isAccountLocked(profile)) {
      const remainingMinutes = Math.ceil((profile.lockedUntil!.getTime() - Date.now()) / 60000);
      return {
        success: false,
        message: `Account is locked. Try again in ${remainingMinutes} minutes or use OTP login.`
      };
    }

    // Biometric verification happens on device - if we reach here, it succeeded
    // Handle successful login
    await handleSuccessfulLogin(profile.userId);

    // Generate JWT token
    const token = generateToken(profile);

    // Convert profile to plain object for response
    const profileObj = profile.toJSON();
    // Remove sensitive fields
    delete (profileObj as any).pinHash;

    return {
      success: true,
      token,
      profile: profileObj as unknown as UserProfile,
      message: 'Biometric login successful'
    };
  } catch (error) {
    console.error('[AuthService] Error during biometric login:', error);
    return { success: false, message: 'Biometric login failed' };
  }
}
/**
 * Login with OTP (for existing users)
 * Always available, even when account is locked (account recovery)
 * Requirements: 9.1-9.7, 24A.8
 */
export async function loginWithOTP(mobileNumber: string, otp: string): Promise<LoginResponse> {
  try {
    // Get OTP session
    const session = await otpHelpers.getOTPSession(mobileNumber);
    if (!session) {
      return {
        success: false,
        message: 'OTP session not found or expired'
      };
    }

    // Check if OTP has expired
    if (new Date() > session.expiresAt) {
      await otpHelpers.deleteOTPSession(session.phoneNumber);
      return {
        success: false,
        message: 'OTP has expired. Please request a new one'
      };
    }

    // Check attempts
    if (session.attempts >= 3) {
      await otpHelpers.deleteOTPSession(session.phoneNumber);
      return {
        success: false,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP'
      };
    }

    // Verify OTP
    if (session.otp !== otp) {
      // Increment attempts
      await otpHelpers.updateOTPAttempts(session.phoneNumber, session.attempts + 1);
      return {
        success: false,
        message: 'Invalid OTP'
      };
    }

    // OTP verified - get user profile
    const profile = await UserProfileModel.findOne({ where: { mobileNumber } });
    if (!profile) {
      await otpHelpers.deleteOTPSession(session.phoneNumber);
      return {
        success: false,
        message: 'User not found. Please register first'
      };
    }

    // Delete OTP session
    await otpHelpers.deleteOTPSession(session.phoneNumber);

    // Reset failed login attempts and unlock account (OTP login bypasses lockout)
    await handleSuccessfulLogin(profile.userId);

    // Generate JWT token
    const token = generateToken(profile);

    return {
      success: true,
      token,
      profile: profile.toJSON() as unknown as UserProfile,
      message: 'OTP login successful'
    };
  } catch (error) {
    console.error('[AuthService] OTP login error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'OTP login failed'
    };
  }
}

// ============================================================================
// JWT TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate JWT token for authenticated user
 * Requirement 12: Session Management
 */
export function generateToken(profile: UserProfile | any): string {
  const payload: TokenPayload = {
    userId: profile.userId,
    mobileNumber: profile.mobileNumber,
    name: profile.name || undefined
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify JWT token
 * Requirement 12.4: Validate tokens on protected API endpoints
 */
export function verifyToken(token: string): { valid: boolean; payload?: TokenPayload } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return {
      valid: true,
      payload: decoded
    };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Refresh JWT token
 * Requirement 12.5: Refresh tokens automatically before expiration
 */
export function refreshToken(currentToken: string): { success: boolean; token?: string; message: string } {
  try {
    const verification = verifyToken(currentToken);
    
    if (!verification.valid || !verification.payload) {
      return { success: false, message: 'Invalid token' };
    }

    // Generate new token with same payload
    const newToken = jwt.sign(verification.payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    return {
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    };
  } catch (error) {
    console.error('[AuthService] Error refreshing token:', error);
    return { success: false, message: 'Failed to refresh token' };
  }
}

// ============================================================================
// ACCOUNT SECURITY
// ============================================================================

/**
 * Check if account is locked
 * Requirement 24A.4: Auto-unlock after lockout period
 */
export function isAccountLocked(profile: UserProfile | any): boolean {
  if (!profile.lockedUntil) {
    return false;
  }

  // Check if lockout period has expired (auto-unlock)
  if (new Date() > profile.lockedUntil) {
    return false;
  }

  return true;
}

/**
 * Handle failed login attempt
 * Requirement 24A: Account Lockout Protection
 */
export async function handleFailedLogin(userId: string, method: 'pin' | 'biometric'): Promise<void> {
  try {
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Increment failed attempts (Requirement 24A.1, 24A.2)
    profile.failedLoginAttempts += 1;

    // Check if lockout threshold reached
    if (profile.failedLoginAttempts >= LOCKOUT_RULES.MAX_FAILED_ATTEMPTS) {
      // Lock account for 30 minutes (Requirement 24A.1, 24A.2)
      const lockoutUntil = new Date(Date.now() + LOCKOUT_RULES.LOCKOUT_DURATION_MINUTES * 60 * 1000);
      profile.lockedUntil = lockoutUntil;

      // Log security event (Requirement 24A.9)
      console.log(`[AuthService] Account locked for user ${userId} due to ${LOCKOUT_RULES.MAX_FAILED_ATTEMPTS} failed ${method} attempts`);

      // TODO: Send SMS notification (Requirement 24A.10)
      // await sendSMS(profile.mobileNumber, 
      //   `Your account has been locked for ${LOCKOUT_RULES.LOCKOUT_DURATION_MINUTES} minutes due to multiple failed login attempts.`
      // );
    }

    profile.updatedAt = new Date();
    await profile.save();
  } catch (error) {
    console.error('[AuthService] Error handling failed login:', error);
  }
}

/**
 * Handle successful login
 * Requirement 24A.5: Reset failed attempt counter on successful login
 */
export async function handleSuccessfulLogin(userId: string): Promise<void> {
  try {
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Reset failed attempts counter (Requirement 24A.5)
    if (LOCKOUT_RULES.RESET_ON_SUCCESS) {
      profile.failedLoginAttempts = 0;
      profile.lockedUntil = undefined;
    }

    // Update last login timestamp (Requirement 12.8)
    profile.lastLoginAt = new Date();
    profile.lastActiveAt = new Date();

    await profile.save();
  } catch (error) {
    console.error('[AuthService] Error handling successful login:', error);
  }
}

/**
 * Enable biometric authentication for a user
 * Requirement 7: Optional Biometric Setup
 */
export async function enableBiometric(userId: string): Promise<SetupPINResponse> {
  try {
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    profile.biometricEnabled = true;
    profile.updatedAt = new Date();
    await profile.save();

    return { success: true, message: 'Biometric authentication enabled' };
  } catch (error) {
    console.error('[AuthService] Error enabling biometric:', error);
    return { success: false, message: 'Failed to enable biometric authentication' };
  }
}

/**
 * Disable biometric authentication for a user
 * Requirement 7.7: Allow users to disable biometric authentication
 */
export async function disableBiometric(userId: string): Promise<SetupPINResponse> {
  try {
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    profile.biometricEnabled = false;
    profile.updatedAt = new Date();
    await profile.save();

    return { success: true, message: 'Biometric authentication disabled' };
  } catch (error) {
    console.error('[AuthService] Error disabling biometric:', error);
    return { success: false, message: 'Failed to disable biometric authentication' };
  }
}





