import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { pool } from '../database/pg-config';
import { UserType } from '../types';

interface OTPSession {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
}

interface User {
  id: string;
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
    accountHolderName: string;
  };
  createdAt: Date;
}

// In-memory OTP storage (in production, use Redis)
const otpSessions = new Map<string, OTPSession>();

// Track verified phone numbers (in production, use Redis with TTL)
const verifiedPhoneNumbers = new Set<string>();

// Encryption key for sensitive data (in production, use AWS KMS)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

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
 * Send OTP via SMS (mock implementation)
 * In production, integrate with AWS Pinpoint or similar service
 */
async function sendOTP(phoneNumber: string, otp: string): Promise<void> {
  console.log(`[SMS] Sending OTP ${otp} to ${phoneNumber}`);
  // TODO: Integrate with AWS Pinpoint
  // await pinpoint.sendMessages({
  //   ApplicationId: process.env.PINPOINT_APP_ID,
  //   MessageRequest: {
  //     Addresses: {
  //       [phoneNumber]: { ChannelType: 'SMS' }
  //     },
  //     MessageConfiguration: {
  //       SMSMessage: {
  //         Body: `Your Bharat Mandi OTP is: ${otp}. Valid for 10 minutes.`,
  //         MessageType: 'TRANSACTIONAL'
  //       }
  //     }
  //   }
  // }).promise();
}

/**
 * Request OTP for phone number
 */
export async function requestOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
  // Validate phone number format (Indian mobile numbers)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return { success: false, message: 'Invalid phone number format' };
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store OTP session
  otpSessions.set(phoneNumber, {
    phoneNumber,
    otp,
    expiresAt,
    attempts: 0
  });

  // Send OTP
  await sendOTP(phoneNumber, otp);

  return { success: true, message: 'OTP sent successfully' };
}

/**
 * Verify OTP
 */
