/**
 * Test Data Factories for Auth Controller Tests
 * 
 * Provides factory functions to create test data objects with sensible defaults
 * and support for partial overrides.
 */

import { User, OTPSession } from '../../auth.types';
import { UserType, Location, BankAccount } from '../../../../shared/types/common.types';

/**
 * Create a test user with default values
 */
export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    phoneNumber: '9876543210',
    name: 'Test User',
    userType: UserType.FARMER,
    location: createTestLocation(),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  };
}

/**
 * Create a test user with language preferences
 */
export function createTestUserWithLanguages(overrides?: Partial<User>): User {
  return createTestUser({
    languagePreference: 'hi',
    voiceLanguagePreference: 'hi',
    recentLanguages: ['hi', 'en'],
    ...overrides
  });
}

/**
 * Create a test location with default values
 */
export function createTestLocation(overrides?: Partial<Location>): Location {
  return {
    latitude: 28.6139,
    longitude: 77.2090,
    address: 'Test Address, Delhi',
    ...overrides
  };
}

/**
 * Create a test bank account with default values
 */
export function createTestBankAccount(overrides?: Partial<BankAccount>): BankAccount {
  return {
    accountNumber: '1234567890',
    ifscCode: 'TEST0001234',
    bankName: 'Test Bank',
    accountHolderName: 'Test User',
    ...overrides
  };
}

/**
 * Create a test OTP session with default values
 */
export function createTestOTPSession(overrides?: Partial<OTPSession>): OTPSession {
  return {
    phoneNumber: '9876543210',
    otp: '123456',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    attempts: 0,
    ...overrides
  };
}

/**
 * Create a test JWT token
 */
export function createTestToken(userId: string = 'test-user-id'): string {
  return `test-jwt-token-${userId}`;
}
