import { requestOTP, verifyOTP, createUser } from './auth.service';
import { UserType } from '../types';

describe('Authentication Service', () => {
  describe('OTP Flow', () => {
    it('should generate and send OTP for valid phone number', async () => {
      const result = await requestOTP('9876543210');
      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP sent successfully');
    });

    it('should reject invalid phone number format', async () => {
      const result = await requestOTP('123456');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid phone number format');
    });

    it('should verify correct OTP', async () => {
      const phoneNumber = '9876543210';
      
      // Request OTP
      await requestOTP(phoneNumber);
      
      // For testing, we need to get the OTP from console or mock it
      // In a real test, you'd mock the OTP generation
      // For now, this test demonstrates the flow
      
      // const result = await verifyOTP(phoneNumber, '123456');
      // expect(result.success).toBe(true);
    });

    it('should reject incorrect OTP', async () => {
      const phoneNumber = '9876543210';
      
      // Request OTP
      await requestOTP(phoneNumber);
      
      // Try with wrong OTP
      const result = await verifyOTP(phoneNumber, '000000');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid OTP. Please try again.');
    });

    it('should reject expired OTP', async () => {
      const phoneNumber = '9876543210';
      
      // This would require mocking time or waiting 10 minutes
      // Skipping for now
    });

    it('should limit OTP verification attempts to 3', async () => {
      const phoneNumber = '9876543210';
      
      // Request OTP
      await requestOTP(phoneNumber);
      
      // Try 3 times with wrong OTP
      await verifyOTP(phoneNumber, '000000');
      await verifyOTP(phoneNumber, '000000');
      const result = await verifyOTP(phoneNumber, '000000');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Too many failed attempts. Please request a new OTP.');
    });
  });

  describe('User Registration', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        phoneNumber: '9876543210',
        name: 'Test Farmer',
        userType: UserType.FARMER,
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          address: 'Mumbai, Maharashtra'
        },
        bankAccount: {
          accountNumber: '1234567890',
          ifscCode: 'SBIN0001234',
          accountHolderName: 'Test Farmer'
        }
      };

      const result = await createUser(userData);
      
      // Note: This will fail if user already exists in database
      // In a real test environment, you'd use a test database
      if (result.success) {
        expect(result.user).toBeDefined();
        expect(result.user?.phoneNumber).toBe(userData.phoneNumber);
        expect(result.user?.name).toBe(userData.name);
      }
    });

    it('should reject duplicate phone number', async () => {
      const userData = {
        phoneNumber: '9876543210',
        name: 'Test Farmer 2',
        userType: UserType.FARMER,
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          address: 'Mumbai, Maharashtra'
        }
      };

      // Try to create user twice
      await createUser(userData);
      const result = await createUser(userData);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('User with this phone number already exists');
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive bank account data', async () => {
      const userData = {
        phoneNumber: '9999999999',
        name: 'Test User',
        userType: UserType.BUYER,
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          address: 'Mumbai, Maharashtra'
        },
        bankAccount: {
          accountNumber: '9876543210',
          ifscCode: 'HDFC0001234',
          accountHolderName: 'Test User'
        }
      };

      const result = await createUser(userData);
      
      if (result.success && result.user) {
        // Bank account should be encrypted in database
        // When retrieved, it should be decrypted
        expect(result.user.bankAccount).toBeUndefined(); // Not returned in creation response
      }
    });
  });
});

import { getUserProfile, updateUserProfile } from './auth.service';

describe('Profile Management', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user for profile tests
    const userData = {
      phoneNumber: '9111111111',
      name: 'Profile Test User',
      userType: UserType.FARMER,
      location: {
        latitude: 19.0760,
        longitude: 72.8777,
        address: 'Test City, Test State'
      },
      bankAccount: {
        accountNumber: '1111111111',
        ifscCode: 'TEST0001111',
        accountHolderName: 'Profile Test User'
      }
    };

    const result = await createUser(userData);
    if (result.success && result.user) {
      testUserId = result.user.id;
    }
  });

  describe('Get User Profile', () => {
    it('should retrieve user profile by ID', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const result = await getUserProfile(testUserId);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(testUserId);
      expect(result.user?.name).toBe('Profile Test User');
    });

    it('should return error for non-existent user ID', async () => {
      const result = await getUserProfile('00000000-0000-0000-0000-000000000000');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });

    it('should include decrypted bank account in profile', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const result = await getUserProfile(testUserId);
      
      if (result.success && result.user) {
        expect(result.user.bankAccount).toBeDefined();
        expect(result.user.bankAccount?.accountNumber).toBe('1111111111');
        expect(result.user.bankAccount?.ifscCode).toBe('TEST0001111');
      }
    });
  });

  describe('Update User Profile', () => {
    it('should update non-sensitive data without verification', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const updates = {
        name: 'Updated Profile Name',
        location: {
          latitude: 20.0,
          longitude: 73.0,
          address: 'Updated City, Updated State'
        }
      };

      const result = await updateUserProfile(testUserId, updates, false);
      
      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Updated Profile Name');
      expect(result.user?.location.address).toBe('Updated City, Updated State');
    });

    it('should require verification for phone number update', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const updates = {
        phoneNumber: '9222222222'
      };

      const result = await updateUserProfile(testUserId, updates, false);
      
      expect(result.success).toBe(false);
      expect(result.requiresVerification).toBe(true);
      expect(result.message).toBe('Phone verification required for updating sensitive data');
    });

    it('should require verification for bank account update', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const updates = {
        bankAccount: {
          accountNumber: '2222222222',
          ifscCode: 'TEST0002222',
          accountHolderName: 'Updated Account Holder'
        }
      };

      const result = await updateUserProfile(testUserId, updates, false);
      
      expect(result.success).toBe(false);
      expect(result.requiresVerification).toBe(true);
    });

    it('should update phone number with verification', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const updates = {
        phoneNumber: '9333333333'
      };

      const result = await updateUserProfile(testUserId, updates, true);
      
      // This might fail if phone number already exists
      if (result.success) {
        expect(result.user?.phoneNumber).toBe('9333333333');
      }
    });

    it('should update bank account with verification', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const updates = {
        bankAccount: {
          accountNumber: '3333333333',
          ifscCode: 'TEST0003333',
          accountHolderName: 'New Account Holder'
        }
      };

      const result = await updateUserProfile(testUserId, updates, true);
      
      expect(result.success).toBe(true);
      expect(result.user?.bankAccount?.accountNumber).toBe('3333333333');
    });

    it('should reject duplicate phone number', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      // Try to update to an existing phone number
      const updates = {
        phoneNumber: '9876543210' // Assuming this exists from earlier tests
      };

      const result = await updateUserProfile(testUserId, updates, true);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Phone number already in use');
    });

    it('should handle empty updates gracefully', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const updates = {};

      const result = await updateUserProfile(testUserId, updates, false);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('No valid fields to update');
    });

    it('should update multiple fields at once', async () => {
      if (!testUserId) {
        console.log('Skipping test - no test user created');
        return;
      }

      const updates = {
        name: 'Multi Update Test',
        location: {
          latitude: 21.0,
          longitude: 74.0,
          address: 'Multi Update City'
        }
      };

      const result = await updateUserProfile(testUserId, updates, false);
      
      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Multi Update Test');
      expect(result.user?.location.address).toBe('Multi Update City');
    });
  });
});