export async function verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string }> {
  const session = otpSessions.get(phoneNumber);

  if (!session) {
    return { success: false, message: 'No OTP session found. Please request a new OTP.' };
  }

  // Check expiration
  if (new Date() > session.expiresAt) {
    otpSessions.delete(phoneNumber);
    return { success: false, message: 'OTP expired. Please request a new OTP.' };
  }

  // Check attempts
  if (session.attempts >= 3) {
    otpSessions.delete(phoneNumber);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  // Verify OTP
  if (session.otp !== otp) {
    session.attempts++;
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  // OTP verified successfully - mark phone number as verified
  otpSessions.delete(phoneNumber);
  verifiedPhoneNumbers.add(phoneNumber);
  
  // Set TTL for verified status (5 minutes to complete registration)
  setTimeout(() => {
    verifiedPhoneNumbers.delete(phoneNumber);
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
    accountHolderName: string;
  };
}): Promise<{ success: boolean; user?: User; message: string }> {
  try {
    // Property 13: Enforce OTP verification requirement
    if (!verifiedPhoneNumbers.has(userData.phoneNumber)) {
      return { 
        success: false, 
        message: 'Phone number not verified. Please complete OTP verification first.' 
      };
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [userData.phoneNumber]
    );

    if (existingUser.rows.length > 0) {
      return { success: false, message: 'User with this phone number already exists' };
    }

    // Encrypt sensitive data
    const encryptedBankAccount = userData.bankAccount
      ? encrypt(JSON.stringify(userData.bankAccount))
      : null;

    // Create user
    const userId = uuidv4();
    const result = await pool.query(
      `INSERT INTO users (id, phone, name, type, location, bank_account_number, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, phone, name, type, location, created_at`,
      [
        userId,
        userData.phoneNumber,
        userData.name,
        userData.userType,
        userData.location.address,
        encryptedBankAccount
      ]
    );

    // Remove from verified set after successful registration
    verifiedPhoneNumbers.delete(userData.phoneNumber);

    const user: User = {
      id: result.rows[0].id,
      phoneNumber: result.rows[0].phone,
      name: result.rows[0].name,
      userType: result.rows[0].type,
      location: userData.location,
      createdAt: result.rows[0].created_at
    };

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
    const result = await pool.query(
      `SELECT id, phone, name, type, location, bank_account_number, created_at
       FROM users
       WHERE phone = $1`,
      [phoneNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const user: User = {
      id: row.id,
      phoneNumber: row.phone,
      name: row.name,
      userType: row.type,
      location: {
        latitude: 0,
        longitude: 0,
        address: row.location
      },
      createdAt: row.created_at
    };

    // Decrypt bank account if exists
    if (row.bank_account_number) {
      try {
        user.bankAccount = JSON.parse(decrypt(row.bank_account_number));
      } catch (e) {
        // If decryption fails, skip bank account
        console.error('Failed to decrypt bank account:', e);
      }
    }

    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Get OTP for testing purposes only
 * WARNING: This should NEVER be exposed in production!
 */
export function getOTPForTesting(phoneNumber: string): string | null {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('getOTPForTesting can only be called in test environment');
  }
  const session = otpSessions.get(phoneNumber);
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

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
 * Set up PIN for a user
 * Should be called after registration
 */
export async function setupPIN(phoneNumber: string, pin: string): Promise<{ success: boolean; message: string }> {
  try {
    // Validate PIN format (4-6 digits)
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(pin)) {
      return { success: false, message: 'PIN must be 4-6 digits' };
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phoneNumber]
    );

    if (userResult.rows.length === 0) {
      return { success: false, message: 'User not found' };
    }

    // Hash the PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Update user with PIN hash
    await pool.query(
      'UPDATE users SET pin_hash = $1, updated_at = NOW() WHERE phone = $2',
      [pinHash, phoneNumber]
    );

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
    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    // Get user from database
    const result = await pool.query(
      `SELECT id, phone, name, type, location, bank_account_number, pin_hash, 
              failed_login_attempts, account_locked_until, created_at
       FROM users
       WHERE phone = $1`,
      [phoneNumber]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'User not found' };
    }

    const row = result.rows[0];

    // Check if account is locked
    if (row.account_locked_until && new Date() < new Date(row.account_locked_until)) {
      const lockTimeRemaining = Math.ceil((new Date(row.account_locked_until).getTime() - Date.now()) / 60000);
      return { 
        success: false, 
        message: `Account is locked. Please try again in ${lockTimeRemaining} minutes.` 
      };
    }

    // Check if PIN is set
    if (!row.pin_hash) {
      return { success: false, message: 'PIN not set up. Please set up your PIN first.' };
    }

    // Verify PIN
    const pinValid = await bcrypt.compare(pin, row.pin_hash);

    if (!pinValid) {
      // Increment failed login attempts
      const failedAttempts = (row.failed_login_attempts || 0) + 1;
      
      if (failedAttempts >= 3) {
        // Lock account for 30 minutes
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await pool.query(
          `UPDATE users 
           SET failed_login_attempts = $1, account_locked_until = $2, updated_at = NOW()
           WHERE phone = $3`,
          [failedAttempts, lockUntil, phoneNumber]
        );
        return { 
          success: false, 
          message: 'Too many failed attempts. Account locked for 30 minutes.' 
        };
      } else {
        // Update failed attempts
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1, updated_at = NOW() WHERE phone = $2',
          [failedAttempts, phoneNumber]
        );
        return { 
          success: false, 
          message: `Invalid PIN. ${3 - failedAttempts} attempts remaining.` 
        };
      }
    }

    // PIN is valid - reset failed attempts and update last login
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = 0, account_locked_until = NULL, 
           last_login_at = NOW(), updated_at = NOW()
       WHERE phone = $1`,
      [phoneNumber]
    );

    // Create user object
    const user: User = {
      id: row.id,
      phoneNumber: row.phone,
      name: row.name,
      userType: row.type,
      location: {
        latitude: 0,
        longitude: 0,
        address: row.location
      },
      createdAt: row.created_at
    };

    // Decrypt bank account if exists
    if (row.bank_account_number) {
      try {
        user.bankAccount = JSON.parse(decrypt(row.bank_account_number));
      } catch (e) {
        console.error('Failed to decrypt bank account:', e);
      }
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
    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    // Get user from database
    const result = await pool.query(
      `SELECT id, phone, name, type, location, bank_account_number, 
              account_locked_until, created_at
       FROM users
       WHERE phone = $1`,
      [phoneNumber]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'User not found' };
    }

    const row = result.rows[0];

    // Check if account is locked
    if (row.account_locked_until && new Date() < new Date(row.account_locked_until)) {
      const lockTimeRemaining = Math.ceil((new Date(row.account_locked_until).getTime() - Date.now()) / 60000);
      return { 
        success: false, 
        message: `Account is locked. Please try again in ${lockTimeRemaining} minutes.` 
      };
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE phone = $1',
      [phoneNumber]
    );

    // Create user object
    const user: User = {
      id: row.id,
      phoneNumber: row.phone,
      name: row.name,
      userType: row.type,
      location: {
        latitude: 0,
        longitude: 0,
        address: row.location
      },
      createdAt: row.created_at
    };

    // Decrypt bank account if exists
    if (row.bank_account_number) {
      try {
        user.bankAccount = JSON.parse(decrypt(row.bank_account_number));
      } catch (e) {
        console.error('Failed to decrypt bank account:', e);
      }
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

    return {
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
