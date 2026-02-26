import type { User, OTPSession } from '../../../auth/auth.types';

/**
 * Create mock sqliteHelpers for testing auth service
 * 
 * This creates Jest mock functions for all sqliteHelpers functions used by the auth service.
 * Each function is a Jest mock that can be configured with mockResolvedValue/mockRejectedValue.
 */
export function createMockSqliteHelpers() {
  return {
    // OTP Session functions
    createOTPSession: jest.fn(),
    getOTPSession: jest.fn(),
    deleteOTPSession: jest.fn(),
    updateOTPAttempts: jest.fn(),
    
    // User PIN functions
    getUserPinHash: jest.fn(),
    updateUserPin: jest.fn(),
    
    // Failed attempts and account locking functions
    getFailedAttempts: jest.fn(),
    incrementFailedAttempts: jest.fn(),
    resetFailedAttempts: jest.fn(),
    lockAccount: jest.fn(),
    
    // User CRUD functions
    createUser: jest.fn(),
    getUserByPhone: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
  };
}

/**
 * Configure mock sqliteHelpers with default resolved values
 * 
 * This sets up default behavior for all mock functions to return successful responses.
 * Individual tests can override these defaults using mockResolvedValue/mockRejectedValue.
 * 
 * @param mockHelpers - The mock helpers object created by createMockSqliteHelpers()
 */
export function configureMockSqliteHelpers(mockHelpers: ReturnType<typeof createMockSqliteHelpers>) {
  // OTP Session functions - default to successful operations
  mockHelpers.createOTPSession.mockResolvedValue(undefined);
  mockHelpers.getOTPSession.mockResolvedValue(null);
  mockHelpers.deleteOTPSession.mockResolvedValue(undefined);
  mockHelpers.updateOTPAttempts.mockResolvedValue(undefined);
  
  // User PIN functions - default to no PIN hash found
  mockHelpers.getUserPinHash.mockResolvedValue(undefined);
  mockHelpers.updateUserPin.mockResolvedValue(undefined);
  
  // Failed attempts and account locking - default to no failed attempts
  mockHelpers.getFailedAttempts.mockResolvedValue(undefined);
  mockHelpers.incrementFailedAttempts.mockResolvedValue(undefined);
  mockHelpers.resetFailedAttempts.mockResolvedValue(undefined);
  mockHelpers.lockAccount.mockResolvedValue(undefined);
  
  // User CRUD functions - default to no user found
  mockHelpers.createUser.mockResolvedValue(undefined as any);
  mockHelpers.getUserByPhone.mockResolvedValue(undefined);
  mockHelpers.getUserById.mockResolvedValue(undefined);
  mockHelpers.updateUser.mockResolvedValue(undefined);
}
