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

  // OTP verified successfully
  otpSessions.delete(phoneNumber);
  return { success: true, message: 'OTP verified successfully' };
}

/**
 * Create new user account
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
