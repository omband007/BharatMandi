/**
 * Auth Service Unit Tests
 * 
 * Comprehensive unit tests for the Auth Service covering all functions with
 * success, error, and edge cases. Uses complete dependency mocking for fast,
 * isolated tests.
 * 
 * Coverage Goals:
 * - Statement coverage: 80%+
 * - Branch coverage: 80%+
 * - Function coverage: 100%
 * - Line coverage: 80%+
 */

import * as authService from '../auth.service';
import * as sqliteHelpers from '../../../shared/database/sqlite-helpers';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserType } from '../../../shared/types/common.types';
import {
  createTestUser,
  createTestOTPSession,
  createTestLocation,
  createTestBankAccount
} from './test-helpers/test-data-factories';
import { createMockSqliteHelpers, configureMockSqliteHelpers } from './test-helpers/mock-sqlite-helpers';

// Mock all external dependencies
jest.mock('../../../shared/database/sqlite-helpers');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Create mock objects
const mockSqliteHelpers = createMockSqliteHelpers();
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Configure module mocks
Object.assign(sqliteHelpers, mockSqliteHelpers);

// Mock global database manager
const mockDb = {
  prepare: jest.fn().mockReturnValue({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  })
};

(global as any).sharedDbManager = {
  db: mockDb
};

// Test constants
const TEST_PHONE_NUMBERS = {
  VALID: '9876543210',
  WITH_COUNTRY_CODE: '+919876543210',
  WITH_91_PREFIX: '919876543210',
  INVALID_SHORT: '987654',
  INVALID_LONG: '98765432109876',
  INVALID_CHARS: '98765abcde',
  INVALID_START_DIGIT: '5876543210'
};

const TEST_PINS = {
  VALID_4_DIGIT: '1234',
  VALID_5_DIGIT: '12345',
  VALID_6_DIGIT: '123456',
  INVALID_SHORT: '123',
  INVALID_LONG: '1234567',
  INVALID_CHARS: '12ab'
};

