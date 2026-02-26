# Design Document: Auth Controller Integration Tests

## Overview

This design document outlines the comprehensive integration test suite for the Auth Controller in the Bharat Mandi application. The Auth Controller is security-critical code handling user registration, OTP verification, PIN-based authentication, biometric login, and profile management. Currently at 0% test coverage (328 lines), this test suite will achieve 80%+ coverage through systematic testing of all 10 HTTP endpoints.

The test suite follows the project's testing strategy, using Jest as the test runner, Supertest for HTTP endpoint testing, and fast-check for property-based testing. Tests will be organized in `src/features/auth/__tests__/` following the established patterns from the media controller tests.

### Key Design Goals

1. **Comprehensive Endpoint Coverage**: Test all 10 auth controller endpoints with success, error, and edge cases
2. **Service Isolation**: Mock AuthService completely to test controller logic in isolation
3. **Security Validation**: Include tests for SQL injection, rate limiting, and input sanitization
4. **Property-Based Testing**: Validate universal correctness properties (phone normalization, token generation)
5. **Multi-Language Support**: Test language preference handling across all 11 supported Indian languages
6. **Maintainability**: Follow project conventions with clear test organization and descriptive names

## Architecture

### Test Suite Structure

```
src/features/auth/__tests__/
├── auth.controller.test.ts       # Integration tests for all endpoints
├── auth.controller.pbt.test.ts   # Property-based tests
└── test-helpers/
    ├── mock-auth-service.ts      # Mock service configuration
    ├── test-data-factories.ts    # Test data generators
    └── test-constants.ts         # Shared test constants
```

### Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Suite                               │
│  (auth.controller.test.ts)                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Supertest HTTP requests
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express Test App                            │
│  app.use('/api/auth', authController)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Controller calls service methods
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Mock Auth Service                               │
│  - requestOTP: jest.fn()                                    │
│  - verifyOTP: jest.fn()                                     │
│  - createUser: jest.fn()                                    │
│  - getUserByPhone: jest.fn()                                │
│  - setupPIN: jest.fn()                                      │
│  - loginWithPIN: jest.fn()                                  │
│  - loginWithBiometric: jest.fn()                            │
│  - verifyToken: jest.fn()                                   │
│  - getUserProfile: jest.fn()                                │
│  - updateUserProfile: jest.fn()                             │
└─────────────────────────────────────────────────────────────┘
```

### Mock Strategy

The test suite will use Jest's mocking capabilities to completely isolate the controller from the auth service implementation:

1. **Module Mocking**: Use `jest.mock('../auth.service')` to replace the entire service module
2. **Function Mocks**: Each service function becomes a `jest.fn()` that can be configured per test
3. **Return Value Configuration**: Use `mockResolvedValue()` and `mockRejectedValue()` to simulate success/error scenarios
4. **Call Verification**: Use `expect(mockFunction).toHaveBeenCalledWith()` to verify correct parameters

This approach ensures:
- No database connections required
- Fast test execution (< 1ms per test)
- Complete control over service behavior
- Easy simulation of error conditions

## Components and Interfaces

### Test Application Setup

```typescript
// Test Express app configuration
const app = express();
app.use(express.json());
app.use('/api/auth', authController);
```

The test app is a minimal Express application that:
- Parses JSON request bodies
- Mounts the auth controller at `/api/auth`
- Provides a target for Supertest HTTP requests

### Mock Service Interface

```typescript
interface MockAuthService {
  requestOTP: jest.Mock<Promise<{ success: boolean; message: string }>>;
  verifyOTP: jest.Mock<Promise<{ success: boolean; message: string }>>;
  createUser: jest.Mock<Promise<{ success: boolean; message: string; user?: User }>>;
  getUserByPhone: jest.Mock<Promise<User | null>>;
  setupPIN: jest.Mock<Promise<{ success: boolean; message: string }>>;
  loginWithPIN: jest.Mock<Promise<{ success: boolean; message: string; token?: string; user?: User }>>;
  loginWithBiometric: jest.Mock<Promise<{ success: boolean; message: string; token?: string; user?: User }>>;
  verifyToken: jest.Mock<{ valid: boolean; userId?: string; phoneNumber?: string; userType?: UserType }>;
  getUserProfile: jest.Mock<Promise<{ success: boolean; user?: User; message: string }>>;
  updateUserProfile: jest.Mock<Promise<{ success: boolean; user?: User; message: string; requiresVerification?: boolean }>>;
}
```

### Test Data Factories

Test data factories provide consistent, realistic test data:

```typescript
// User factory
function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    phoneNumber: '9876543210',
    name: 'Test User',
    userType: UserType.FARMER,
    location: {
      latitude: 28.6139,
      longitude: 77.2090,
      address: 'Test Address, Delhi'
    },
    createdAt: new Date(),
    ...overrides
  };
}

