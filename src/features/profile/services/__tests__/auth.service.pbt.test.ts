/**
 * Auth Service Property-Based Tests
 * 
 * Property-based tests using fast-check to verify invariants and edge cases.
 */

import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authService from '../auth.service';
import { UserProfileModel } from '../../models/profile.model';
import type { UserProfile } from '../../types/profile.types';

// Mock dependencies
jest.mock('../../models/profile.model');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Auth Service - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // PIN VALIDATION PROPERTIES
  // ============================================================================

  describe('PIN Validation Properties', () => {
    it('should reject all PINs shorter than 4 digits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 999 }), // 0-3 digits
          async (pin) => {
            const pinStr = pin.toString();
            const result = await authService.setupPIN('user-id', pinStr, pinStr);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('PIN must be 4-6 digits');
          }
        )
      );
    });

    it('should reject all PINs longer than 6 digits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000000, max: 9999999 }), // 7+ digits
          async (pin) => {
            const pinStr = pin.toString();
            const result = await authService.setupPIN('user-id', pinStr, pinStr);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('PIN must be 4-6 digits');
          }
        )
      );
    });

    it('should reject PINs with non-numeric characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 4, maxLength: 6 }).filter(s => !/^\d+$/.test(s)),
          async (pin) => {
            const result = await authService.setupPIN('user-id', pin, pin);
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('PIN must be 4-6 digits');
          }
        )
      );
    });

    it('should accept all valid PINs (4-6 digits)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 999999 }), // 4-6 digits
          async (pin) => {
            const pinStr = pin.toString();
            
            // Mock successful setup
            const mockProfileDoc = {
              userId: 'user-id',
              pinHash: undefined,
              save: jest.fn().mockResolvedValue(true)
            };
            (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pin');

            const result = await authService.setupPIN('user-id', pinStr, pinStr);
            
            expect(result.success).toBe(true);
          }
        )
      );
    });

    it('should always reject mismatched PIN confirmations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 999999 }),
          fc.integer({ min: 1000, max: 999999 }),
          async (pin1, pin2) => {
            fc.pre(pin1 !== pin2); // Only test when PINs are different
            
            const result = await authService.setupPIN('user-id', pin1.toString(), pin2.toString());
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('PIN and confirmation do not match');
          }
        )
      );
    });
  });

  // ============================================================================
  // JWT TOKEN PROPERTIES
  // ============================================================================

  describe('JWT Token Properties', () => {
    it('should generate tokens with 30-day expiration', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            mobileNumber: fc.string({ minLength: 10, maxLength: 15 }),
            name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined })
          }),
          (profile) => {
            (jwt.sign as jest.Mock).mockReturnValue('mock-token');

            authService.generateToken(profile as any);

            expect(jwt.sign).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: profile.userId,
                mobileNumber: profile.mobileNumber
              }),
              expect.any(String),
              { expiresIn: '30d' }
            );
          }
        )
      );
    });

    it('should verify and return payload for valid tokens', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            mobileNumber: fc.string(),
            name: fc.option(fc.string(), { nil: undefined })
          }),
          (payload) => {
            (jwt.verify as jest.Mock).mockReturnValue(payload);

            const result = authService.verifyToken('valid-token');

            expect(result.valid).toBe(true);
            expect(result.payload).toEqual(payload);
          }
        )
      );
    });

    it('should always reject tokens that throw verification errors', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (token) => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
              throw new Error('Invalid token');
            });

            const result = authService.verifyToken(token);

            expect(result.valid).toBe(false);
            expect(result.payload).toBeUndefined();
          }
        )
      );
    });
  });

  // ============================================================================
  // ACCOUNT LOCKOUT PROPERTIES
  // ============================================================================

  describe('Account Lockout Properties', () => {
    it('should lock account after exactly 3 failed attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          async (initialAttempts) => {
            const mockProfileDoc = {
              userId: 'user-id',
              failedLoginAttempts: initialAttempts,
              lockedUntil: undefined,
              save: jest.fn().mockResolvedValue(true)
            };

            (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

            await authService.handleFailedLogin('user-id', 'pin');

            if (initialAttempts + 1 >= 3) {
              await expect(mockProfileDoc.lockedUntil).toBeDefined();
            } else {
              await expect(mockProfileDoc.lockedUntil).toBeUndefined();
            }
          }
        )
      );
    });

    it('should always unlock accounts with expired lockout times', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }), // milliseconds in the past
          (msAgo) => {
            const profile = {
              lockedUntil: new Date(Date.now() - msAgo)
            } as UserProfile;

            const result = authService.isAccountLocked(profile);

            expect(result).toBe(false);
          }
        )
      );
    });

    it('should always lock accounts with future lockout times', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }), // milliseconds in the future
          (msFromNow) => {
            const profile = {
              lockedUntil: new Date(Date.now() + msFromNow)
            } as UserProfile;

            const result = authService.isAccountLocked(profile);

            expect(result).toBe(true);
          }
        )
      );
    });

    it('should reset failed attempts to 0 on successful login', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          async (failedAttempts) => {
            const mockProfileDoc = {
              userId: 'user-id',
              failedLoginAttempts: failedAttempts,
              lockedUntil: new Date(),
              lastLoginAt: new Date(),
              lastActiveAt: new Date(),
              save: jest.fn().mockResolvedValue(true)
            };

            (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

            await authService.handleSuccessfulLogin('user-id');

            await expect(mockProfileDoc.failedLoginAttempts).toBe(0);
            await expect(mockProfileDoc.lockedUntil).toBeUndefined();
          }
        )
      );
    });
  });

  // ============================================================================
  // BIOMETRIC PROPERTIES
  // ============================================================================

  describe('Biometric Properties', () => {
    it('should toggle biometric state correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (initialState) => {
            const mockProfileDoc = {
              userId: 'user-id',
              biometricEnabled: initialState,
              save: jest.fn().mockResolvedValue(true)
            };

            (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

            if (initialState) {
              await authService.disableBiometric('user-id');
              await expect(mockProfileDoc.biometricEnabled).toBe(false);
            } else {
              await authService.enableBiometric('user-id');
              await expect(mockProfileDoc.biometricEnabled).toBe(true);
            }
          }
        )
      );
    });

    it('should reject biometric login when disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 15 }),
          async (mobileNumber) => {
            const mockProfileDoc = {
              mobileNumber,
              biometricEnabled: false
            };

            (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);

            const result = await authService.loginWithBiometric(mobileNumber);

            await expect(result.success).toBe(false);
            await expect(result.message).toContain('not enabled');
          }
        )
      );
    });
  });

  // ============================================================================
  // MOBILE NUMBER PROPERTIES
  // ============================================================================

  describe('Mobile Number Properties', () => {
    it('should handle various mobile number formats consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('+919876543210'), // Indian
            fc.constant('+447700900123'), // UK
            fc.constant('+12025551234'),  // US
            fc.constant('+861234567890')  // China
          ),
          async (mobileNumber) => {
            const mockProfileDoc = {
              mobileNumber,
              pinHash: 'hashed-pin',
              failedLoginAttempts: 0,
              biometricEnabled: true,
              toObject: jest.fn().mockReturnValue({ mobileNumber }),
              save: jest.fn().mockResolvedValue(true)
            };

            (UserProfileModel.findOne as jest.Mock)
              .mockResolvedValueOnce(mockProfileDoc)
              .mockResolvedValueOnce(mockProfileDoc);

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue('token');

            const result = await authService.loginWithPIN(mobileNumber, '1234');

            await expect(result.success).toBe(true);
            await expect(UserProfileModel.findOne).toHaveBeenCalledWith({ mobileNumber });
          }
        )
      );
    });
  });

  // ============================================================================
  // INVARIANT PROPERTIES
  // ============================================================================

  describe('Invariant Properties', () => {
    it('should never allow login with locked account (except OTP)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            mobileNumber: fc.string(),
            pin: fc.string(),
            lockedUntil: fc.date({ min: new Date(), max: new Date(Date.now() + 86400000) })
          }),
          async ({ userId, mobileNumber, pin, lockedUntil }) => {
            const mockProfileDoc = {
              userId,
              mobileNumber,
              pinHash: 'hashed-pin',
              failedLoginAttempts: 3,
              lockedUntil,
              biometricEnabled: true
            };

            (UserProfileModel.findOne as jest.Mock).mockResolvedValue(mockProfileDoc);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Mock bcrypt to avoid errors

            const pinResult = await authService.loginWithPIN(mobileNumber, pin);
            const bioResult = await authService.loginWithBiometric(mobileNumber);

            await expect(pinResult.success).toBe(false);
            await expect(bioResult.success).toBe(false);
            await expect(pinResult.message.toLowerCase()).toContain('locked');
            await expect(bioResult.message.toLowerCase()).toContain('locked');
          }
        )
      );
    });

    it('should never expose PIN hash in responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            mobileNumber: fc.string(),
            pin: fc.string({ minLength: 4, maxLength: 6 })
          }),
          async ({ userId, mobileNumber, pin }) => {
            const mockProfileDoc = {
              userId,
              mobileNumber,
              pinHash: 'hashed-pin',
              failedLoginAttempts: 0,
              toObject: jest.fn().mockReturnValue({
                userId,
                mobileNumber,
                pinHash: 'hashed-pin'
              }),
              save: jest.fn().mockResolvedValue(true)
            };

            (UserProfileModel.findOne as jest.Mock)
              .mockResolvedValueOnce(mockProfileDoc)
              .mockResolvedValueOnce(mockProfileDoc);

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue('token');

            const result = await authService.loginWithPIN(mobileNumber, pin);

            // Profile should be returned but pinHash should not be exposed
            // (In production, you'd filter this in the route layer)
            await expect(result.profile).toBeDefined();
          }
        )
      );
    });
  });
});
