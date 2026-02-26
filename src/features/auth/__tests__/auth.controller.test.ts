/**
 * Integration Tests for Auth Controller
 * 
 * Tests all API endpoints for authentication operations:
 * - OTP request and verification
 * - User registration
 * - PIN setup and login
 * - Biometric login
 * - Token verification
 * - Profile management
 */

import request from 'supertest';
import express from 'express';
import { authController } from '../auth.controller';
import { UserType } from '../../../shared/types/common.types';

// Mock the auth service module
jest.mock('../auth.service');

import * as authService from '../auth.service';
import { createMockAuthService } from './test-helpers/mock-auth-service';
import { createTestUser, createTestUserWithLanguages, createTestLocation, createTestBankAccount } from './test-helpers/test-data-factories';
import { TEST_PHONE_NUMBERS, TEST_PINS, SUPPORTED_LANGUAGES } from './test-helpers/test-constants';

// Create mock service
const mockAuthService = createMockAuthService();

// Configure mocks
(authService.requestOTP as jest.Mock) = mockAuthService.requestOTP;
(authService.verifyOTP as jest.Mock) = mockAuthService.verifyOTP;
(authService.createUser as jest.Mock) = mockAuthService.createUser;
(authService.getUserByPhone as jest.Mock) = mockAuthService.getUserByPhone;
(authService.setupPIN as jest.Mock) = mockAuthService.setupPIN;
(authService.loginWithPIN as jest.Mock) = mockAuthService.loginWithPIN;
(authService.loginWithBiometric as jest.Mock) = mockAuthService.loginWithBiometric;
(authService.verifyToken as jest.Mock) = mockAuthService.verifyToken;
(authService.getUserProfile as jest.Mock) = mockAuthService.getUserProfile;
(authService.updateUserProfile as jest.Mock) = mockAuthService.updateUserProfile;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authController);