// OTP session factory
function createTestOTPSession(overrides?: Partial<OTPSession>): OTPSession {
  return {
    phoneNumber: '9876543210',
    otp: '123456',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    attempts: 0,
    ...overrides
  };
}

// Token factory
function createTestToken(userId: string = 'test-user-id'): string {
  return `test-jwt-token-${userId}`;
}
```

## Data Models

### User Model

```typescript
interface User {
  id: string;
  phoneNumber: string;
  name: string;
  userType: UserType;
  location: Location;
  bankAccount?: BankAccount;
  languagePreference?: string;
  voiceLanguagePreference?: string;
  recentLanguages?: string[];
  createdAt: Date;
  updatedAt?: Date;
}
```

### Test Request/Response Models

```typescript
// OTP Request
interface OTPRequest {
  phoneNumber: string;
}

// OTP Verification Request
interface OTPVerifyRequest {
  phoneNumber: string;
  otp: string;
}

// Registration Request
interface RegisterRequest {
  phoneNumber: string;
  name: string;
  userType: UserType;
  location: Location;
  bankAccount?: BankAccount;
}

// PIN Setup Request
interface PINSetupRequest {
  phoneNumber: string;
  pin: string;
}

// Login Request
interface LoginRequest {
  phoneNumber: string;
  pin: string;
}

// Profile Update Request
interface ProfileUpdateRequest {
  name?: string;
  location?: Location;
  phoneNumber?: string;
  bankAccount?: BankAccount;
  isPhoneVerified?: boolean;
}
```

### Test Constants

```typescript
const TEST_PHONE_NUMBERS = {
  VALID: '9876543210',
  WITH_COUNTRY_CODE: '+919876543210',
  WITH_91_PREFIX: '919876543210',
  INVALID_SHORT: '987654',
  INVALID_LONG: '98765432109876',
  INVALID_CHARS: '98765abcde'
};

const TEST_PINS = {
  VALID_4_DIGIT: '1234',
  VALID_6_DIGIT: '123456',
  INVALID_SHORT: '12',
  INVALID_LONG: '1234567'
};

const TEST_USER_TYPES = [
  UserType.FARMER,
  UserType.BUYER,
  UserType.LOGISTICS_PROVIDER
];

const SUPPORTED_LANGUAGES = [
  'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or', 'pa'
];

const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "admin'--",
  "' OR 1=1--"
];
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Phone Number Normalization Idempotence

*For any* phone number string, normalizing it twice should produce the same result as normalizing it once.

**Validates: Requirements 14.5, 18.1**

This is a classic idempotence property. The normalization function should be stable—applying it multiple times should not change the result after the first application. This ensures that phone numbers are consistently formatted regardless of how many times they pass through the normalization logic.

### Property 2: SQL Injection Payload Rejection

*For any* SQL injection payload (UNION, DROP, SELECT, OR 1=1, etc.) provided in phoneNumber, name, or userId fields, the endpoint should reject the request with 400 status or handle it safely without database errors.

**Validates: Requirements 11.1, 11.2, 11.3**

This property ensures that common SQL injection attack patterns are consistently rejected or safely handled across all input fields. By testing with a variety of SQL injection payloads, we verify that the controller properly validates and sanitizes inputs before passing them to the service layer.

### Property 3: Service Error Handling Consistency

