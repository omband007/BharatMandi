/**
 * Auth Service Unit Tests
 * 
 * Tests for PIN/biometric authentication, JWT token management, and account security.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authService from '../auth.service';
import { UserProfileModel } from '../../models/profile.model';
import type { UserProfile } from '../../types/profile.types';

// Mock dependencies
jest.mock('../../models/profile.model');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Auth Service', () => {
  const mockUserId = 'test-user-id';
  const mockMobileNumber = '+919876543210';
  const mockPin = '1234';
  const mockToken = 'mock-jwt-token';

  const mockProfile: Partial<UserProfile> = {
    userId: mockUserId,
    mobileNumber: mockMobileNumber,
    name: 'Test User',
    pinHash: undefined,
    biometricEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    lastLoginAt: new Date(),
    mobileVerified: true,
    completionPercentage: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
    privacySettings: {},
    points: { current: 0, lifetime: 0, lastUpdated: new Date() },
    membershipTier: 'bronze',
    referralCode: 'TEST123',
    dailyStreak: 0,
    trustScore: 50,
    trustScoreHistory: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // PIN MANAGEMENT TESTS
  // ============================================================================

  describe('setupPIN', () => {
    it('should successfully set up a valid PIN', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        pinHash: undefined,
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pin');

      const result = await authService.setupPIN(mockUserId, mockPin, mockPin);

      expect(result.success).toBe(true);
      expect(result.message).toBe('PIN set up successfully');
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPin, 10);
      expect(mockProfileDoc.save).toHaveBeenCalled();
    });

    it('should reject PIN with less than 4 digits', async () => {
      const result = await authService.setupPIN(mockUserId, '123', '123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('PIN must be 4-6 digits');
    });

    it('should reject PIN with more than 6 digits', async () => {
      const result = await authService.setupPIN(mockUserId, '1234567', '1234567');

      expect(result.success).toBe(false);
      expect(result.message).toBe('PIN must be 4-6 digits');
    });

    it('should reject PIN with non-numeric characters', async () => {
      const result = await authService.setupPIN(mockUserId, '12ab', '12ab');

      expect(result.success).toBe(false);
      expect(result.message).toBe('PIN must be 4-6 digits');
    });

    it('should reject mismatched PIN confirmation', async () => {
      const result = await authService.setupPIN(mockUserId, '1234', '5678');

      expect(result.success).toBe(false);
      expect(result.message).toBe('PIN and confirmation do not match');
    });

    it('should reject if profile not found', async () => {
      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await authService.setupPIN(mockUserId, mockPin, mockPin);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Profile not found');
    });

    it('should reject if PIN already set', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        pinHash: 'existing-hash',
        save: jest.fn()
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      const result = await authService.setupPIN(mockUserId, mockPin, mockPin);

      expect(result.success).toBe(false);
      expect(result.message).toBe('PIN already set. Use change PIN to update.');
    });
  });

  describe('changePIN', () => {
    it('should successfully change PIN', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        pinHash: 'old-hash',
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-pin');

      const result = await authService.changePIN(mockUserId, '5678', '5678');

      expect(result.success).toBe(true);
      expect(result.message).toBe('PIN changed successfully');
      expect(bcrypt.hash).toHaveBeenCalledWith('5678', 10);
      expect(mockProfileDoc.save).toHaveBeenCalled();
    });

    it('should reject invalid new PIN format', async () => {
      const result = await authService.changePIN(mockUserId, '12', '12');

      expect(result.success).toBe(false);
      expect(result.message).toBe('New PIN must be 4-6 digits');
    });

    it('should reject mismatched new PIN confirmation', async () => {
      const result = await authService.changePIN(mockUserId, '1234', '5678');

      expect(result.success).toBe(false);
      expect(result.message).toBe('New PIN and confirmation do not match');
    });
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('loginWithPIN', () => {
    it('should successfully login with correct PIN', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        pinHash: 'hashed-pin',
        failedLoginAttempts: 0,
        toObject: jest.fn().mockReturnValue(mockProfile),
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProfileDoc) // For login
        .mockResolvedValueOnce(mockProfileDoc); // For handleSuccessfulLogin

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await authService.loginWithPIN(mockMobileNumber, mockPin);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.token).toBe(mockToken);
      expect(result.profile).toBeDefined();
    });

    it('should reject login with incorrect PIN', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        pinHash: 'hashed-pin',
        failedLoginAttempts: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProfileDoc) // For login
        .mockResolvedValueOnce(mockProfileDoc); // For handleFailedLogin

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.loginWithPIN(mockMobileNumber, 'wrong-pin');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid PIN');
    });

    it('should reject login if user not found', async () => {
      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await authService.loginWithPIN(mockMobileNumber, mockPin);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });

    it('should reject login if PIN not set', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        pinHash: undefined
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      const result = await authService.loginWithPIN(mockMobileNumber, mockPin);

      expect(result.success).toBe(false);
      expect(result.message).toBe('PIN not set up. Please set up your PIN first.');
    });

    it('should reject login if account is locked', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        pinHash: 'hashed-pin',
        failedLoginAttempts: 3,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      const result = await authService.loginWithPIN(mockMobileNumber, mockPin);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Account is locked');
    });

    it('should lock account after 3 failed attempts', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        pinHash: 'hashed-pin',
        failedLoginAttempts: 2, // This will be the 3rd attempt
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProfileDoc) // For login
        .mockResolvedValueOnce(mockProfileDoc); // For handleFailedLogin

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.loginWithPIN(mockMobileNumber, 'wrong-pin');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Too many failed attempts. Account locked for 30 minutes.');
    });
  });

  describe('loginWithBiometric', () => {
    it('should successfully login with biometric', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        biometricEnabled: true,
        failedLoginAttempts: 0,
        toObject: jest.fn().mockReturnValue(mockProfile),
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProfileDoc) // For login
        .mockResolvedValueOnce(mockProfileDoc); // For handleSuccessfulLogin

      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await authService.loginWithBiometric(mockMobileNumber);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Biometric login successful');
      expect(result.token).toBe(mockToken);
    });

    it('should reject if biometric not enabled', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        biometricEnabled: false
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      const result = await authService.loginWithBiometric(mockMobileNumber);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Biometric authentication not enabled');
    });

    it('should reject if account is locked', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        biometricEnabled: true,
        failedLoginAttempts: 3,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000)
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      const result = await authService.loginWithBiometric(mockMobileNumber);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Account is locked');
    });
  });

  // ============================================================================
  // JWT TOKEN TESTS
  // ============================================================================

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = authService.generateToken(mockProfile as UserProfile);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUserId,
          mobileNumber: mockMobileNumber,
          name: 'Test User'
        },
        expect.any(String),
        { expiresIn: '30d' }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const mockPayload = {
        userId: mockUserId,
        mobileNumber: mockMobileNumber,
        name: 'Test User'
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = authService.verifyToken(mockToken);

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockPayload);
    });

    it('should reject invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = authService.verifyToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('should refresh valid token', () => {
      const mockPayload = {
        userId: mockUserId,
        mobileNumber: mockMobileNumber,
        name: 'Test User'
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (jwt.sign as jest.Mock).mockReturnValue('new-token');

      const result = authService.refreshToken(mockToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe('new-token');
      expect(result.message).toBe('Token refreshed successfully');
    });

    it('should reject invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = authService.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid token');
    });
  });

  // ============================================================================
  // ACCOUNT SECURITY TESTS
  // ============================================================================

  describe('isAccountLocked', () => {
    it('should return false if no lockout', () => {
      const profile = {
        ...mockProfile,
        lockedUntil: undefined
      } as UserProfile;

      const result = authService.isAccountLocked(profile);

      expect(result).toBe(false);
    });

    it('should return false if lockout expired', () => {
      const profile = {
        ...mockProfile,
        lockedUntil: new Date(Date.now() - 1000) // 1 second ago
      } as UserProfile;

      const result = authService.isAccountLocked(profile);

      expect(result).toBe(false);
    });

    it('should return true if lockout active', () => {
      const profile = {
        ...mockProfile,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      } as UserProfile;

      const result = authService.isAccountLocked(profile);

      expect(result).toBe(true);
    });
  });

  describe('handleFailedLogin', () => {
    it('should increment failed attempts', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        failedLoginAttempts: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      await authService.handleFailedLogin(mockUserId, 'pin');

      expect(mockProfileDoc.failedLoginAttempts).toBe(1);
      expect(mockProfileDoc.save).toHaveBeenCalled();
    });

    it('should lock account after 3 failed attempts', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        failedLoginAttempts: 2,
        lockedUntil: undefined,
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      await authService.handleFailedLogin(mockUserId, 'pin');

      expect(mockProfileDoc.failedLoginAttempts).toBe(3);
      expect(mockProfileDoc.lockedUntil).toBeDefined();
      expect(mockProfileDoc.save).toHaveBeenCalled();
    });
  });

  describe('handleSuccessfulLogin', () => {
    it('should reset failed attempts and update timestamps', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        failedLoginAttempts: 2,
        lockedUntil: new Date(),
        lastLoginAt: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      await authService.handleSuccessfulLogin(mockUserId);

      expect(mockProfileDoc.failedLoginAttempts).toBe(0);
      expect(mockProfileDoc.lockedUntil).toBeUndefined();
      expect(mockProfileDoc.lastLoginAt).toBeDefined();
      expect(mockProfileDoc.save).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // BIOMETRIC MANAGEMENT TESTS
  // ============================================================================

  describe('enableBiometric', () => {
    it('should enable biometric authentication', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        biometricEnabled: false,
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      const result = await authService.enableBiometric(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Biometric authentication enabled');
      expect(mockProfileDoc.biometricEnabled).toBe(true);
      expect(mockProfileDoc.save).toHaveBeenCalled();
    });

    it('should reject if profile not found', async () => {
      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await authService.enableBiometric(mockUserId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Profile not found');
    });
  });

  describe('disableBiometric', () => {
    it('should disable biometric authentication', async () => {
      const mockProfileDoc = {
        ...mockProfile,
        biometricEnabled: true,
        save: jest.fn().mockResolvedValue(true)
      };

      (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

      const result = await authService.disableBiometric(mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Biometric authentication disabled');
      expect(mockProfileDoc.biometricEnabled).toBe(false);
      expect(mockProfileDoc.save).toHaveBeenCalled();
    });
  });
});
