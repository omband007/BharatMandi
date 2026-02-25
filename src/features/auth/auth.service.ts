import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserType } from '../../shared/types/common.types';
import type { User, OTPSession, CreateUserDTO, UpdateUserDTO, AuthResult, TokenPayload } from './auth.types';
import * as sqliteHelpers from '../../shared/database/sqlite-helpers';
import type { DatabaseManager } from '../../shared/database/db-abstraction';

// Track verified phone numbers (in production, use Redis with TTL)
const verifiedPhoneNumbers = new Set<string>();

// Get the shared DatabaseManager instance from app.ts
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized. This should be set by app.ts');
  }
  return dbManager;
}

// Encryption key for sensitive data (in production, use AWS KMS)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'bharat-mandi-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message: string;
}

/**
 * Encrypt sensitive data using AES-256
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalize phone number - remove +91 prefix if present
 * Converts +919876543210 or 919876543210 to 9876543210
 */
function normalizePhoneNumber(phoneNumber: string): string {
  let normalized = phoneNumber.trim();
  
  // Remove +91 prefix
  if (normalized.startsWith('+91')) {
    normalized = normalized.substring(3);
  } 
  // Remove 91 prefix if it's a 12-digit number starting with 91
  else if (normalized.startsWith('91') && normalized.length === 12) {
    normalized = normalized.substring(2);
  }
  
  return normalized;
}

/**
 * Send OTP via SMS (mock implementation)
 * In production, integrate with AWS Pinpoint or similar service
 */
async function sendOTP(phoneNumber: string, otp: string): Promise<void> {
  console.log(`[SMS] Sending OTP ${otp} to ${phoneNumber}`);
  // TODO: Integrate with AWS Pinpoint
}

/**
 * Request OTP for phone number
 */
export async function requestOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
  // Normalize phone number (remove +91 prefix if present)
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  // Validate phone number format (Indian mobile numbers - 10 digits starting with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(normalizedPhone)) {
    return { success: false, message: 'Invalid phone number format' };
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store OTP session in SQLite using normalized phone
  await sqliteHelpers.createOTPSession({
    phoneNumber: normalizedPhone,
    otp,
    expiresAt,
    attempts: 0
  });

  // Send OTP
  await sendOTP(normalizedPhone, otp);

  return { success: true, message: 'OTP sent successfully' };
}

/**
 * Verify OTP
 */
export async function verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string }> {
  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  const session = await sqliteHelpers.getOTPSession(normalizedPhone);

  if (!session) {
    return { success: false, message: 'No OTP session found. Please request a new OTP.' };
  }

  // Check expiration
  if (new Date() > session.expiresAt) {
    await sqliteHelpers.deleteOTPSession(normalizedPhone);
    return { success: false, message: 'OTP expired. Please request a new OTP.' };
  }

  // Check attempts
  if (session.attempts >= 3) {
    await sqliteHelpers.deleteOTPSession(normalizedPhone);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  // Verify OTP
  if (session.otp !== otp) {
    await sqliteHelpers.updateOTPAttempts(normalizedPhone, session.attempts + 1);
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  // OTP verified successfully - mark phone number as verified
  await sqliteHelpers.deleteOTPSession(normalizedPhone);
  verifiedPhoneNumbers.add(normalizedPhone);
  
  // Set TTL for verified status (5 minutes to complete registration)
  setTimeout(() => {
    verifiedPhoneNumbers.delete(normalizedPhone);
  }, 5 * 60 * 1000);

  return { success: true, message: 'OTP verified successfully' };
}

/**
 * Create new user account
 * Requires prior OTP verification (Property 13)
 */
export async function createUser(userData: {
  phoneNumber: string;
  name: string;
  userType: UserType;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
}): Promise<{ success: boolean; user?: User; message: string }> {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(userData.phoneNumber);
    
    // Property 13: Enforce OTP verification requirement
    if (!verifiedPhoneNumbers.has(normalizedPhone)) {
      return { 
        success: false, 
        message: 'Phone number not verified. Please complete OTP verification first.' 
      };
    }

    // Check if user already exists
    const existingUser = await getDbManager().getUserByPhone(normalizedPhone);

    if (existingUser) {
      return { success: false, message: 'User with this phone number already exists' };
    }

    // Create user with normalized phone
    const user: User = {
      id: uuidv4(),
      phoneNumber: normalizedPhone,
      name: userData.name,
      userType: userData.userType,
      location: userData.location,
      bankAccount: userData.bankAccount,
      createdAt: new Date()
    };

    try {
      await getDbManager().createUser(user);
    } catch (error) {
      // PostgreSQL unavailable - operation is queued for sync
      console.log('[Auth] User creation queued for sync:', error);
      // Continue - user is still created in SQLite via queue
    }

    // Remove from verified set after successful registration
    verifiedPhoneNumbers.delete(normalizedPhone);
    verifiedPhoneNumbers.delete(userData.phoneNumber);

    return { success: true, user, message: 'User created successfully' };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, message: 'Failed to create user' };
  }
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const user = await getDbManager().getUserByPhone(normalizedPhone);
    return user || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Get OTP for testing purposes only
 * WARNING: This should NEVER be exposed in production!
 */
export async function getOTPForTesting(phoneNumber: string): Promise<string | null> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('getOTPForTesting can only be called in test environment');
  }
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const session = await sqliteHelpers.getOTPSession(normalizedPhone);
  return session ? session.otp : null;
}