*For any* endpoint in the auth controller, when the Auth_Service throws an unexpected error, the endpoint should return 500 status with a generic error message that does not expose sensitive information.

**Validates: Requirements 13.1, 13.5**

This property ensures consistent error handling across all endpoints. No matter which endpoint is called, service errors should be caught and transformed into safe, user-friendly error responses that don't leak implementation details, stack traces, or database information.

### Property 4: Error Response Format Consistency

*For any* error response from any auth controller endpoint, the response should follow a consistent JSON format with an "error" field containing the error message.

**Validates: Requirements 13.6**

This property ensures that all error responses have a predictable structure, making it easier for clients to handle errors consistently. Every error response should be a JSON object with at least an "error" field.

### Property 5: Phone Number Normalization Consistency Across Endpoints

*For any* valid phone number format (+91XXXXXXXXXX, 91XXXXXXXXXX, or XXXXXXXXXX), when provided to any endpoint that accepts phone numbers, the normalization should produce a consistent 10-digit output.

**Validates: Requirements 14.4**

This property ensures that phone number normalization behaves identically across all endpoints. Whether a phone number is provided to the OTP request endpoint, registration endpoint, or login endpoint, the normalization logic should produce the same result.

### Property 6: Valid Phone Number Acceptance

*For any* valid 10-digit Indian phone number (with or without +91 or 91 prefix), the phone number validation should pass.

**Validates: Requirements 18.2**

This property ensures that all legitimate phone number formats are accepted by the validation logic. We generate various valid phone number formats and verify that none are incorrectly rejected.

### Property 7: Invalid Phone Number Rejection

*For any* invalid phone number (wrong length, non-numeric characters, etc.), the phone number validation should fail.

**Validates: Requirements 18.3**

This property ensures that malformed phone numbers are consistently rejected. We generate various invalid phone number formats and verify that all are properly rejected with appropriate error messages.

### Property 8: JWT Token Uniqueness

*For any* two different users (different userId, phoneNumber, or userType), the generated JWT tokens should be different.

**Validates: Requirements 18.4**

This property ensures that the token generation process produces unique tokens for different users. This is critical for security—users should not be able to use each other's tokens.

### Property 9: JWT Token Round-Trip Verification

*For any* valid JWT token generated by the system, verifying the token should correctly decode the original user information (userId, phoneNumber, userType).

**Validates: Requirements 18.5**

This is a round-trip property. Token generation and verification are inverse operations—generating a token from user data and then verifying it should return the same user data. This ensures the token encoding/decoding process is correct.

### Property 10: Multi-Language Support Consistency

*For any* of the 11 supported Indian language codes (en, hi, bn, te, mr, ta, gu, kn, ml, or, pa), when provided as languagePreference, voiceLanguagePreference, or in recentLanguages array, the system should store and return them correctly.

**Validates: Requirements 19.5**

This property ensures that all supported languages are handled consistently. The system should not have special cases or bugs for specific languages—all 11 languages should work identically.

## Error Handling

### Error Response Structure

All error responses follow a consistent JSON structure:

```typescript
{
  error: string;              // Human-readable error message
  requiresVerification?: boolean;  // For 403 responses requiring OTP verification
}
```

### HTTP Status Code Mapping

| Status Code | Meaning | When to Use |
|-------------|---------|-------------|
| 200 | Success | Successful GET, POST (non-creation), PUT operations |
| 201 | Created | Successful user registration |
| 400 | Bad Request | Validation errors, invalid input, business logic errors |
| 401 | Unauthorized | Invalid or expired JWT token |
| 403 | Forbidden | Operation requires phone verification |
| 404 | Not Found | User or resource not found |
| 500 | Internal Server Error | Unexpected service errors, exceptions |

### Error Handling Patterns

#### 1. Validation Errors (400)

```typescript
// Missing required fields
if (!phoneNumber) {
  return res.status(400).json({ error: 'Phone number is required' });
}

// Invalid format
if (!isValidUserType(userType)) {
  return res.status(400).json({ error: 'Invalid user type' });
}
```

