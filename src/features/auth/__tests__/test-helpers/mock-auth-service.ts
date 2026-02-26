/**
 * Mock Auth Service Configuration
 * 
 * Provides mock implementations for all auth service methods
 * to enable isolated controller testing.
 */

/**
 * Create mock auth service with all methods
 */
export function createMockAuthService() {
  return {
    requestOTP: jest.fn(),
    verifyOTP: jest.fn(),
    createUser: jest.fn(),
    getUserByPhone: jest.fn(),
    setupPIN: jest.fn(),
    loginWithPIN: jest.fn(),
    loginWithBiometric: jest.fn(),
    verifyToken: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn()
  };
}

/**
 * Configure mock auth service with default success responses
 */
export function configureMockAuthService(mockService: ReturnType<typeof createMockAuthService>) {
  mockService.requestOTP.mockResolvedValue({
    success: true,
    message: 'OTP sent successfully'
  });

  mockService.verifyOTP.mockResolvedValue({
    success: true,
    message: 'OTP verified successfully'
  });

  mockService.createUser.mockResolvedValue({
    success: true,
    message: 'User created successfully',
    user: {
      id: 'test-user-id',
      phoneNumber: '9876543210',
      name: 'Test User',
      userType: 'farmer',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Test Address, Delhi'
      },
      createdAt: new Date()
    }
  });

  mockService.getUserByPhone.mockResolvedValue(null);

  mockService.setupPIN.mockResolvedValue({
    success: true,
    message: 'PIN set up successfully'
  });

  mockService.loginWithPIN.mockResolvedValue({
    success: true,
    message: 'Login successful',
    token: 'test-jwt-token',
    user: {
      id: 'test-user-id',
      phoneNumber: '9876543210',
      name: 'Test User',
      userType: 'farmer',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Test Address, Delhi'
      },
      createdAt: new Date()
    }
  });

  mockService.loginWithBiometric.mockResolvedValue({
    success: true,
    message: 'Biometric login successful',
    token: 'test-jwt-token',
    user: {
      id: 'test-user-id',
      phoneNumber: '9876543210',
      name: 'Test User',
      userType: 'farmer',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Test Address, Delhi'
      },
      createdAt: new Date()
    }
  });

  mockService.verifyToken.mockReturnValue({
    valid: true,
    userId: 'test-user-id',
    phoneNumber: '9876543210',
    userType: 'farmer'
  });

  mockService.getUserProfile.mockResolvedValue({
    success: true,
    message: 'Profile retrieved successfully',
    user: {
      id: 'test-user-id',
      phoneNumber: '9876543210',
      name: 'Test User',
      userType: 'farmer',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Test Address, Delhi'
      },
      createdAt: new Date()
    }
  });

  mockService.updateUserProfile.mockResolvedValue({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: 'test-user-id',
      phoneNumber: '9876543210',
      name: 'Updated User',
      userType: 'farmer',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Test Address, Delhi'
      },
      createdAt: new Date()
    }
  });
}