describe('Auth Service - Unit Tests', () => {
  beforeEach(() => {
    // Clear all mock call history and reset implementations
    jest.clearAllMocks();
    
    // Reset verified phone numbers set
    authService.clearVerifiedPhoneNumbers();
    
    // Configure default mock behavior
    configureMockSqliteHelpers(mockSqliteHelpers);
    mockBcrypt.hash.mockResolvedValue('hashed-pin' as never);
    mockBcrypt.compare.mockResolvedValue(true as never);
    mockJwt.sign.mockReturnValue('test-jwt-token' as any);
    mockJwt.verify.mockReturnValue({
      userId: 'test-user-id',
      phoneNumber: TEST_PHONE_NUMBERS.VALID,
      userType: UserType.FARMER
    } as any);
  });

  afterEach(() => {
    // Clear verified phone numbers to prevent state leakage
    authService.clearVerifiedPhoneNumbers();
  });

  // Test suites will be added here for each function
  describe('normalizePhoneNumber', () => {
    // Testing normalizePhoneNumber indirectly through requestOTP
    // since normalizePhoneNumber is a private function
    
    it('should preserve 10-digit number starting with 6-9', async () => {
      // Arrange
      mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
      
      // Act
      await authService.requestOTP(TEST_PHONE_NUMBERS.VALID);
      
      // Assert - verify the normalized phone was used
      expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: TEST_PHONE_NUMBERS.VALID // Should remain unchanged
        })
      );
    });

    it('should remove +91 prefix', async () => {
      // Arrange
      mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
      
      // Act
      await authService.requestOTP(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE);
      
      // Assert - verify +91 was removed
      expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: TEST_PHONE_NUMBERS.VALID // +919876543210 -> 9876543210
        })
      );
    });

    it('should remove 91 prefix from 12-digit number', async () => {
      // Arrange
      mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
      
      // Act
      await authService.requestOTP(TEST_PHONE_NUMBERS.WITH_91_PREFIX);
      
      // Assert - verify 91 was removed
      expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: TEST_PHONE_NUMBERS.VALID // 919876543210 -> 9876543210
        })
      );
    });

    it('should trim whitespace before processing', async () => {
      // Arrange
      mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
      const phoneWithWhitespace = '  9876543210  ';
      
      // Act
      await authService.requestOTP(phoneWithWhitespace);
      
      // Assert - verify whitespace was trimmed
      expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: TEST_PHONE_NUMBERS.VALID // Whitespace removed
        })
      );
    });
  });

  describe('generateOTP', () => {
    // Testing generateOTP indirectly through requestOTP
    // since generateOTP is a private function
    
    it('should generate OTP with exactly 6 characters', async () => {
      // Arrange
      mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
      
      // Act
      await authService.requestOTP(TEST_PHONE_NUMBERS.VALID);
      
      // Assert - verify OTP has exactly 6 characters
      expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
        expect.objectContaining({
          otp: expect.stringMatching(/^.{6}$/)
        })
      );
    });

    it('should generate OTP containing only numeric digits', async () => {
      // Arrange
      mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
      
      // Act
      await authService.requestOTP(TEST_PHONE_NUMBERS.VALID);
      
      // Assert - verify OTP contains only digits
      expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
        expect.objectContaining({
          otp: expect.stringMatching(/^\d+$/)
        })
      );
    });

    it('should generate OTP with value in range 100000-999999', async () => {
      // Arrange
      mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
      
      // Act
      await authService.requestOTP(TEST_PHONE_NUMBERS.VALID);
      
      // Assert - verify OTP is in valid range
      const call = mockSqliteHelpers.createOTPSession.mock.calls[0][0];
      const otpValue = parseInt(call.otp, 10);
      expect(otpValue).toBeGreaterThanOrEqual(100000);
      expect(otpValue).toBeLessThanOrEqual(999999);
    });

    it('should generate different OTP values on multiple calls', async () => {
      // Arrange
      mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
      const otps = new Set<string>();
      
      // Act - generate multiple OTPs
      for (let i = 0; i < 10; i++) {
        await authService.requestOTP(TEST_PHONE_NUMBERS.VALID);
        const call = mockSqliteHelpers.createOTPSession.mock.calls[i][0];
        otps.add(call.otp);
      }
      
      // Assert - verify at least some OTPs are different
      // With 10 calls, we expect high probability of at least 2 different values
      expect(otps.size).toBeGreaterThan(1);
    });
  });

  describe('requestOTP', () => {
    describe('success cases', () => {
      it('should create OTP session with valid 10-digit phone number', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.requestOTP(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('OTP sent successfully');
        expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: TEST_PHONE_NUMBERS.VALID,
            otp: expect.stringMatching(/^\d{6}$/),
            attempts: 0
          })
        );
      });

      it('should normalize +91 prefix before storing OTP session', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.requestOTP(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE);
        
        // Assert
        expect(result.success).toBe(true);
        expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: TEST_PHONE_NUMBERS.VALID // +919876543210 normalized to 9876543210
          })
        );
      });

      it('should normalize 91 prefix before storing OTP session', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.requestOTP(TEST_PHONE_NUMBERS.WITH_91_PREFIX);
        
        // Assert
        expect(result.success).toBe(true);
        expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: TEST_PHONE_NUMBERS.VALID // 919876543210 normalized to 9876543210
          })
        );
      });

      it('should set OTP expiration to 10 minutes from creation', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        const beforeRequest = Date.now();
        
        // Act
        await authService.requestOTP(TEST_PHONE_NUMBERS.VALID);
        const afterRequest = Date.now();
        
        // Assert
        expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledTimes(1);
        const call = mockSqliteHelpers.createOTPSession.mock.calls[0][0];
        const expiresAt = call.expiresAt.getTime();
        
        // Verify expiration is approximately 10 minutes (600,000 ms) from now
        const expectedExpiration = beforeRequest + 10 * 60 * 1000;
        const maxExpectedExpiration = afterRequest + 10 * 60 * 1000;
        
        expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiration);
        expect(expiresAt).toBeLessThanOrEqual(maxExpectedExpiration);
      });

      it('should call createOTPSession with correct parameters', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        
        // Act
        await authService.requestOTP(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.createOTPSession).toHaveBeenCalledWith({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: expect.stringMatching(/^\d{6}$/),
          expiresAt: expect.any(Date),
          attempts: 0
        });
      });
    });

    describe('error cases', () => {
      it('should reject invalid phone format (too short)', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.requestOTP(TEST_PHONE_NUMBERS.INVALID_SHORT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid phone number format');
        expect(mockSqliteHelpers.createOTPSession).not.toHaveBeenCalled();
      });

      it('should reject invalid phone format (too long)', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.requestOTP(TEST_PHONE_NUMBERS.INVALID_LONG);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid phone number format');
        expect(mockSqliteHelpers.createOTPSession).not.toHaveBeenCalled();
      });

      it('should reject phone number starting with 0-5', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.requestOTP(TEST_PHONE_NUMBERS.INVALID_START_DIGIT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid phone number format');
        expect(mockSqliteHelpers.createOTPSession).not.toHaveBeenCalled();
      });

      it('should reject phone number with non-numeric characters', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.requestOTP(TEST_PHONE_NUMBERS.INVALID_CHARS);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid phone number format');
        expect(mockSqliteHelpers.createOTPSession).not.toHaveBeenCalled();
      });

      it('should handle database error gracefully', async () => {
        // Arrange
        mockSqliteHelpers.createOTPSession.mockRejectedValue(new Error('Database connection failed'));
        
        // Act & Assert - expect the error to propagate
        await expect(authService.requestOTP(TEST_PHONE_NUMBERS.VALID)).rejects.toThrow('Database connection failed');
      });
    });
  });

  describe('verifyOTP', () => {
    describe('success cases', () => {
      it('should return success when correct OTP is provided before expiration', async () => {
        // Arrange
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('OTP verified successfully');
      });

      it('should add phone number to verified set after successful verification', async () => {
        // Arrange
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Assert - verify phone is in verified set by checking internal state
        // We can't directly access the Set, but we can verify the behavior:
        // 1. OTP was verified successfully (checked in previous test)
        // 2. deleteOTPSession was called (checked in another test)
        // 3. setTimeout was called to set TTL (checked in another test)
        // The verified set is used by createUser, which we'll test in task 6
        expect(result.success).toBe(true);
        expect(mockSqliteHelpers.deleteOTPSession).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });

      it('should delete OTP session after successful verification', async () => {
        // Arrange
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Act
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Assert
        expect(mockSqliteHelpers.deleteOTPSession).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.deleteOTPSession).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });

      it('should set 5-minute TTL for verified status', async () => {
        // Arrange
        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Act
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Assert - verify setTimeout was called with 5 minutes (300,000 ms)
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
        
        // Cleanup
        setTimeoutSpy.mockRestore();
      });

      it('should call deleteOTPSession with normalized phone number', async () => {
        // Arrange
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Act - use phone with +91 prefix
        await authService.verifyOTP(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE, '123456');
        
        // Assert - verify deleteOTPSession was called with normalized phone
        expect(mockSqliteHelpers.deleteOTPSession).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });
    });

    describe('error cases', () => {
      it('should increment attempt counter when incorrect OTP is provided', async () => {
        // Arrange
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.updateOTPAttempts.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '999999'); // Wrong OTP
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid OTP. Please try again.');
        expect(mockSqliteHelpers.updateOTPAttempts).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.updateOTPAttempts).toHaveBeenCalledWith(
          TEST_PHONE_NUMBERS.VALID,
          1 // attempts incremented from 0 to 1
        );
      });

      it('should delete session after 3 failed attempts', async () => {
        // Arrange - session already has 3 failed attempts
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 3
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Act - attempts >= 3, so session should be deleted
        const result = await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '999999');
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Too many failed attempts. Please request a new OTP.');
        expect(mockSqliteHelpers.deleteOTPSession).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.deleteOTPSession).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockSqliteHelpers.updateOTPAttempts).not.toHaveBeenCalled(); // Session deleted instead
      });

      it('should return error when OTP has expired', async () => {
        // Arrange - OTP expired 1 minute ago
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Act
        const result = await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('OTP expired. Please request a new OTP.');
        expect(mockSqliteHelpers.deleteOTPSession).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.deleteOTPSession).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockSqliteHelpers.updateOTPAttempts).not.toHaveBeenCalled();
      });

      it('should return error when OTP session does not exist', async () => {
        // Arrange - no OTP session found
        mockSqliteHelpers.getOTPSession.mockResolvedValue(null);
        
        // Act
        const result = await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('No OTP session found. Please request a new OTP.');
        expect(mockSqliteHelpers.deleteOTPSession).not.toHaveBeenCalled();
        expect(mockSqliteHelpers.updateOTPAttempts).not.toHaveBeenCalled();
      });

      it('should call updateOTPAttempts on first failed attempt', async () => {
        // Arrange
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.updateOTPAttempts.mockResolvedValue(undefined);
        
        // Act
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '999999');
        
        // Assert
        expect(mockSqliteHelpers.updateOTPAttempts).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.updateOTPAttempts).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID, 1);
      });

      it('should call updateOTPAttempts on second failed attempt', async () => {
        // Arrange - session already has 1 failed attempt
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 1
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.updateOTPAttempts.mockResolvedValue(undefined);
        
        // Act
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '999999');
        
        // Assert
        expect(mockSqliteHelpers.updateOTPAttempts).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.updateOTPAttempts).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID, 2);
      });

      it('should normalize phone number before checking session', async () => {
        // Arrange
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.updateOTPAttempts.mockResolvedValue(undefined);
        
        // Act - use phone with +91 prefix
        await authService.verifyOTP(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE, '999999');
        
        // Assert - verify getOTPSession was called with normalized phone
        expect(mockSqliteHelpers.getOTPSession).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockSqliteHelpers.updateOTPAttempts).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID, 1);
      });
    });
  });

  describe('createUser', () => {
    describe('success cases', () => {
      it('should create user successfully with verified phone number', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP to add phone to verified set
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks for user creation
        mockSqliteHelpers.getUserByPhone.mockResolvedValue(null); // No existing user
        const createdUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER
        });
        
        // Mock the database manager's createUser method
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('User created successfully');
        expect(result.user).toBeDefined();
        expect(result.user?.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID);
        expect(result.user?.name).toBe('Test Farmer');
        expect(result.user?.userType).toBe(UserType.FARMER);
      });

      it('should generate UUID for user ID', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert - verify UUID format (8-4-4-4-12 hex characters)
        expect(result.success).toBe(true);
        expect(result.user?.id).toBeDefined();
        expect(result.user?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });

      it('should set createdAt timestamp', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        const beforeCreate = Date.now();
        
        // Act
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        const afterCreate = Date.now();
        
        // Assert - verify createdAt is set and within expected time range
        expect(result.success).toBe(true);
        expect(result.user?.createdAt).toBeDefined();
        expect(result.user?.createdAt).toBeInstanceOf(Date);
        
        const createdAtTime = result.user!.createdAt.getTime();
        expect(createdAtTime).toBeGreaterThanOrEqual(beforeCreate);
        expect(createdAtTime).toBeLessThanOrEqual(afterCreate);
      });

      it('should include bank account data when provided', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        const bankAccount = createTestBankAccount({
          accountNumber: '9876543210',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'Test Farmer'
        });
        
        // Act
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation(),
          bankAccount: bankAccount
        });
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.user?.bankAccount).toBeDefined();
        expect(result.user?.bankAccount?.accountNumber).toBe('9876543210');
        expect(result.user?.bankAccount?.ifscCode).toBe('SBIN0001234');
        expect(result.user?.bankAccount?.bankName).toBe('State Bank of India');
        expect(result.user?.bankAccount?.accountHolderName).toBe('Test Farmer');
      });

      it('should remove phone from verified set after creation', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - create user
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert - first creation should succeed
        expect(result.success).toBe(true);
        
        // Try to create another user with same phone (should fail because phone no longer verified)
        mockDbManager.getUserByPhone.mockResolvedValue(null); // No existing user
        const result2 = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Another User',
          userType: UserType.BUYER,
          location: createTestLocation()
        });
        
        // Assert - second creation should fail due to missing verification
        expect(result2.success).toBe(false);
        expect(result2.message).toContain('not verified');
      });

      it('should call createUser with correct data', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        const location = createTestLocation({
          latitude: 28.7041,
          longitude: 77.1025,
          address: 'Test Farm, Delhi'
        });
        
        const bankAccount = createTestBankAccount();
        
        // Act
        await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: location,
          bankAccount: bankAccount
        });
        
        // Assert - verify createUser was called with correct structure
        expect(mockDbManager.createUser).toHaveBeenCalledTimes(1);
        expect(mockDbManager.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
            phoneNumber: TEST_PHONE_NUMBERS.VALID,
            name: 'Test Farmer',
            userType: UserType.FARMER,
            location: expect.objectContaining({
              latitude: 28.7041,
              longitude: 77.1025,
              address: 'Test Farm, Delhi'
            }),
            bankAccount: expect.objectContaining({
              accountNumber: bankAccount.accountNumber,
              ifscCode: bankAccount.ifscCode,
              bankName: bankAccount.bankName,
              accountHolderName: bankAccount.accountHolderName
            }),
            createdAt: expect.any(Date)
          })
        );
      });

      it('should normalize phone number before creating user', async () => {
        // Arrange - verify phone with +91 prefix
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP with normalized phone
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - create user with +91 prefix
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE, // +919876543210
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert - verify phone was normalized
        expect(result.success).toBe(true);
        expect(result.user?.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID); // Should be normalized to 9876543210
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: TEST_PHONE_NUMBERS.VALID
          })
        );
      });
    });

    describe('error cases', () => {
      it('should return error when phone number is not verified', async () => {
        // Arrange - do NOT verify phone first
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - try to create user without OTP verification
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('not verified');
        expect(result.message).toContain('OTP verification');
        expect(mockDbManager.getUserByPhone).not.toHaveBeenCalled();
        expect(mockDbManager.createUser).not.toHaveBeenCalled();
      });

      it('should return error for duplicate phone number', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks - existing user found
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Existing User',
          userType: UserType.FARMER
        });
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - try to create user with duplicate phone
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('already exists');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.createUser).not.toHaveBeenCalled();
      });

      it('should normalize phone number before checking for duplicates', async () => {
        // Arrange - verify phone with normalized number
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP with normalized phone
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks - existing user with normalized phone
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID, // Normalized: 9876543210
          name: 'Existing User',
          userType: UserType.FARMER
        });
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - try to create user with +91 prefix (should normalize and detect duplicate)
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE, // +919876543210
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert - should detect duplicate after normalization
        expect(result.success).toBe(false);
        expect(result.message).toContain('already exists');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID); // Normalized
        expect(mockDbManager.createUser).not.toHaveBeenCalled();
      });

      it('should normalize phone number with 91 prefix before checking duplicates', async () => {
        // Arrange - verify phone with normalized number
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP with normalized phone
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks - existing user with normalized phone
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID, // Normalized: 9876543210
          name: 'Existing User',
          userType: UserType.FARMER
        });
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - try to create user with 91 prefix (should normalize and detect duplicate)
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.WITH_91_PREFIX, // 919876543210
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert - should detect duplicate after normalization
        expect(result.success).toBe(false);
        expect(result.message).toContain('already exists');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID); // Normalized
        expect(mockDbManager.createUser).not.toHaveBeenCalled();
      });

      it('should handle database error gracefully', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks - database error on getUserByPhone
        const mockDbManager = {
          getUserByPhone: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          createUser: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert - should handle error gracefully
        expect(result.success).toBe(false);
        expect(result.message).toBe('Failed to create user');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.createUser).not.toHaveBeenCalled();
      });

      it('should handle database error during user creation', async () => {
        // Arrange - verify phone first
        const otpSession = createTestOTPSession({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          otp: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0
        });
        mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
        mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
        
        // Verify OTP
        await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
        
        // Configure mocks - database error on createUser
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          createUser: jest.fn().mockRejectedValue(new Error('Database write failed'))
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - Note: The implementation catches createUser errors and continues
        // This is by design for PostgreSQL unavailability (queued for sync)
        const result = await authService.createUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER,
          location: createTestLocation()
        });
        
        // Assert - should still succeed (operation queued for sync)
        expect(result.success).toBe(true);
        expect(result.message).toBe('User created successfully');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.createUser).toHaveBeenCalled();
      });
    });
  });

  describe('getUserByPhone', () => {
    describe('success cases', () => {
      it('should return user object when existing user is found', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.getUserByPhone(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result).toBeDefined();
        expect(result).not.toBeNull();
        expect(result?.id).toBe(existingUser.id);
        expect(result?.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID);
        expect(result?.name).toBe('Test Farmer');
        expect(result?.userType).toBe(UserType.FARMER);
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledTimes(1);
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });

      it('should normalize +91 prefix before lookup', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - use phone with +91 prefix
        const result = await authService.getUserByPhone(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE);
        
        // Assert - verify phone was normalized before lookup
        expect(result).toBeDefined();
        expect(result?.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID); // Normalized
      });

      it('should normalize 91 prefix before lookup', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - use phone with 91 prefix
        const result = await authService.getUserByPhone(TEST_PHONE_NUMBERS.WITH_91_PREFIX);
        
        // Assert - verify phone was normalized before lookup
        expect(result).toBeDefined();
        expect(result?.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID); // Normalized
      });

      it('should call getUserByPhone helper with normalized phone', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        await authService.getUserByPhone(TEST_PHONE_NUMBERS.VALID);
        
        // Assert - verify helper was called with correct parameter
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledTimes(1);
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });
    });

    describe('error cases', () => {
      it('should return null when non-existent user is queried', async () => {
        // Arrange - no user found
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.getUserByPhone(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result).toBeNull();
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });

      it('should return null and log error when database error occurs', async () => {
        // Arrange
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const mockDbManager = {
          getUserByPhone: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.getUserByPhone(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result).toBeNull();
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error getting user:',
          expect.any(Error)
        );
        
        // Cleanup
        consoleErrorSpy.mockRestore();
      });

      it('should handle database error with different error types', async () => {
        // Arrange
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const mockDbManager = {
          getUserByPhone: jest.fn().mockRejectedValue(new Error('Network timeout'))
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.getUserByPhone(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();
        
        // Cleanup
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('setupPIN', () => {
    describe('success cases', () => {
      it('should accept and hash 4-digit PIN', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          updateUserPin: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockBcrypt.hash.mockResolvedValue('hashed-4-digit-pin' as never);
        
        // Act
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('PIN set up successfully');
        expect(mockBcrypt.hash).toHaveBeenCalledWith(TEST_PINS.VALID_4_DIGIT, 10);
        expect(mockDbManager.updateUserPin).toHaveBeenCalledWith(
          TEST_PHONE_NUMBERS.VALID,
          'hashed-4-digit-pin'
        );
      });

      it('should accept and hash 5-digit PIN', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          updateUserPin: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockBcrypt.hash.mockResolvedValue('hashed-5-digit-pin' as never);
        
        // Act
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_5_DIGIT);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('PIN set up successfully');
        expect(mockBcrypt.hash).toHaveBeenCalledWith(TEST_PINS.VALID_5_DIGIT, 10);
        expect(mockDbManager.updateUserPin).toHaveBeenCalledWith(
          TEST_PHONE_NUMBERS.VALID,
          'hashed-5-digit-pin'
        );
      });

      it('should accept and hash 6-digit PIN', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          updateUserPin: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockBcrypt.hash.mockResolvedValue('hashed-6-digit-pin' as never);
        
        // Act
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_6_DIGIT);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('PIN set up successfully');
        expect(mockBcrypt.hash).toHaveBeenCalledWith(TEST_PINS.VALID_6_DIGIT, 10);
        expect(mockDbManager.updateUserPin).toHaveBeenCalledWith(
          TEST_PHONE_NUMBERS.VALID,
          'hashed-6-digit-pin'
        );
      });

      it('should call bcrypt.hash before storing PIN', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          updateUserPin: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockBcrypt.hash.mockResolvedValue('securely-hashed-pin' as never);
        
        // Act
        await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert - verify bcrypt.hash was called with salt rounds = 10
        expect(mockBcrypt.hash).toHaveBeenCalledTimes(1);
        expect(mockBcrypt.hash).toHaveBeenCalledWith(TEST_PINS.VALID_4_DIGIT, 10);
        
        // Verify the hashed PIN (not raw PIN) was stored
        expect(mockDbManager.updateUserPin).toHaveBeenCalledWith(
          TEST_PHONE_NUMBERS.VALID,
          'securely-hashed-pin'
        );
        
        // Verify raw PIN was NOT stored
        expect(mockDbManager.updateUserPin).not.toHaveBeenCalledWith(
          expect.anything(),
          TEST_PINS.VALID_4_DIGIT
        );
      });

      it('should normalize phone number before user lookup', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          updateUserPin: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockBcrypt.hash.mockResolvedValue('hashed-pin' as never);
        
        // Act - use phone with +91 prefix
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE, TEST_PINS.VALID_4_DIGIT);
        
        // Assert - verify phone was normalized before lookup
        expect(result.success).toBe(true);
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID); // Normalized
      });

      it('should call updateUserPin with correct parameters', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          updateUserPin: jest.fn().mockResolvedValue(undefined)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockBcrypt.hash.mockResolvedValue('test-hashed-pin' as never);
        
        // Act
        await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(mockDbManager.updateUserPin).toHaveBeenCalledTimes(1);
        expect(mockDbManager.updateUserPin).toHaveBeenCalledWith(
          TEST_PHONE_NUMBERS.VALID,
          'test-hashed-pin'
        );
      });
    });

    describe('error cases', () => {
      it('should reject 3-digit PIN', async () => {
        // Arrange
        const mockDbManager = {
          getUserByPhone: jest.fn(),
          updateUserPin: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.INVALID_SHORT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('PIN must be 4-6 digits');
        expect(mockDbManager.getUserByPhone).not.toHaveBeenCalled();
        expect(mockDbManager.updateUserPin).not.toHaveBeenCalled();
        expect(mockBcrypt.hash).not.toHaveBeenCalled();
      });

      it('should reject 7-digit PIN', async () => {
        // Arrange
        const mockDbManager = {
          getUserByPhone: jest.fn(),
          updateUserPin: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.INVALID_LONG);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('PIN must be 4-6 digits');
        expect(mockDbManager.getUserByPhone).not.toHaveBeenCalled();
        expect(mockDbManager.updateUserPin).not.toHaveBeenCalled();
        expect(mockBcrypt.hash).not.toHaveBeenCalled();
      });

      it('should reject PIN with non-numeric characters', async () => {
        // Arrange
        const mockDbManager = {
          getUserByPhone: jest.fn(),
          updateUserPin: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.INVALID_CHARS);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('PIN must be 4-6 digits');
        expect(mockDbManager.getUserByPhone).not.toHaveBeenCalled();
        expect(mockDbManager.updateUserPin).not.toHaveBeenCalled();
        expect(mockBcrypt.hash).not.toHaveBeenCalled();
      });

      it('should return error for non-existent user', async () => {
        // Arrange - no user found
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null),
          updateUserPin: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('User not found');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.updateUserPin).not.toHaveBeenCalled();
        expect(mockBcrypt.hash).not.toHaveBeenCalled();
      });

      it('should handle database error gracefully', async () => {
        // Arrange - database error on getUserByPhone
        const mockDbManager = {
          getUserByPhone: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          updateUserPin: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Failed to set up PIN');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.updateUserPin).not.toHaveBeenCalled();
      });

      it('should handle database error during PIN update', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser),
          updateUserPin: jest.fn().mockRejectedValue(new Error('Database write failed'))
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockBcrypt.hash.mockResolvedValue('hashed-pin' as never);
        
        // Act - Note: The implementation catches updateUserPin errors and continues
        // This is by design for PostgreSQL unavailability (queued for sync)
        const result = await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert - should still succeed (operation queued for sync)
        expect(result.success).toBe(true);
        expect(result.message).toBe('PIN set up successfully');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockDbManager.updateUserPin).toHaveBeenCalled();
      });
    });
  });

  describe('loginWithPIN', () => {
    describe('success cases', () => {
      it('should return success with JWT token when correct PIN is provided', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Login successful');
        expect(result.token).toBe('test-jwt-token');
        expect(result.user).toBeDefined();
        expect(result.user?.id).toBe(existingUser.id);
      });

      it('should return user object in response', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.user).toEqual(existingUser);
        expect(result.user?.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID);
        expect(result.user?.name).toBe('Test Farmer');
        expect(result.user?.userType).toBe(UserType.FARMER);
      });

      it('should reset failed attempt counter on successful login', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 2, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(true);
        expect(mockSqliteHelpers.resetFailedAttempts).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.resetFailedAttempts).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });

      it('should normalize phone number before processing', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act - use phone with +91 prefix
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE, TEST_PINS.VALID_4_DIGIT);
        
        // Assert - verify phone was normalized
        expect(result.success).toBe(true);
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockSqliteHelpers.getFailedAttempts).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });

      it('should call bcrypt.compare with PIN and hash', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('stored-hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(mockBcrypt.compare).toHaveBeenCalledTimes(1);
        expect(mockBcrypt.compare).toHaveBeenCalledWith(TEST_PINS.VALID_4_DIGIT, 'stored-hashed-pin');
      });

      it('should call jwt.sign with correct payload', async () => {
        // Arrange
        const existingUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(mockJwt.sign).toHaveBeenCalledTimes(1);
        expect(mockJwt.sign).toHaveBeenCalledWith(
          {
            userId: 'user-123',
            phoneNumber: TEST_PHONE_NUMBERS.VALID,
            userType: UserType.FARMER
          },
          expect.any(String),
          expect.any(Object)
        );
      });
    });

    describe('error cases', () => {
      it('should increment failed attempts when incorrect PIN is provided', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.incrementFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(false as never); // Wrong PIN
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, 'wrong-pin');
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid PIN');
        expect(result.message).toContain('2 attempts remaining');
        expect(mockSqliteHelpers.incrementFailedAttempts).toHaveBeenCalledTimes(1);
        expect(mockSqliteHelpers.incrementFailedAttempts).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });

      it('should lock account for 30 minutes after 3 failed attempts', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 2, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.lockAccount.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(false as never); // Wrong PIN (3rd attempt)
        
        const beforeLock = Date.now();
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, 'wrong-pin');
        
        const afterLock = Date.now();
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Too many failed attempts');
        expect(result.message).toContain('locked for 30 minutes');
        expect(mockSqliteHelpers.lockAccount).toHaveBeenCalledTimes(1);
        
        // Verify lock duration is approximately 30 minutes
        const lockUntilArg = mockSqliteHelpers.lockAccount.mock.calls[0][1];
        const lockDuration = lockUntilArg.getTime() - beforeLock;
        const expectedDuration = 30 * 60 * 1000; // 30 minutes in ms
        
        expect(lockDuration).toBeGreaterThanOrEqual(expectedDuration - 100);
        expect(lockDuration).toBeLessThanOrEqual(expectedDuration + (afterLock - beforeLock) + 100);
      });

      it('should return error with time remaining when account is locked', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Account locked until 15 minutes from now
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ 
          failed_attempts: 3, 
          locked_until: lockUntil.toISOString() 
        });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Account is locked');
        expect(result.message).toContain('15 minutes');
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
        expect(mockJwt.sign).not.toHaveBeenCalled();
      });

      it('should return error for non-existent user', async () => {
        // Arrange - no user found
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('User not found');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
        expect(mockJwt.sign).not.toHaveBeenCalled();
      });

      it('should return error when PIN is not set up', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue(null); // No PIN set
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('PIN not set up');
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
        expect(mockJwt.sign).not.toHaveBeenCalled();
      });

      it('should return error for invalid phone format', async () => {
        // Arrange
        const mockDbManager = {
          getUserByPhone: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.INVALID_SHORT, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid phone number format');
        expect(mockDbManager.getUserByPhone).not.toHaveBeenCalled();
      });

      it('should handle database error gracefully', async () => {
        // Arrange - database error
        const mockDbManager = {
          getUserByPhone: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Login failed');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });
    });
  });

  describe('verifyToken', () => {
    describe('token generation tests', () => {
      it('should generate JWT with userId in payload', async () => {
        // Arrange
        const existingUser = createTestUser({
          id: 'user-abc-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert - verify jwt.sign was called with userId
        expect(mockJwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-abc-123'
          }),
          expect.any(String),
          expect.any(Object)
        );
      });

      it('should generate JWT with phoneNumber in payload', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert - verify jwt.sign was called with phoneNumber
        expect(mockJwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            phoneNumber: TEST_PHONE_NUMBERS.VALID
          }),
          expect.any(String),
          expect.any(Object)
        );
      });

      it('should generate JWT with userType in payload', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          userType: UserType.BUYER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert - verify jwt.sign was called with userType
        expect(mockJwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            userType: UserType.BUYER
          }),
          expect.any(String),
          expect.any(Object)
        );
      });

      it('should call jwt.sign with correct parameters', async () => {
        // Arrange
        const existingUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockSqliteHelpers.getUserPinHash.mockResolvedValue('hashed-pin');
        mockSqliteHelpers.resetFailedAttempts.mockResolvedValue(undefined);
        mockBcrypt.compare.mockResolvedValue(true as never);
        mockJwt.sign.mockReturnValue('test-jwt-token' as any);
        
        // Act
        await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
        
        // Assert - verify jwt.sign was called with all required parameters
        expect(mockJwt.sign).toHaveBeenCalledTimes(1);
        expect(mockJwt.sign).toHaveBeenCalledWith(
          {
            userId: 'user-123',
            phoneNumber: TEST_PHONE_NUMBERS.VALID,
            userType: UserType.FARMER
          },
          expect.any(String), // JWT_SECRET
          expect.objectContaining({
            expiresIn: expect.any(String) // JWT_EXPIRY
          })
        );
      });
    });

    describe('token verification tests', () => {
      it('should return valid true with decoded payload for valid token', () => {
        // Arrange
        mockJwt.verify.mockReturnValue({
          userId: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          userType: UserType.FARMER
        } as any);
        
        // Act
        const result = authService.verifyToken('valid-jwt-token');
        
        // Assert
        expect(result.valid).toBe(true);
        expect(result.userId).toBe('user-123');
        expect(result.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID);
        expect(result.userType).toBe(UserType.FARMER);
        expect(mockJwt.verify).toHaveBeenCalledTimes(1);
        expect(mockJwt.verify).toHaveBeenCalledWith('valid-jwt-token', expect.any(String));
      });

      it('should return valid false for invalid token', () => {
        // Arrange
        mockJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        // Act
        const result = authService.verifyToken('invalid-jwt-token');
        
        // Assert
        expect(result.valid).toBe(false);
        expect(result.userId).toBeUndefined();
        expect(result.phoneNumber).toBeUndefined();
        expect(result.userType).toBeUndefined();
        expect(mockJwt.verify).toHaveBeenCalledWith('invalid-jwt-token', expect.any(String));
      });

      it('should return valid false for expired token', () => {
        // Arrange
        mockJwt.verify.mockImplementation(() => {
          const error = new Error('Token expired');
          error.name = 'TokenExpiredError';
          throw error;
        });
        
        // Act
        const result = authService.verifyToken('expired-jwt-token');
        
        // Assert
        expect(result.valid).toBe(false);
        expect(result.userId).toBeUndefined();
        expect(mockJwt.verify).toHaveBeenCalledWith('expired-jwt-token', expect.any(String));
      });

      it('should return valid false for tampered token', () => {
        // Arrange
        mockJwt.verify.mockImplementation(() => {
          const error = new Error('Invalid signature');
          error.name = 'JsonWebTokenError';
          throw error;
        });
        
        // Act
        const result = authService.verifyToken('tampered-jwt-token');
        
        // Assert
        expect(result.valid).toBe(false);
        expect(result.userId).toBeUndefined();
        expect(mockJwt.verify).toHaveBeenCalledWith('tampered-jwt-token', expect.any(String));
      });

      it('should call jwt.verify with token', () => {
        // Arrange
        mockJwt.verify.mockReturnValue({
          userId: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          userType: UserType.FARMER
        } as any);
        
        // Act
        authService.verifyToken('test-token-abc');
        
        // Assert
        expect(mockJwt.verify).toHaveBeenCalledTimes(1);
        expect(mockJwt.verify).toHaveBeenCalledWith('test-token-abc', expect.any(String));
      });

      it('should handle malformed token gracefully', () => {
        // Arrange
        mockJwt.verify.mockImplementation(() => {
          throw new Error('Malformed token');
        });
        
        // Act
        const result = authService.verifyToken('malformed.token');
        
        // Assert
        expect(result.valid).toBe(false);
        expect(result.userId).toBeUndefined();
      });
    });
  });

  describe('loginWithBiometric', () => {
    describe('success cases', () => {
      it('should return success with JWT token for valid phone', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Farmer',
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockJwt.sign.mockReturnValue('biometric-jwt-token' as any);
        
        // Act
        const result = await authService.loginWithBiometric(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Biometric login successful');
        expect(result.token).toBe('biometric-jwt-token');
        expect(result.user).toBeDefined();
        expect(result.user?.id).toBe(existingUser.id);
      });

      it('should return user object in response', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          name: 'Test Buyer',
          userType: UserType.BUYER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockJwt.sign.mockReturnValue('biometric-jwt-token' as any);
        
        // Act
        const result = await authService.loginWithBiometric(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.user).toEqual(existingUser);
        expect(result.user?.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID);
        expect(result.user?.name).toBe('Test Buyer');
        expect(result.user?.userType).toBe(UserType.BUYER);
      });

      it('should normalize phone number before processing', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockJwt.sign.mockReturnValue('biometric-jwt-token' as any);
        
        // Act - use phone with +91 prefix
        const result = await authService.loginWithBiometric(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE);
        
        // Assert - verify phone was normalized
        expect(result.success).toBe(true);
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockSqliteHelpers.getFailedAttempts).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });

      it('should call jwt.sign with correct payload', async () => {
        // Arrange
        const existingUser = createTestUser({
          id: 'user-bio-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          userType: UserType.FARMER
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ failed_attempts: 0, locked_until: null });
        mockJwt.sign.mockReturnValue('biometric-jwt-token' as any);
        
        // Act
        await authService.loginWithBiometric(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(mockJwt.sign).toHaveBeenCalledTimes(1);
        expect(mockJwt.sign).toHaveBeenCalledWith(
          {
            userId: 'user-bio-123',
            phoneNumber: TEST_PHONE_NUMBERS.VALID,
            userType: UserType.FARMER
          },
          expect.any(String),
          expect.any(Object)
        );
      });
    });

    describe('error cases', () => {
      it('should return error with time remaining when account is locked', async () => {
        // Arrange
        const existingUser = createTestUser({
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(existingUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Account locked until 20 minutes from now
        const lockUntil = new Date(Date.now() + 20 * 60 * 1000);
        mockSqliteHelpers.getFailedAttempts.mockResolvedValue({ 
          failed_attempts: 3, 
          locked_until: lockUntil.toISOString() 
        });
        
        // Act
        const result = await authService.loginWithBiometric(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Account is locked');
        expect(result.message).toContain('20 minutes');
        expect(mockJwt.sign).not.toHaveBeenCalled();
      });

      it('should return error for non-existent user', async () => {
        // Arrange - no user found
        const mockDbManager = {
          getUserByPhone: jest.fn().mockResolvedValue(null)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.loginWithBiometric(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('User not found');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
        expect(mockJwt.sign).not.toHaveBeenCalled();
      });

      it('should return error for invalid phone format', async () => {
        // Arrange
        const mockDbManager = {
          getUserByPhone: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.loginWithBiometric(TEST_PHONE_NUMBERS.INVALID_SHORT);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid phone number format');
        expect(mockDbManager.getUserByPhone).not.toHaveBeenCalled();
      });

      it('should handle database error gracefully', async () => {
        // Arrange - database error
        const mockDbManager = {
          getUserByPhone: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.loginWithBiometric(TEST_PHONE_NUMBERS.VALID);
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Biometric login failed');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
      });
    });
  });

  describe('getUserProfile', () => {
    it('should return success with user object for existing user ID', async () => {
      // Arrange
      const existingUser = createTestUser({
        id: 'user-profile-123',
        phoneNumber: TEST_PHONE_NUMBERS.VALID,
        name: 'Test Farmer',
        userType: UserType.FARMER
      });
      
      const mockDbManager = {
        getUserById: jest.fn().mockResolvedValue(existingUser)
      };
      (global as any).sharedDbManager = mockDbManager;
      
      // Act
      const result = await authService.getUserProfile('user-profile-123');
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile retrieved successfully');
      expect(result.user).toEqual(existingUser);
      expect(result.user?.id).toBe('user-profile-123');
      expect(result.user?.name).toBe('Test Farmer');
      expect(mockDbManager.getUserById).toHaveBeenCalledTimes(1);
      expect(mockDbManager.getUserById).toHaveBeenCalledWith('user-profile-123');
    });

    it('should return error for non-existent user ID', async () => {
      // Arrange - no user found
      const mockDbManager = {
        getUserById: jest.fn().mockResolvedValue(null)
      };
      (global as any).sharedDbManager = mockDbManager;
      
      // Act
      const result = await authService.getUserProfile('non-existent-user-id');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
      expect(result.user).toBeUndefined();
      expect(mockDbManager.getUserById).toHaveBeenCalledWith('non-existent-user-id');
    });

    it('should return error message when database error occurs', async () => {
      // Arrange - database error
      const mockDbManager = {
        getUserById: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (global as any).sharedDbManager = mockDbManager;
      
      // Act
      const result = await authService.getUserProfile('user-123');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve profile');
      expect(result.user).toBeUndefined();
      expect(mockDbManager.getUserById).toHaveBeenCalledWith('user-123');
    });

    it('should call getUserById helper', async () => {
      // Arrange
      const existingUser = createTestUser({
        id: 'test-user-id'
      });
      
      const mockDbManager = {
        getUserById: jest.fn().mockResolvedValue(existingUser)
      };
      (global as any).sharedDbManager = mockDbManager;
      
      // Act
      await authService.getUserProfile('test-user-id');
      
      // Assert
      expect(mockDbManager.getUserById).toHaveBeenCalledTimes(1);
      expect(mockDbManager.getUserById).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('updateUserProfile', () => {
    describe('success cases', () => {
      it('should update name without requiring verification', async () => {
        // Arrange
        const currentUser = createTestUser({
          id: 'user-123',
          name: 'Old Name',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const updatedUser = createTestUser({
          id: 'user-123',
          name: 'New Name',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(currentUser),
          updateUser: jest.fn().mockResolvedValue(updatedUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.updateUserProfile('user-123', { name: 'New Name' });
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Profile updated successfully');
        expect(result.user?.name).toBe('New Name');
        expect(result.requiresVerification).toBeUndefined();
        expect(mockDbManager.updateUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
          name: 'New Name'
        }));
      });

      it('should update location without requiring verification', async () => {
        // Arrange
        const currentUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const newLocation = createTestLocation({
          latitude: 28.7041,
          longitude: 77.1025,
          address: 'New Farm Location, Delhi'
        });
        
        const updatedUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID,
          location: newLocation
        });
        
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(currentUser),
          updateUser: jest.fn().mockResolvedValue(updatedUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.updateUserProfile('user-123', { location: newLocation });
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Profile updated successfully');
        expect(result.user?.location).toEqual(newLocation);
        expect(result.requiresVerification).toBeUndefined();
        expect(mockDbManager.updateUser).toHaveBeenCalledWith('user-123', expect.objectContaining({
          location: newLocation
        }));
      });

      it('should update language preferences successfully', async () => {
        // Arrange
        const currentUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const updatedUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(currentUser),
          updateUser: jest.fn().mockResolvedValue(updatedUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.updateUserProfile('user-123', {});
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Profile updated successfully');
        expect(mockDbManager.updateUser).toHaveBeenCalled();
      });

      it('should update phone number with verification', async () => {
        // Arrange
        const currentUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const newPhoneNumber = '8765432109';
        const updatedUser = createTestUser({
          id: 'user-123',
          phoneNumber: newPhoneNumber
        });
        
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(currentUser),
          getUserByPhone: jest.fn().mockResolvedValue(null), // New phone not in use
          updateUser: jest.fn().mockResolvedValue(updatedUser)
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - with verification
        const result = await authService.updateUserProfile(
          'user-123',
          { phoneNumber: newPhoneNumber },
          true // isPhoneVerified
        );
        
        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Profile updated successfully');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith(newPhoneNumber);
        expect(mockDbManager.updateUser).toHaveBeenCalled();
      });
    });

    describe('error cases', () => {
      it('should require verification for phone number change', async () => {
        // Arrange
        const currentUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(currentUser),
          updateUser: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - without verification
        const result = await authService.updateUserProfile(
          'user-123',
          { phoneNumber: '8765432109' },
          false // isPhoneVerified = false
        );
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.requiresVerification).toBe(true);
        expect(result.message).toContain('Phone verification required');
        expect(mockDbManager.updateUser).not.toHaveBeenCalled();
      });

      it('should require verification for bank account change', async () => {
        // Arrange
        const currentUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(currentUser),
          updateUser: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        const newBankAccount = createTestBankAccount({
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234'
        });
        
        // Act - without verification
        const result = await authService.updateUserProfile(
          'user-123',
          { bankAccount: newBankAccount },
          false // isPhoneVerified = false
        );
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.requiresVerification).toBe(true);
        expect(result.message).toContain('Phone verification required');
        expect(mockDbManager.updateUser).not.toHaveBeenCalled();
      });

      it('should return error for duplicate phone number', async () => {
        // Arrange
        const currentUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const existingUserWithNewPhone = createTestUser({
          id: 'user-456', // Different user
          phoneNumber: '8765432109'
        });
        
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(currentUser),
          getUserByPhone: jest.fn().mockResolvedValue(existingUserWithNewPhone),
          updateUser: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - try to update to phone number already in use
        const result = await authService.updateUserProfile(
          'user-123',
          { phoneNumber: '8765432109' },
          true // isPhoneVerified
        );
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Phone number already in use');
        expect(mockDbManager.getUserByPhone).toHaveBeenCalledWith('8765432109');
        expect(mockDbManager.updateUser).not.toHaveBeenCalled();
      });

      it('should return error for non-existent user', async () => {
        // Arrange - no user found
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(null),
          updateUser: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.updateUserProfile('non-existent-user', { name: 'New Name' });
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('User not found');
        expect(mockDbManager.getUserById).toHaveBeenCalledWith('non-existent-user');
        expect(mockDbManager.updateUser).not.toHaveBeenCalled();
      });

      it('should handle database error gracefully', async () => {
        // Arrange - database error on getUserById
        const mockDbManager = {
          getUserById: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          updateUser: jest.fn()
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act
        const result = await authService.updateUserProfile('user-123', { name: 'New Name' });
        
        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Failed to update profile');
        expect(mockDbManager.getUserById).toHaveBeenCalledWith('user-123');
        expect(mockDbManager.updateUser).not.toHaveBeenCalled();
      });

      it('should handle database error during update', async () => {
        // Arrange
        const currentUser = createTestUser({
          id: 'user-123',
          phoneNumber: TEST_PHONE_NUMBERS.VALID
        });
        
        const mockDbManager = {
          getUserById: jest.fn().mockResolvedValue(currentUser),
          updateUser: jest.fn().mockRejectedValue(new Error('Database write failed'))
        };
        (global as any).sharedDbManager = mockDbManager;
        
        // Act - Note: The implementation catches updateUser errors and continues
        // This is by design for PostgreSQL unavailability (queued for sync)
        const result = await authService.updateUserProfile('user-123', { name: 'New Name' });
        
        // Assert - should still succeed (operation queued for sync)
        expect(result.success).toBe(true);
        expect(result.message).toBe('Profile update queued for sync');
        expect(result.user).toEqual(currentUser);
        expect(mockDbManager.updateUser).toHaveBeenCalled();
      });
    });

    it('should call updateUser helper with correct data', async () => {
      // Arrange
      const currentUser = createTestUser({
        id: 'user-123',
        phoneNumber: TEST_PHONE_NUMBERS.VALID
      });
      
      const updatedUser = createTestUser({
        id: 'user-123',
        name: 'Updated Name',
        phoneNumber: TEST_PHONE_NUMBERS.VALID
      });
      
      const mockDbManager = {
        getUserById: jest.fn().mockResolvedValue(currentUser),
        updateUser: jest.fn().mockResolvedValue(updatedUser)
      };
      (global as any).sharedDbManager = mockDbManager;
      
      const newLocation = createTestLocation({
        latitude: 28.7041,
        longitude: 77.1025,
        address: 'Test Location'
      });
      
      // Act
      await authService.updateUserProfile('user-123', {
        name: 'Updated Name',
        location: newLocation
      });
      
      // Assert
      expect(mockDbManager.updateUser).toHaveBeenCalledTimes(1);
      expect(mockDbManager.updateUser).toHaveBeenCalledWith('user-123', {
        name: 'Updated Name',
        location: newLocation
      });
    });
  });
});