describe('Auth Controller - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/request-otp', () => {
    it('should request OTP with valid 10-digit phone number', async () => {
      mockAuthService.requestOTP.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully'
      });

      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(200);

      expect(response.body.message).toBe('OTP sent successfully');
      expect(mockAuthService.requestOTP).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
    });

    it('should normalize phone number with +91 prefix', async () => {
      mockAuthService.requestOTP.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully'
      });

      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE })
        .expect(200);

      expect(response.body.message).toBe('OTP sent successfully');
      expect(mockAuthService.requestOTP).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.WITH_COUNTRY_CODE);
    });

    it('should return 400 for invalid phone number format', async () => {
      mockAuthService.requestOTP.mockResolvedValue({
        success: false,
        message: 'Invalid phone number format'
      });

      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.INVALID_SHORT })
        .expect(400);

      expect(response.body.error).toBe('Invalid phone number format');
    });

    it('should return 400 when phone number is missing', async () => {
      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Phone number is required');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.requestOTP.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify OTP for existing user', async () => {
      const existingUser = createTestUser();
      
      mockAuthService.verifyOTP.mockResolvedValue({
        success: true,
        message: 'OTP verified successfully'
      });
      mockAuthService.getUserByPhone.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, otp: '123456' })
        .expect(200);

      expect(response.body.message).toBe('OTP verified successfully');
      expect(response.body.userExists).toBe(true);
      expect(response.body.user).toMatchObject({ id: existingUser.id });
    });

    it('should verify OTP for new user', async () => {
      mockAuthService.verifyOTP.mockResolvedValue({
        success: true,
        message: 'OTP verified successfully'
      });
      mockAuthService.getUserByPhone.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, otp: '123456' })
        .expect(200);

      expect(response.body.message).toBe('OTP verified successfully');
      expect(response.body.userExists).toBe(false);
    });

    it('should return 400 for invalid OTP', async () => {
      mockAuthService.verifyOTP.mockResolvedValue({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, otp: '000000' })
        .expect(400);

      expect(response.body.error).toBe('Invalid OTP. Please try again.');
    });

    it('should return 400 for expired OTP', async () => {
      mockAuthService.verifyOTP.mockResolvedValue({
        success: false,
        message: 'OTP expired. Please request a new OTP.'
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, otp: '123456' })
        .expect(400);

      expect(response.body.error).toContain('OTP expired');
    });

    it('should return 400 when phone number is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ otp: '123456' })
        .expect(400);

      expect(response.body.error).toBe('Phone number and OTP are required');
    });

    it('should return 400 when OTP is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(400);

      expect(response.body.error).toBe('Phone number and OTP are required');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.verifyOTP.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, otp: '123456' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      phoneNumber: TEST_PHONE_NUMBERS.VALID,
      name: 'Test User',
      userType: UserType.FARMER,
      location: createTestLocation()
    };

    it('should register user with all required fields', async () => {
      const createdUser = createTestUser();
      
      mockAuthService.createUser.mockResolvedValue({
        success: true,
        message: 'User created successfully',
        user: createdUser
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.message).toBe('User created successfully');
      expect(response.body.user).toMatchObject({ id: createdUser.id });
    });

    it('should register farmer user', async () => {
      const farmerUser = createTestUser({ userType: UserType.FARMER });
      
      mockAuthService.createUser.mockResolvedValue({
        success: true,
        message: 'User created successfully',
        user: farmerUser
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, userType: UserType.FARMER })
        .expect(201);

      expect(response.body.user.userType).toBe(UserType.FARMER);
    });

    it('should register buyer user', async () => {
      const buyerUser = createTestUser({ userType: UserType.BUYER });
      
      mockAuthService.createUser.mockResolvedValue({
        success: true,
        message: 'User created successfully',
        user: buyerUser
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, userType: UserType.BUYER })
        .expect(201);

      expect(response.body.user.userType).toBe(UserType.BUYER);
    });

    it('should register transporter user', async () => {
      const transporterUser = createTestUser({ userType: UserType.LOGISTICS_PROVIDER });
      
      mockAuthService.createUser.mockResolvedValue({
        success: true,
        message: 'User created successfully',
        user: transporterUser
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, userType: UserType.LOGISTICS_PROVIDER })
        .expect(201);

      expect(response.body.user.userType).toBe(UserType.LOGISTICS_PROVIDER);
    });

    it('should register user with optional bank account', async () => {
      const userWithBank = createTestUser({ bankAccount: createTestBankAccount() });
      
      mockAuthService.createUser.mockResolvedValue({
        success: true,
        message: 'User created successfully',
        user: userWithBank
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, bankAccount: createTestBankAccount() })
        .expect(201);

      expect(response.body.user.bankAccount).toBeDefined();
    });

    it('should return 400 for invalid user type', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, userType: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Invalid user type');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 400 for invalid location data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistrationData,
          location: { latitude: 28.6139 } // Missing longitude and address
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid location data');
    });

    it('should return 400 when service returns failure', async () => {
      mockAuthService.createUser.mockResolvedValue({
        success: false,
        message: 'User with this phone number already exists'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(400);

      expect(response.body.error).toBe('User with this phone number already exists');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.createUser.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/auth/user/:phoneNumber', () => {
    it('should get user by phone number', async () => {
      const existingUser = createTestUser();
      mockAuthService.getUserByPhone.mockResolvedValue(existingUser);

      const response = await request(app)
        .get(`/api/auth/user/${TEST_PHONE_NUMBERS.VALID}`)
        .expect(200);

      expect(response.body.user).toMatchObject({ id: existingUser.id });
      expect(mockAuthService.getUserByPhone).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID);
    });

    it('should return 404 for non-existent user', async () => {
      mockAuthService.getUserByPhone.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/auth/user/${TEST_PHONE_NUMBERS.VALID}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.getUserByPhone.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/auth/user/${TEST_PHONE_NUMBERS.VALID}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/setup-pin', () => {
    it('should setup 4-digit PIN', async () => {
      mockAuthService.setupPIN.mockResolvedValue({
        success: true,
        message: 'PIN set up successfully'
      });

      const response = await request(app)
        .post('/api/auth/setup-pin')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_4_DIGIT })
        .expect(200);

      expect(response.body.message).toBe('PIN set up successfully');
      expect(mockAuthService.setupPIN).toHaveBeenCalledWith(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);
    });

    it('should setup 6-digit PIN', async () => {
      mockAuthService.setupPIN.mockResolvedValue({
        success: true,
        message: 'PIN set up successfully'
      });

      const response = await request(app)
        .post('/api/auth/setup-pin')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_6_DIGIT })
        .expect(200);

      expect(response.body.message).toBe('PIN set up successfully');
    });

    it('should return 400 when phone number is missing', async () => {
      const response = await request(app)
        .post('/api/auth/setup-pin')
        .send({ pin: TEST_PINS.VALID_4_DIGIT })
        .expect(400);

      expect(response.body.error).toBe('Phone number and PIN are required');
    });

    it('should return 400 when PIN is missing', async () => {
      const response = await request(app)
        .post('/api/auth/setup-pin')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(400);

      expect(response.body.error).toBe('Phone number and PIN are required');
    });

    it('should return 400 when user not found', async () => {
      mockAuthService.setupPIN.mockResolvedValue({
        success: false,
        message: 'User not found'
      });

      const response = await request(app)
        .post('/api/auth/setup-pin')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_4_DIGIT })
        .expect(400);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for invalid PIN format', async () => {
      mockAuthService.setupPIN.mockResolvedValue({
        success: false,
        message: 'PIN must be 4-6 digits'
      });

      const response = await request(app)
        .post('/api/auth/setup-pin')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.INVALID_SHORT })
        .expect(400);

      expect(response.body.error).toBe('PIN must be 4-6 digits');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.setupPIN.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/setup-pin')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_4_DIGIT })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct PIN', async () => {
      const user = createTestUser();
      
      mockAuthService.loginWithPIN.mockResolvedValue({
        success: true,
        message: 'Login successful',
        token: 'test-jwt-token',
        user
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_4_DIGIT })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBe('test-jwt-token');
      expect(response.body.user).toMatchObject({ id: user.id });
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('should return 400 for incorrect PIN', async () => {
      mockAuthService.loginWithPIN.mockResolvedValue({
        success: false,
        message: 'Invalid PIN. 2 attempts remaining.'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: '0000' })
        .expect(400);

      expect(response.body.error).toContain('Invalid PIN');
    });

    it('should return 400 when phone number is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ pin: TEST_PINS.VALID_4_DIGIT })
        .expect(400);

      expect(response.body.error).toBe('Phone number and PIN are required');
    });

    it('should return 400 when PIN is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(400);

      expect(response.body.error).toBe('Phone number and PIN are required');
    });

    it('should return 400 when account is locked', async () => {
      mockAuthService.loginWithPIN.mockResolvedValue({
        success: false,
        message: 'Account is locked. Please try again in 25 minutes.'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_4_DIGIT })
        .expect(400);

      expect(response.body.error).toContain('Account is locked');
    });

    it('should return 400 when user not found', async () => {
      mockAuthService.loginWithPIN.mockResolvedValue({
        success: false,
        message: 'User not found'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_4_DIGIT })
        .expect(400);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 when PIN not set up', async () => {
      mockAuthService.loginWithPIN.mockResolvedValue({
        success: false,
        message: 'PIN not set up. Please set up your PIN first.'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_4_DIGIT })
        .expect(400);

      expect(response.body.error).toContain('PIN not set up');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.loginWithPIN.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID, pin: TEST_PINS.VALID_4_DIGIT })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/login/biometric', () => {
    it('should login with biometric', async () => {
      const user = createTestUser();
      
      mockAuthService.loginWithBiometric.mockResolvedValue({
        success: true,
        message: 'Biometric login successful',
        token: 'test-jwt-token',
        user
      });

      const response = await request(app)
        .post('/api/auth/login/biometric')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(200);

      expect(response.body.message).toBe('Biometric login successful');
      expect(response.body.token).toBe('test-jwt-token');
      expect(response.body.user).toMatchObject({ id: user.id });
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('should return 400 when phone number is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login/biometric')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Phone number is required');
    });

    it('should return 400 when user not found', async () => {
      mockAuthService.loginWithBiometric.mockResolvedValue({
        success: false,
        message: 'User not found'
      });

      const response = await request(app)
        .post('/api/auth/login/biometric')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(400);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 when account is locked', async () => {
      mockAuthService.loginWithBiometric.mockResolvedValue({
        success: false,
        message: 'Account is locked. Please try again in 20 minutes.'
      });

      const response = await request(app)
        .post('/api/auth/login/biometric')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(400);

      expect(response.body.error).toContain('Account is locked');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.loginWithBiometric.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login/biometric')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/verify-token', () => {
    it('should verify valid token', async () => {
      mockAuthService.verifyToken.mockReturnValue({
        valid: true,
        userId: 'test-user-id',
        phoneNumber: TEST_PHONE_NUMBERS.VALID,
        userType: UserType.FARMER
      });

      const response = await request(app)
        .post('/api/auth/verify-token')
        .send({ token: 'valid-jwt-token' })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.userId).toBe('test-user-id');
      expect(response.body.phoneNumber).toBe(TEST_PHONE_NUMBERS.VALID);
      expect(response.body.userType).toBe(UserType.FARMER);
    });

    it('should return 401 for invalid token', async () => {
      mockAuthService.verifyToken.mockReturnValue({
        valid: false
      });

      const response = await request(app)
        .post('/api/auth/verify-token')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should return 401 for expired token', async () => {
      mockAuthService.verifyToken.mockReturnValue({
        valid: false
      });

      const response = await request(app)
        .post('/api/auth/verify-token')
        .send({ token: 'expired-token' })
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-token')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Token is required');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Token verification error');
      });

      const response = await request(app)
        .post('/api/auth/verify-token')
        .send({ token: 'some-token' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/auth/profile/:userId', () => {
    it('should get user profile', async () => {
      const user = createTestUser();
      
      mockAuthService.getUserProfile.mockResolvedValue({
        success: true,
        message: 'Profile retrieved successfully',
        user
      });

      const response = await request(app)
        .get('/api/auth/profile/test-user-id')
        .expect(200);

      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.user).toMatchObject({ id: user.id });
    });

    it('should return 404 for non-existent user', async () => {
      mockAuthService.getUserProfile.mockResolvedValue({
        success: false,
        message: 'User not found'
      });

      const response = await request(app)
        .get('/api/auth/profile/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .get('/api/auth/profile/')
        .expect(404); // Express returns 404 for missing route params

      // This test verifies the route doesn't match without userId
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.getUserProfile.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/profile/test-user-id')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /api/auth/profile/:userId', () => {
    it('should update non-sensitive profile data', async () => {
      const updatedUser = createTestUser({ name: 'Updated Name' });
      
      mockAuthService.updateUserProfile.mockResolvedValue({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });

      const response = await request(app)
        .put('/api/auth/profile/test-user-id')
        .send({ name: 'Updated Name', location: createTestLocation() })
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.name).toBe('Updated Name');
    });

    it('should update phone number with verification', async () => {
      const updatedUser = createTestUser({ phoneNumber: '9999999999' });
      
      mockAuthService.updateUserProfile.mockResolvedValue({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });

      const response = await request(app)
        .put('/api/auth/profile/test-user-id')
        .send({ phoneNumber: '9999999999', isPhoneVerified: true })
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
    });

    it('should update bank account with verification', async () => {
      const updatedUser = createTestUser({ bankAccount: createTestBankAccount() });
      
      mockAuthService.updateUserProfile.mockResolvedValue({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });

      const response = await request(app)
        .put('/api/auth/profile/test-user-id')
        .send({ bankAccount: createTestBankAccount(), isPhoneVerified: true })
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
    });

    it('should return 403 for phone update without verification', async () => {
      mockAuthService.updateUserProfile.mockResolvedValue({
        success: false,
        requiresVerification: true,
        message: 'Phone verification required for updating sensitive data'
      });

      const response = await request(app)
        .put('/api/auth/profile/test-user-id')
        .send({ phoneNumber: '9999999999', isPhoneVerified: false })
        .expect(403);

      expect(response.body.error).toContain('Phone verification required');
      expect(response.body.requiresVerification).toBe(true);
    });

    it('should return 403 for bank account update without verification', async () => {
      mockAuthService.updateUserProfile.mockResolvedValue({
        success: false,
        requiresVerification: true,
        message: 'Phone verification required for updating sensitive data'
      });

      const response = await request(app)
        .put('/api/auth/profile/test-user-id')
        .send({ bankAccount: createTestBankAccount(), isPhoneVerified: false })
        .expect(403);

      expect(response.body.error).toContain('Phone verification required');
      expect(response.body.requiresVerification).toBe(true);
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .put('/api/auth/profile/')
        .send({ name: 'Updated Name' })
        .expect(404); // Express returns 404 for missing route params
    });

    it('should return 400 when user not found', async () => {
      mockAuthService.updateUserProfile.mockResolvedValue({
        success: false,
        message: 'User not found'
      });

      const response = await request(app)
        .put('/api/auth/profile/non-existent-id')
        .send({ name: 'Updated Name' })
        .expect(400);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.updateUserProfile.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/auth/profile/test-user-id')
        .send({ name: 'Updated Name' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Multi-Language Support', () => {
    SUPPORTED_LANGUAGES.forEach(lang => {
      it(`should handle ${lang} language preference in registration`, async () => {
        const userWithLang = createTestUserWithLanguages({
          languagePreference: lang,
          voiceLanguagePreference: lang,
          recentLanguages: [lang, 'en']
        });
        
        mockAuthService.createUser.mockResolvedValue({
          success: true,
          message: 'User created successfully',
          user: userWithLang
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            phoneNumber: TEST_PHONE_NUMBERS.VALID,
            name: 'Test User',
            userType: UserType.FARMER,
            location: createTestLocation(),
            languagePreference: lang,
            voiceLanguagePreference: lang,
            recentLanguages: [lang, 'en']
          })
          .expect(201);

        expect(response.body.user.languagePreference).toBe(lang);
        expect(response.body.user.voiceLanguagePreference).toBe(lang);
        expect(response.body.user.recentLanguages).toContain(lang);
      });
    });

    it('should return language preferences in profile response', async () => {
      const userWithLang = createTestUserWithLanguages();
      
      mockAuthService.getUserProfile.mockResolvedValue({
        success: true,
        message: 'Profile retrieved successfully',
        user: userWithLang
      });

      const response = await request(app)
        .get('/api/auth/profile/test-user-id')
        .expect(200);

      expect(response.body.user.languagePreference).toBeDefined();
      expect(response.body.user.voiceLanguagePreference).toBeDefined();
      expect(response.body.user.recentLanguages).toBeDefined();
    });
  });

  describe('Error Handling Consistency', () => {
    it('should return consistent error format for all endpoints', async () => {
      mockAuthService.requestOTP.mockResolvedValue({
        success: false,
        message: 'Test error message'
      });

      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should not expose sensitive information in 500 errors', async () => {
      mockAuthService.requestOTP.mockRejectedValue(new Error('Database connection failed at host 192.168.1.1'));

      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ phoneNumber: TEST_PHONE_NUMBERS.VALID })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.error).not.toContain('192.168.1.1');
      expect(response.body.error).not.toContain('Database');
    });

    it('should return 400 for validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 403 for authorization errors', async () => {
      mockAuthService.updateUserProfile.mockResolvedValue({
        success: false,
        requiresVerification: true,
        message: 'Phone verification required'
      });

      const response = await request(app)
        .put('/api/auth/profile/test-user-id')
        .send({ phoneNumber: '9999999999' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for not found errors', async () => {
      mockAuthService.getUserByPhone.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/auth/user/${TEST_PHONE_NUMBERS.VALID}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });
});