#### 2. Service Errors (400)

```typescript
const result = await authService.someOperation();
if (!result.success) {
  return res.status(400).json({ error: result.message });
}
```

#### 3. Authentication Errors (401)

```typescript
const result = verifyToken(token);
if (!result.valid) {
  return res.status(401).json({ error: 'Invalid or expired token' });
}
```

#### 4. Authorization Errors (403)

```typescript
if (result.requiresVerification) {
  return res.status(403).json({
    error: result.message,
    requiresVerification: true
  });
}
```

#### 5. Not Found Errors (404)

```typescript
const user = await getUserByPhone(phoneNumber);
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}
```

#### 6. Unexpected Errors (500)

```typescript
try {
  // ... operation
} catch (error) {
  console.error('Error during operation:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

### Security Considerations

1. **No Sensitive Information in Errors**: Error messages never expose:
   - Stack traces
   - Database connection details
   - Internal file paths
   - User data from other accounts

2. **Generic Error Messages**: 500 errors always return "Internal server error" to avoid leaking implementation details

3. **Consistent Error Format**: All errors follow the same JSON structure to prevent information leakage through response format differences

## Testing Strategy

### Test Organization

The test suite is organized into three main files:

1. **auth.controller.test.ts**: Integration tests for all endpoints
   - Organized by endpoint using `describe` blocks
   - Tests success cases, error cases, and edge cases
   - Verifies HTTP status codes, response bodies, and service calls
   - Uses Arrange-Act-Assert pattern

2. **auth.controller.pbt.test.ts**: Property-based tests
   - Tests universal correctness properties
   - Uses fast-check for generative testing
   - Runs 100+ test cases per property
   - Validates invariants across many inputs

3. **test-helpers/**: Shared test utilities
   - Mock service configuration
   - Test data factories
   - Test constants and fixtures

### Test Structure Pattern

Each integration test follows this structure:

```typescript
describe('POST /api/auth/endpoint-name', () => {
  beforeEach(() => {
    // Configure mock service for this test
    mockAuthService.someMethod.mockResolvedValue({
      success: true,
      message: 'Success'
    });
  });

  it('should handle success case', async () => {
    // Arrange
    const requestData = { /* test data */ };

    // Act
    const response = await request(app)
      .post('/api/auth/endpoint-name')
      .send(requestData)
      .expect(200);

    // Assert
    expect(response.body).toMatchObject({
      message: 'Success'
    });
    expect(mockAuthService.someMethod).toHaveBeenCalledWith(
      expectedParam1,
      expectedParam2
    );
  });

  it('should handle error case', async () => {
    // Arrange
    mockAuthService.someMethod.mockResolvedValue({
      success: false,
      message: 'Error occurred'
    });

    // Act & Assert
    const response = await request(app)
      .post('/api/auth/endpoint-name')
      .send(requestData)
      .expect(400);

    expect(response.body.error).toBe('Error occurred');
  });
});
```

### Property-Based Test Pattern

```typescript
describe('Property: Phone Number Normalization Idempotence', () => {
  it('should produce same result when normalized twice', () => {
    fc.assert(
      fc.property(
        fc.string(), // Generate random strings
        (phoneNumber) => {
          const normalized1 = normalizePhoneNumber(phoneNumber);
          const normalized2 = normalizePhoneNumber(normalized1);
          return normalized1 === normalized2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Mock Service Configuration

The mock service is configured using Jest's mocking capabilities:

```typescript
// Mock the entire auth.service module
jest.mock('../auth.service');

// Import the mocked module
import * as authService from '../auth.service';

// Create mock implementations
const mockAuthService = {
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

// Configure the mock module to return mock implementations
(authService.requestOTP as jest.Mock) = mockAuthService.requestOTP;
(authService.verifyOTP as jest.Mock) = mockAuthService.verifyOTP;
// ... etc for all functions
```

### Test Data Factories

Test data factories provide consistent, realistic test data:

```typescript
// factories/user.factory.ts
export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    phoneNumber: '9876543210',
    name: 'Test User',
    userType: UserType.FARMER,
    location: {
      latitude: 28.6139,
      longitude: 77.2090,
      address: 'Test Address, Delhi'
    },
    createdAt: new Date(),
    ...overrides
  };
}

export function createTestUserWithLanguages(overrides?: Partial<User>): User {
  return createTestUser({
    languagePreference: 'hi',
    voiceLanguagePreference: 'hi',
    recentLanguages: ['hi', 'en'],
    ...overrides
  });
}
```

### Coverage Goals

| Metric | Target | Minimum |
|--------|--------|---------|
| Line Coverage | 85% | 80% |
| Branch Coverage | 80% | 75% |
| Function Coverage | 100% | 100% |
| Statement Coverage | 85% | 80% |

### Test Execution

```bash
# Run all auth controller tests
npm test -- auth.controller

# Run integration tests only
npm test -- auth.controller.test.ts

# Run property-based tests only
npm test -- auth.controller.pbt.test.ts

# Run with coverage
npm test -- auth.controller --coverage

# Run in watch mode during development
npm test -- auth.controller --watch
```

### Test Isolation

Each test is completely isolated:

1. **beforeEach**: Clear all mock call history and reset mock implementations
2. **No shared state**: Each test creates its own test data
3. **Independent execution**: Tests can run in any order
4. **Parallel execution**: Tests can run in parallel without conflicts

### Security Testing Approach

Security tests validate protection against common attacks:

1. **SQL Injection**: Test with common SQL injection payloads in all input fields
2. **Rate Limiting**: Verify rate limiting on OTP requests and login attempts
3. **Account Locking**: Verify account locking after failed login attempts
4. **Input Validation**: Verify all inputs are validated before processing
5. **Error Information Leakage**: Verify errors don't expose sensitive information

### Multi-Language Testing Approach

Multi-language tests validate support for all 11 Indian languages:

```typescript
const SUPPORTED_LANGUAGES = [
  'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or', 'pa'
];

describe('Multi-Language Support', () => {
  SUPPORTED_LANGUAGES.forEach(lang => {
    it(`should handle ${lang} language preference`, async () => {
      const user = createTestUser({
        languagePreference: lang
      });
      
      mockAuthService.createUser.mockResolvedValue({
        success: true,
        user
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          phoneNumber: '9876543210',
          name: 'Test User',
          userType: UserType.FARMER,
          location: testLocation,
          languagePreference: lang
        })
        .expect(201);

      expect(response.body.user.languagePreference).toBe(lang);
    });
  });
});
```

### Endpoint Test Coverage Matrix

| Endpoint | Success Cases | Error Cases | Edge Cases | Security Tests |
|----------|---------------|-------------|------------|----------------|
| POST /request-otp | Valid phone | Missing phone, invalid format, service error | +91 prefix, 91 prefix | SQL injection |
| POST /verify-otp | Valid OTP existing user, Valid OTP new user | Missing fields, invalid OTP, expired OTP, service error | - | - |
| POST /register | All user types (farmer, buyer, transporter) | Missing fields, invalid user type, invalid location, service error | With bank account, with languages | SQL injection |
| GET /user/:phoneNumber | Existing user | Non-existent user, service error | - | SQL injection |
| POST /setup-pin | 4-digit PIN, 6-digit PIN | Missing fields, user not found, invalid PIN, service error | - | - |
| POST /login | Correct PIN | Missing fields, incorrect PIN, account locked, user not found, PIN not set, service error | - | Rate limiting, brute force |
| POST /login/biometric | Valid phone | Missing phone, user not found, account locked, service error | - | - |
| POST /verify-token | Valid token | Missing token, invalid token, expired token, service error | - | - |
| GET /profile/:userId | Existing user | Missing userId, non-existent user, service error | - | SQL injection |
| PUT /profile/:userId | Non-sensitive updates, Verified phone update, Verified bank update | Missing userId, Unverified phone update, Unverified bank update, user not found, service error | With languages | SQL injection |

## Implementation Notes

### Test File Structure

```typescript
// src/features/auth/__tests__/auth.controller.test.ts

import request from 'supertest';
import express from 'express';
import { authController } from '../auth.controller';
import * as authService from '../auth.service';

// Mock the auth service
jest.mock('../auth.service');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authController);

// Mock service functions
const mockAuthService = {
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

// Configure mocks
(authService.requestOTP as jest.Mock) = mockAuthService.requestOTP;
// ... etc

describe('Auth Controller - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/request-otp', () => {
    // Tests for OTP request endpoint
  });

  describe('POST /api/auth/verify-otp', () => {
    // Tests for OTP verification endpoint
  });

  // ... etc for all endpoints
});
```

### Property-Based Test File Structure

```typescript
// src/features/auth/__tests__/auth.controller.pbt.test.ts

import * as fc from 'fast-check';
import { normalizePhoneNumber } from '../auth.service';

describe('Auth Controller - Property-Based Tests', () => {
  describe('Property 1: Phone Number Normalization Idempotence', () => {
    it('should produce same result when normalized twice', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (phoneNumber) => {
            const normalized1 = normalizePhoneNumber(phoneNumber);
            const normalized2 = normalizePhoneNumber(normalized1);
            return normalized1 === normalized2;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ... etc for all properties
});
```

### Test Helpers Structure

```typescript
// src/features/auth/__tests__/test-helpers/test-data-factories.ts

import { User, UserType, Location, BankAccount } from '../../auth.types';

export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    phoneNumber: '9876543210',
    name: 'Test User',
    userType: UserType.FARMER,
    location: createTestLocation(),
    createdAt: new Date(),
    ...overrides
  };
}

export function createTestLocation(overrides?: Partial<Location>): Location {
  return {
    latitude: 28.6139,
    longitude: 77.2090,
    address: 'Test Address, Delhi',
    ...overrides
  };
}

export function createTestBankAccount(overrides?: Partial<BankAccount>): BankAccount {
  return {
    accountNumber: '1234567890',
    ifscCode: 'TEST0001234',
    bankName: 'Test Bank',
    accountHolderName: 'Test User',
    ...overrides
  };
}
```

```typescript
// src/features/auth/__tests__/test-helpers/test-constants.ts

export const TEST_PHONE_NUMBERS = {
  VALID: '9876543210',
  WITH_COUNTRY_CODE: '+919876543210',
  WITH_91_PREFIX: '919876543210',
  INVALID_SHORT: '987654',
  INVALID_LONG: '98765432109876',
  INVALID_CHARS: '98765abcde'
};

export const TEST_PINS = {
  VALID_4_DIGIT: '1234',
  VALID_6_DIGIT: '123456',
  INVALID_SHORT: '12',
  INVALID_LONG: '1234567'
};

export const TEST_USER_TYPES = [
  UserType.FARMER,
  UserType.BUYER,
  UserType.LOGISTICS_PROVIDER
];

export const SUPPORTED_LANGUAGES = [
  'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or', 'pa'
];

export const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "admin'--",
  "' OR 1=1--"
];
```

### Dependencies

The test suite requires the following dependencies:

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "fast-check": "^3.15.0",
    "ts-jest": "^29.1.0"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js (relevant sections)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.pbt.test.ts'
  ],
  collectCoverageFrom: [
    'src/features/auth/auth.controller.ts'
  ],
  coverageThreshold: {
    'src/features/auth/auth.controller.ts': {
      statements: 80,
      branches: 75,
      functions: 100,
      lines: 80
    }
  }
};
```

## Summary

This design provides a comprehensive testing strategy for the Auth Controller that will:

1. Achieve 80%+ code coverage through systematic endpoint testing
2. Validate security through SQL injection and rate limiting tests
3. Ensure correctness through property-based testing of invariants
4. Support all 11 Indian languages through multi-language tests
5. Maintain test isolation through complete service mocking
6. Follow project conventions for test organization and naming

The test suite will consist of approximately 60-70 integration tests covering all success, error, and edge cases, plus 10 property-based tests validating universal correctness properties. All tests will execute quickly (< 5 seconds total) due to complete service mocking, enabling fast feedback during development.