/**
 * Clear verified phone numbers (for testing)
 */
export function clearVerifiedPhoneNumbers(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearVerifiedPhoneNumbers can only be called in test environment');
  }
  verifiedPhoneNumbers.clear();
}

/**
 * Set up PIN for a user
 * Should be called after registration
 */
export async function setupPIN(phoneNumber: string, pin: string): Promise<{ success: boolean; message: string }> {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Validate PIN format (4-6 digits)
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(pin)) {
      return { success: false, message: 'PIN must be 4-6 digits' };
    }

    // Check if user exists
    const user = await getDbManager().getUserByPhone(normalizedPhone);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Hash the PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Update user with PIN hash
    try {
      await getDbManager().updateUserPin(phoneNumber, pinHash);
    } catch (error) {
      // PostgreSQL unavailable - operation is queued for sync
      console.log('[Auth] PIN update queued for sync:', error);
      // Continue - PIN is still updated in SQLite via queue
    }

    return { success: true, message: 'PIN set up successfully' };
  } catch (error) {
    console.error('Error setting up PIN:', error);
    return { success: false, message: 'Failed to set up PIN' };
  }
}

/**
 * Login with phone number and PIN
 */
export async function loginWithPIN(phoneNumber: string, pin: string): Promise<LoginResponse> {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    // Get user from database
    const user = await getDbManager().getUserByPhone(normalizedPhone);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Check if account is locked (using sqliteHelpers for now - local security feature)
    const lockInfo = await sqliteHelpers.getFailedAttempts(normalizedPhone);
    if (lockInfo?.locked_until && new Date() < new Date(lockInfo.locked_until)) {
      const lockTimeRemaining = Math.ceil((new Date(lockInfo.locked_until).getTime() - Date.now()) / 60000);
      return { 
        success: false, 
        message: `Account is locked. Please try again in ${lockTimeRemaining} minutes.` 
      };
    }

    // Get PIN hash (using sqliteHelpers for now - will be added to DatabaseManager later)
    const pinHash = await sqliteHelpers.getUserPinHash(normalizedPhone);

    // Check if PIN is set
    if (!pinHash) {
      return { success: false, message: 'PIN not set up. Please set up your PIN first.' };
    }

    // Verify PIN
    const pinValid = await bcrypt.compare(pin, pinHash);

    if (!pinValid) {
      // Increment failed login attempts
      const failedAttempts = (lockInfo?.failed_attempts || 0) + 1;
      
      if (failedAttempts >= 3) {
        // Lock account for 30 minutes
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await sqliteHelpers.lockAccount(normalizedPhone, lockUntil);
        return { 
          success: false, 
          message: 'Too many failed attempts. Account locked for 30 minutes.' 
        };
      } else {
        // Update failed attempts
        await sqliteHelpers.incrementFailedAttempts(normalizedPhone);
        return { 
          success: false, 
          message: `Invalid PIN. ${3 - failedAttempts} attempts remaining.` 
        };
      }
    }

    // PIN is valid - reset failed attempts
    await sqliteHelpers.resetFailedAttempts(phoneNumber);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        userType: user.userType
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return {
      success: true,
      token,
      user,
      message: 'Login successful'
    };
  } catch (error) {
    console.error('Error during login:', error);
    return { success: false, message: 'Login failed' };
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { valid: boolean; userId?: string; phoneNumber?: string; userType?: UserType } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      phoneNumber: string;
      userType: UserType;
    };
    return {
      valid: true,
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      userType: decoded.userType
    };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Login with biometric authentication
 * This requires the mobile app to first verify biometric locally,
 * then call this endpoint with a valid session token or phone number
 */
