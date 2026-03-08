/**
 * OTP Session Helpers for PostgreSQL
 * Replaces SQLite-based OTP session management
 */

import { pool } from './pg-config';

export interface OTPSession {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
}

/**
 * Create or update an OTP session
 */
export async function createOTPSession(session: OTPSession): Promise<boolean> {
  try {
    // Delete existing session first, then insert new one
    await pool.query(
      'DELETE FROM otp_sessions WHERE phone_number = $1',
      [session.phoneNumber]
    );
    
    await pool.query(
      `INSERT INTO otp_sessions (phone_number, otp, expires_at, attempts)
       VALUES ($1, $2, $3, $4)`,
      [session.phoneNumber, session.otp, session.expiresAt, session.attempts]
    );
    return true;
  } catch (error) {
    console.error('Error creating OTP session:', error);
    return false;
  }
}

/**
 * Get an OTP session by phone number
 */
export async function getOTPSession(phoneNumber: string): Promise<OTPSession | null> {
  try {
    const result = await pool.query(
      'SELECT phone_number, otp, expires_at, attempts FROM otp_sessions WHERE phone_number = $1',
      [phoneNumber]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      phoneNumber: row.phone_number,
      otp: row.otp,
      expiresAt: new Date(row.expires_at),
      attempts: row.attempts
    };
  } catch (error) {
    console.error('Error getting OTP session:', error);
    return null;
  }
}

/**
 * Update OTP attempts
 */
export async function updateOTPAttempts(phoneNumber: string, attempts: number): Promise<boolean> {
  try {
    await pool.query(
      'UPDATE otp_sessions SET attempts = $1 WHERE phone_number = $2',
      [attempts, phoneNumber]
    );
    return true;
  } catch (error) {
    console.error('Error updating OTP attempts:', error);
    return false;
  }
}

/**
 * Delete an OTP session
 */
export async function deleteOTPSession(phoneNumber: string): Promise<boolean> {
  try {
    await pool.query(
      'DELETE FROM otp_sessions WHERE phone_number = $1',
      [phoneNumber]
    );
    return true;
  } catch (error) {
    console.error('Error deleting OTP session:', error);
    return false;
  }
}

/**
 * Clean up expired OTP sessions
 */
export async function cleanupExpiredOTPSessions(): Promise<number> {
  try {
    const result = await pool.query(
      'DELETE FROM otp_sessions WHERE expires_at < NOW() RETURNING id'
    );
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up expired OTP sessions:', error);
    return 0;
  }
}