export async function loginWithBiometric(phoneNumber: string): Promise<LoginResponse> {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    // Get user from database
    const user = await getDbManager().getUserByPhone(normalizedPhone);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Check if account is locked (using sqliteHelpers for now - local security feature)
    const lockInfo = await sqliteHelpers.getFailedAttempts(normalizedPhone);
    if (lockInfo?.locked_until && new Date() < new Date(lockInfo.locked_until)) {
      const lockTimeRemaining = Math.ceil((new Date(lockInfo.locked_until).getTime() - Date.now()) / 60000);
      return { 
        success: false, 
        message: `Account is locked. Please try again in ${lockTimeRemaining} minutes.` 
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        userType: user.userType
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return{
      success: true,
      token,
      user,
      message: 'Biometric login successful'
    };
  } catch (error) {
    console.error('Error during biometric login:', error);
    return { success: false, message: 'Biometric login failed' };
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<{ success: boolean; user?: User; message: string }> {
  try {
    const user = await getDbManager().getUserById(userId);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    return { success: true, user, message: 'Profile retrieved successfully' };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, message: 'Failed to retrieve profile' };
  }
}

/**
 * Update user profile
 * Requires re-verification for sensitive data (phone number, bank account)
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    phoneNumber?: string;
    bankAccount?: {
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      accountHolderName: string;
    };
  },
  isPhoneVerified?: boolean
): Promise<{ success: boolean; user?: User; requiresVerification?: boolean; message: string }> {
  try {
    // Check if user exists
    const currentUser = await getDbManager().getUserById(userId);

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    // Check if sensitive data is being updated
    const isUpdatingPhone = updates.phoneNumber && updates.phoneNumber !== currentUser.phoneNumber;
    const isUpdatingBankAccount = updates.bankAccount !== undefined;

    // Require verification for sensitive data changes
    if ((isUpdatingPhone || isUpdatingBankAccount) && !isPhoneVerified) {
      return {
        success: false,
        requiresVerification: true,
        message: 'Phone verification required for updating sensitive data'
      };
    }

    // If updating phone number, check if new number is already in use
    if (isUpdatingPhone) {
      const existingPhone = await getDbManager().getUserByPhone(updates.phoneNumber!);

      if (existingPhone && existingPhone.id !== userId) {
        return { success: false, message: 'Phone number already in use' };
      }
    }

    // Update user in database
    try {
      const updatedUser = await getDbManager().updateUser(userId, {
        name: updates.name,
        location: updates.location
      });

      if (!updatedUser) {
        return { success: false, message: 'Failed to update user' };
      }

      return { 
        success: true, 
        user: updatedUser,
        message: 'Profile updated successfully' 
      };
    } catch (error) {
      // PostgreSQL unavailable - operation is queued for sync
      console.log('[Auth] Profile update queued for sync:', error);
      // Return success since update is queued
      return { 
        success: true, 
        user: currentUser,
        message: 'Profile update queued for sync' 
      };
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, message: 'Failed to update profile' };
  }
}
