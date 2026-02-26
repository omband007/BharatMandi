# Design Document: Auth Service Unit Tests

## Overview

This design document outlines the comprehensive unit test suite for the Auth Service in the Bharat Mandi application. The Auth Service handles critical security functions including OTP generation/verification, phone number normalization, PIN authentication, JWT token management, and user profile operations. Currently at 0% test coverage, this test suite will achieve 80%+ coverage through systematic testing of all service functions.

The test suite follows the project's established testing patterns from the auth controller tests, using Jest as the test runner, fast-check for property-based testing, and comprehensive mocking of external dependencies (DatabaseManager, bcrypt, jwt, sqliteHelpers). Tests will be organized in `src/features/auth/__tests__/` following the project conventions.

### Key Design Goals

1. **Comprehensive Function Coverage**: Test all 18 exported auth service functions with success, error, and edge cases
2. **Complete Isolation**: Mock all external dependencies (database, bcrypt, jwt, file system) for fast, reliable tests
3. **Security Validation**: Verify PIN hashing, account locking, OTP expiration, and token integrity
4. **Property-Based Testing**: Validate universal correctness properties (phone normalization idempotence, JWT round-trip, OTP range)
5. **Mock Strategy Consistency**: Follow patterns from successful auth controller tests for maintainability
6. **Fast Execution**: All tests run in-memory with no external dependencies (< 5 seconds total)

## Architecture

### Test Suite Structure

```
src/features/auth/__tests__/
├── auth.service.test.ts          # Unit tests for all service functions
├── auth.service.pbt.test.ts      # Property-based tests
└── test-helpers/
    ├── mock-database.ts          # DatabaseManager mock configuration
    ├── mock-sqlite-helpers.ts    # sqliteHelpers mock configuration
    ├── test-data-factories.ts    # Test data generators (already exists)
    └── test-constants.ts         # Shared test constants (already exists)
```

### Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Suite                               │
│  (auth.service.test.ts)                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Direct function calls
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Auth Service                                │
│  - normalizePhoneNumber()                                   │
│  - generateOTP()                                            │
│  - requestOTP()                                             │
│  - verifyOTP()                                              │
│  - createUser()                                             │
│  - getUserByPhone()                                         │
│  - setupPIN()                                               │
│  - loginWithPIN()                                           │
│  - loginWithBiometric()                                     │
│  - verifyToken()                                            │
│  - getUserProfile()                                         │
│  - updateUserProfile()                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Mocked dependencies
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Mocked Dependencies                             │
│  - global.sharedDbManager (DatabaseManager)                 │
│  - sqliteHelpers.insertOTPSession()                         │
│  - sqliteHelpers.getOTPSession()                            │
│  - sqliteHelpers.deleteOTPSession()                         │
│  - sqliteHelpers.updateOTPAttempts()                        │
│  - sqliteHelpers.insertUser()                               │
│  - sqliteHelpers.getUserByPhone()                           │
│  - sqliteHelpers.getUserById()                              │
│  - sqliteHelpers.updateUser()                               │
│  - bcrypt.hash()                                            │
│  - bcrypt.compare()                                         │
│  - jwt.sign()                                               │
│  - jwt.verify()                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mock Strategy

The test suite uses Jest's mocking capabilities to completely isolate the service from external dependencies:

1. **DatabaseManager Mocking**: Use `global.sharedDbManager` pattern to mock the database manager
2. **sqliteHelpers Mocking**: Use `jest.mock('../../database/sqliteHelpers')` to replace all helper functions
3. **bcrypt Mocking**: Use `jest.mock('bcrypt')` to mock password hashing
4. **jwt Mocking**: Use `jest.mock('jsonwebtoken')` to mock token operations
5. **setTimeout Mocking**: Use `jest.useFakeTimers()` for testing TTL behavior

This approach ensures:
- No database connections required
- No actual password hashing (fast tests)
- No actual JWT signing (predictable tokens)
- Complete control over all external behavior
- Easy simulation of error conditions

## Components and Interfaces

### Mock DatabaseManager Interface

```typescript
interface MockDatabaseManager {
  db: {
    prepare: jest.Mock<{
      run: jest.Mock;
      get: jest.Mock;
      all: jest.Mock;
    }>;
  };
}
```

### Mock sqliteHelpers Interface

```typescript
interface MockSqliteHelpers {
  insertOTPSession: jest.Mock<Promise<void>>;
  getOTPSession: jest.Mock<Promise<OTPSession | null>>;
  deleteOTPSession: jest.Mock<Promise<void>>;
  updateOTPAttempts: jest.Mock<Promise<void>>;
  insertUser: jest.Mock<Promise<User>>;
  getUserByPhone: jest.Mock<Promise<User | null>>;
  getUserById: jest.Mock<Promise<User | null>>;
  updateUser: jest.Mock<Promise<User>>;
}
```

### Mock bcrypt Interface

```typescript
interface MockBcrypt {
  hash: jest.Mock<Promise<string>>;
  compare: jest.Mock<Promise<boolean>>;
}
```

### Mock jwt Interface

```typescript
interface MockJwt {
  sign: jest.Mock<string>;
  verify: jest.Mock<TokenPayload>;
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

### OTP Session Model

```typescript
interface OTPSession {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
}
```

### Token Payload Model

```typescript
interface TokenPayload {
  userId: string;
  phoneNumber: string;
  userType: UserType;
}
```

### Test Data Factories

Test data factories are already available in `test-helpers/test-data-factories.ts`:

```typescript
// User factory
createTestUser(overrides?: Partial<User>): User

// User with languages factory
createTestUserWithLanguages(overrides?: Partial<User>): User

// Location factory
createTestLocation(overrides?: Partial<Location>): Location

// Bank account factory
createTestBankAccount(overrides?: Partial<BankAccount>): BankAccount

// OTP session factory
createTestOTPSession(overrides?: Partial<OTPSession>): OTPSession

// Token factory
createTestToken(userId: string): string
```

### Test Constants

Test constants are already available in `test-helpers/test-constants.ts`:

```typescript
TEST_PHONE_NUMBERS = {
  VALID: '9876543210',
  WITH_COUNTRY_CODE: '+919876543210',
  WITH_91_PREFIX: '919876543210',
  INVALID_SHORT: '987654',
  INVALID_LONG: '98765432109876',
  INVALID_CHARS: '98765abcde'
}

TEST_PINS = {
  VALID_4_DIGIT: '1234',
  VALID_6_DIGIT: '123456',
  INVALID_SHORT: '12',
  INVALID_LONG: '1234567'
}

SUPPORTED_LANGUAGES = [
  'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or', 'pa'
]
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following properties and performed redundancy elimination:

**Identified Properties:**
1. Phone normalization idempotence (1.5)
2. Phone normalization identity for valid 10-digit numbers (1.6)
3. Phone normalization removes +91 prefix (1.2)
4. Phone normalization removes 91 prefix (1.3)
5. Phone normalization trims whitespace (1.4)
6. OTP length is always 6 characters (2.1)
7. OTP contains only numeric digits (2.2)
8. OTP value is in range 100000-999999 (2.3)
9. Invalid phone formats are rejected (3.4)
10. JWT round-trip encoding/decoding (9.8)

**Redundancy Analysis:**
- Properties 3, 4, and 5 (prefix removal and whitespace trimming) are implementation details that support property 1 (idempotence). If idempotence holds, these transformations are working correctly.
- Properties 6, 7, and 8 (OTP format validation) can be combined into a single comprehensive property: "All generated OTPs are valid 6-digit numbers in range 100000-999999"
- Property 2 (identity) is a special case of property 1 (idempotence) for already-normalized inputs

**Final Properties After Redundancy Elimination:**
1. Phone normalization idempotence (subsumes prefix removal and whitespace handling)
2. OTP format validation (subsumes length, digit-only, and range checks)
3. Invalid phone rejection consistency
4. JWT round-trip verification

### Property 1: Phone Normalization Idempotence

*For any* phone number string, normalizing it twice should produce the same result as normalizing it once: `normalizePhoneNumber(normalizePhoneNumber(x)) === normalizePhoneNumber(x)`

**Validates: Requirements 1.5, 1.2, 1.3, 1.4**

This idempotence property ensures that the normalization function is stable. Applying it multiple times should not change the result after the first application. This property subsumes the prefix removal and whitespace trimming requirements—if idempotence holds, these transformations are working correctly.

### Property 2: OTP Format Validation

*For any* generated OTP, it must be a string of exactly 6 numeric digits with a numeric value between 100000 and 999999 inclusive.

**Validates: Requirements 2.1, 2.2, 2.3, 14.3**

This property combines three related requirements into a single comprehensive validation. Every OTP must satisfy all three constraints: correct length, numeric-only content, and valid range. Testing these together is more efficient than separate properties.

### Property 3: Invalid Phone Number Rejection

*For any* phone number that doesn't match valid Indian phone formats (10 digits starting with 6-9, with optional +91 or 91 prefix), the requestOTP function should reject it with success: false.

**Validates: Requirements 3.4, 3.5, 3.6**

This property ensures that invalid phone numbers are consistently rejected across all possible invalid formats. By testing with various invalid inputs (wrong length, invalid starting digit, non-numeric characters), we verify the validation logic is comprehensive.

### Property 4: JWT Round-Trip Verification

*For any* valid user data (userId, phoneNumber, userType), encoding it into a JWT token and then verifying that token should return the same user data.

**Validates: Requirements 9.8, 14.4**

This is a classic round-trip property. Token generation and verification are inverse operations—generating a token from user data and then verifying it should return the same user data. This ensures the token encoding/decoding process preserves information correctly.

## Error Handling

### Error Response Structure

All service functions return consistent response structures:

```typescript
// Success response
{
  success: true,
  message: string,
  user?: User,
  token?: string
}

// Error response
{
  success: false,
  message: string,
  requiresVerification?: boolean
}

// Token verification response
{
  valid: boolean,
  userId?: string,
  phoneNumber?: string,
  userType?: UserType
}
```

### Error Handling Patterns

#### 1. Validation Errors

```typescript
// Invalid phone format
if (!isValidPhoneFormat(phoneNumber)) {
  return {
    success: false,
    message: 'Invalid phone number format'
  };
}

// Invalid PIN format
if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
  return {
    success: false,
    message: 'PIN must be 4-6 digits'
  };
}
```

#### 2. Not Found Errors

```typescript
// User not found
const user = await getUserByPhone(phoneNumber);
if (!user) {
  return {
    success: false,
    message: 'User not found'
  };
}
```

#### 3. Authorization Errors

```typescript
// Phone verification required
if (!verifiedPhoneNumbers.has(normalizedPhone)) {
  return {
    success: false,
    message: 'Phone verification required',
    requiresVerification: true
  };
}
```

#### 4. Business Logic Errors

```typescript
// Account locked
if (isAccountLocked(user)) {
  const timeRemaining = getTimeRemaining(user.lockedUntil);
  return {
    success: false,
    message: `Account is locked. Please try again in ${timeRemaining} minutes.`
  };
}

// OTP expired
if (new Date() > session.expiresAt) {
  return {
    success: false,
    message: 'OTP expired. Please request a new OTP.'
  };
}
```

#### 5. Database Errors

```typescript
try {
  // Database operation
} catch (error) {
  console.error('Database error:', error);
  return {
    success: false,
    message: 'An error occurred. Please try again.'
  };
}
```

### Security Considerations

1. **No Sensitive Information in Errors**: Error messages never expose:
   - Database query details
   - Stack traces
   - Internal implementation details
   - Other users' data

2. **Generic Error Messages**: Database errors return generic messages to avoid leaking schema information

3. **Consistent Error Format**: All errors follow the same structure to prevent information leakage through response format differences

4. **Logging**: Detailed errors are logged to console for debugging but not returned to callers

## Testing Strategy

### Test Organization

The test suite is organized into three main files:

1. **auth.service.test.ts**: Unit tests for all service functions
   - Organized by function using `describe` blocks
   - Tests success cases, error cases, and edge cases
   - Verifies return values, mock calls, and side effects
   - Uses Arrange-Act-Assert pattern

2. **auth.service.pbt.test.ts**: Property-based tests
   - Tests universal correctness properties
   - Uses fast-check for generative testing
   - Runs 100+ test cases per property
   - Validates invariants across many inputs

3. **test-helpers/**: Shared test utilities
   - Mock database configuration
   - Mock sqliteHelpers configuration
   - Test data factories (already exists)
   - Test constants (already exists)

### Test Structure Pattern

Each unit test follows this structure:

```typescript
describe('functionName', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Configure mocks for this test group
    mockSqliteHelpers.someFunction.mockResolvedValue(/* default value */);
  });

  it('should handle success case', async () => {
    // Arrange
    const input = createTestData();
    mockSqliteHelpers.someFunction.mockResolvedValue(expectedResult);

    // Act
    const result = await functionName(input);

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toBe('Expected message');
    expect(mockSqliteHelpers.someFunction).toHaveBeenCalledWith(
      expectedParam1,
      expectedParam2
    );
  });

  it('should handle error case', async () => {
    // Arrange
    mockSqliteHelpers.someFunction.mockRejectedValue(new Error('Database error'));

    // Act
    const result = await functionName(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('error');
  });
});
```

### Property-Based Test Pattern

```typescript
describe('Property: Description', () => {
  it('should satisfy property across all inputs', () => {
    fc.assert(
      fc.property(
        fc.string(), // Generate random inputs
        (input) => {
          // Test the property
          const result1 = functionName(input);
          const result2 = functionName(result1);
          return result1 === result2; // Property assertion
        }
      ),
      { numRuns: 100 } // Run 100 test cases
    );
  });
});
```

### Mock Configuration Strategy

#### DatabaseManager Mock

```typescript
// Mock the global database manager
const mockDb = {
  prepare: jest.fn().mockReturnValue({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  })
};

global.sharedDbManager = {
  db: mockDb
} as any;
```

#### sqliteHelpers Mock

```typescript
// Mock the entire sqliteHelpers module
jest.mock('../../database/sqliteHelpers');

import * as sqliteHelpers from '../../database/sqliteHelpers';

// Create mock implementations
const mockSqliteHelpers = {
  insertOTPSession: jest.fn(),
  getOTPSession: jest.fn(),
  deleteOTPSession: jest.fn(),
  updateOTPAttempts: jest.fn(),
  insertUser: jest.fn(),
  getUserByPhone: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn()
};

// Configure the mock module
(sqliteHelpers.insertOTPSession as jest.Mock) = mockSqliteHelpers.insertOTPSession;
(sqliteHelpers.getOTPSession as jest.Mock) = mockSqliteHelpers.getOTPSession;
// ... etc for all functions
```

#### bcrypt Mock

```typescript
// Mock bcrypt module
jest.mock('bcrypt');

import * as bcrypt from 'bcrypt';

const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn()
};

(bcrypt.hash as jest.Mock) = mockBcrypt.hash;
(bcrypt.compare as jest.Mock) = mockBcrypt.compare;

// Configure default behavior
mockBcrypt.hash.mockResolvedValue('hashed-pin');
mockBcrypt.compare.mockResolvedValue(true);
```

#### jwt Mock

```typescript
// Mock jsonwebtoken module
jest.mock('jsonwebtoken');

import * as jwt from 'jsonwebtoken';

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn()
};

(jwt.sign as jest.Mock) = mockJwt.sign;
(jwt.verify as jest.Mock) = mockJwt.verify;

// Configure default behavior
mockJwt.sign.mockReturnValue('test-jwt-token');
mockJwt.verify.mockReturnValue({
  userId: 'test-user-id',
  phoneNumber: '9876543210',
  userType: UserType.FARMER
});
```

### Test Isolation

Each test is completely isolated:

1. **beforeEach**: Clear all mock call history and reset mock implementations
2. **afterEach**: Clear verified phone numbers set to prevent state leakage
3. **No shared state**: Each test creates its own test data
4. **Independent execution**: Tests can run in any order
5. **Parallel execution**: Tests can run in parallel without conflicts

### Coverage Goals

| Metric | Target | Minimum |
|--------|--------|---------|
| Line Coverage | 85% | 80% |
| Branch Coverage | 80% | 80% |
| Function Coverage | 100% | 100% |
| Statement Coverage | 85% | 80% |

### Test Execution

```bash
# Run all auth service tests
npm test -- auth.service

# Run unit tests only
npm test -- auth.service.test.ts

# Run property-based tests only
npm test -- auth.service.pbt.test.ts

# Run with coverage
npm test -- auth.service --coverage

# Run in watch mode during development
npm test -- auth.service --watch
```

### Dual Testing Approach

The test suite uses both unit tests and property-based tests:

**Unit Tests:**
- Verify specific examples and edge cases
- Test error conditions and boundary values
- Validate integration with mocked dependencies
- Ensure correct mock function calls
- Test security requirements (hashing, locking, expiration)

**Property-Based Tests:**
- Verify universal properties across many inputs
- Discover edge cases automatically through randomization
- Validate mathematical properties (idempotence, round-trip)
- Run 100+ iterations per property
- Complement unit tests with comprehensive input coverage

Both approaches are necessary:
- Unit tests catch specific bugs and validate concrete behavior
- Property tests verify general correctness and find unexpected edge cases
- Together they provide comprehensive coverage

### Property Test Configuration

Each property test must:
- Run minimum 100 iterations (configured via `{ numRuns: 100 }`)
- Reference the design document property in a comment
- Use appropriate fast-check generators for input types
- Tag format: `// Feature: auth-service-tests, Property {number}: {property_text}`

Example:
```typescript
// Feature: auth-service-tests, Property 1: Phone normalization idempotence
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
```

### Security Testing Approach

Security tests validate protection against common vulnerabilities:

1. **PIN Hashing**: Verify bcrypt.hash is called before storing PINs
2. **Account Locking**: Verify accounts lock after 3 failed login attempts
3. **OTP Expiration**: Verify expired OTPs are rejected
4. **OTP Attempt Limits**: Verify OTP sessions are deleted after 3 failed attempts
5. **JWT Integrity**: Verify tampered tokens are rejected
6. **Phone Verification**: Verify user creation requires OTP verification
7. **Sensitive Data Protection**: Verify phone/bank updates require verification
8. **SQL Injection**: Verify SQL injection payloads don't cause errors

### Function Test Coverage Matrix

| Function | Success Cases | Error Cases | Edge Cases | Security Tests |
|----------|---------------|-------------|------------|----------------|
| normalizePhoneNumber | 10-digit, +91 prefix, 91 prefix | - | Whitespace, empty | - |
| generateOTP | Valid 6-digit OTP | - | Uniqueness | - |
| requestOTP | Valid phone | Invalid format, DB error | Phone starting 0-5, non-numeric | - |
| verifyOTP | Correct OTP | Incorrect OTP, expired, no session | 3 failed attempts | Expiration, attempt limits |
| createUser | All user types, with bank | No verification, duplicate phone, DB error | - | Verification required |
| getUserByPhone | Existing user | Non-existent, DB error | +91 prefix, 91 prefix | - |
| setupPIN | 4-digit, 5-digit, 6-digit | User not found, DB error | 3-digit, 7-digit, non-numeric | PIN hashing |
| loginWithPIN | Correct PIN | Incorrect PIN, locked account, no PIN, user not found, DB error | - | Account locking, attempt tracking |
| loginWithBiometric | Valid phone | Locked account, user not found, DB error | - | Account locking |
| verifyToken | Valid token | Invalid token, expired, tampered | - | Tampering detection |
| getUserProfile | Existing user | Non-existent, DB error | - | - |
| updateUserProfile | Name, location, languages | User not found, duplicate phone, DB error | Phone without verification, bank without verification | Verification required |

## Implementation Notes

### Test File Structure

```typescript
// src/features/auth/__tests__/auth.service.test.ts

import * as authService from '../auth.service';
import * as sqliteHelpers from '../../database/sqliteHelpers';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { createTestUser, createTestOTPSession } from './test-helpers/test-data-factories';
import { TEST_PHONE_NUMBERS, TEST_PINS } from './test-helpers/test-constants';

// Mock all external dependencies
jest.mock('../../database/sqliteHelpers');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Create mock objects
const mockSqliteHelpers = {
  insertOTPSession: jest.fn(),
  getOTPSession: jest.fn(),
  deleteOTPSession: jest.fn(),
  updateOTPAttempts: jest.fn(),
  insertUser: jest.fn(),
  getUserByPhone: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn()
};

const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn()
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn()
};

// Configure mocks
(sqliteHelpers.insertOTPSession as jest.Mock) = mockSqliteHelpers.insertOTPSession;
// ... etc for all mocks

// Mock global database manager
const mockDb = {
  prepare: jest.fn().mockReturnValue({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  })
};

global.sharedDbManager = {
  db: mockDb
} as any;

describe('Auth Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.clearVerifiedPhoneNumbers();
  });

  describe('normalizePhoneNumber', () => {
    // Tests for phone normalization
  });

  describe('generateOTP', () => {
    // Tests for OTP generation
  });

  describe('requestOTP', () => {
    // Tests for OTP request
  });

  // ... etc for all functions
});
```

### Property-Based Test File Structure

```typescript
// src/features/auth/__tests__/auth.service.pbt.test.ts

import * as fc from 'fast-check';
import { normalizePhoneNumber, generateOTP } from '../auth.service';
import * as jwt from 'jsonwebtoken';

// Mock jwt for round-trip test
jest.mock('jsonwebtoken');

describe('Auth Service - Property-Based Tests', () => {
  describe('Property 1: Phone Normalization Idempotence', () => {
    // Feature: auth-service-tests, Property 1: Phone normalization idempotence
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

  describe('Property 2: OTP Format Validation', () => {
    // Feature: auth-service-tests, Property 2: OTP format validation
    it('should generate valid 6-digit OTPs in range 100000-999999', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No input needed
          () => {
            const otp = generateOTP();
            const isValidLength = otp.length === 6;
            const isNumeric = /^\d+$/.test(otp);
            const numValue = parseInt(otp, 10);
            const isInRange = numValue >= 100000 && numValue <= 999999;
            return isValidLength && isNumeric && isInRange;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ... etc for all properties
});
```

### Mock Helper Files

```typescript
// src/features/auth/__tests__/test-helpers/mock-database.ts

/**
 * Create mock DatabaseManager for testing
 */
export function createMockDatabaseManager() {
  const mockDb = {
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    })
  };

  return {
    db: mockDb
  };
}

/**
 * Configure mock database with default behavior
 */
export function configureMockDatabase(mockDb: ReturnType<typeof createMockDatabaseManager>) {
  // Configure default successful responses
  mockDb.db.prepare().run.mockReturnValue({ changes: 1 });
  mockDb.db.prepare().get.mockReturnValue(null);
  mockDb.db.prepare().all.mockReturnValue([]);
}
```

```typescript
// src/features/auth/__tests__/test-helpers/mock-sqlite-helpers.ts

/**
 * Create mock sqliteHelpers for testing
 */
export function createMockSqliteHelpers() {
  return {
    insertOTPSession: jest.fn(),
    getOTPSession: jest.fn(),
    deleteOTPSession: jest.fn(),
    updateOTPAttempts: jest.fn(),
    insertUser: jest.fn(),
    getUserByPhone: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn()
  };
}

/**
 * Configure mock sqliteHelpers with default behavior
 */
export function configureMockSqliteHelpers(mockHelpers: ReturnType<typeof createMockSqliteHelpers>) {
  // Configure default successful responses
  mockHelpers.insertOTPSession.mockResolvedValue(undefined);
  mockHelpers.getOTPSession.mockResolvedValue(null);
  mockHelpers.deleteOTPSession.mockResolvedValue(undefined);
  mockHelpers.updateOTPAttempts.mockResolvedValue(undefined);
  mockHelpers.insertUser.mockResolvedValue(createTestUser());
  mockHelpers.getUserByPhone.mockResolvedValue(null);
  mockHelpers.getUserById.mockResolvedValue(null);
  mockHelpers.updateUser.mockResolvedValue(createTestUser());
}
```

### Test Data Setup Patterns

#### OTP Session Setup

```typescript
// Setup OTP session for verification tests
const otpSession = createTestOTPSession({
  phoneNumber: TEST_PHONE_NUMBERS.VALID,
  otp: '123456',
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  attempts: 0
});

mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
```

#### User Setup

```typescript
// Setup user for login tests
const user = createTestUser({
  phoneNumber: TEST_PHONE_NUMBERS.VALID,
  pinHash: 'hashed-pin',
  failedLoginAttempts: 0,
  lockedUntil: null
});

mockSqliteHelpers.getUserByPhone.mockResolvedValue(user);
mockBcrypt.compare.mockResolvedValue(true);
```

#### Verified Phone Setup

```typescript
// Setup verified phone for user creation tests
const { requestOTP, verifyOTP } = authService;

// Request OTP
mockSqliteHelpers.insertOTPSession.mockResolvedValue(undefined);
await requestOTP(TEST_PHONE_NUMBERS.VALID);

// Verify OTP
const otpSession = createTestOTPSession();
mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);
await verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');
```

### Test Teardown Patterns

```typescript
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear verified phone numbers set
  authService.clearVerifiedPhoneNumbers();
  
  // Reset fake timers if used
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }
});
```

### JWT Token Testing Pattern

```typescript
describe('JWT Token Operations', () => {
  beforeEach(() => {
    // Configure JWT mock
    mockJwt.sign.mockReturnValue('test-jwt-token');
    mockJwt.verify.mockReturnValue({
      userId: 'test-user-id',
      phoneNumber: TEST_PHONE_NUMBERS.VALID,
      userType: UserType.FARMER
    });
  });

  it('should generate token with correct payload', async () => {
    const user = createTestUser();
    mockSqliteHelpers.getUserByPhone.mockResolvedValue(user);
    mockBcrypt.compare.mockResolvedValue(true);

    const result = await authService.loginWithPIN(
      TEST_PHONE_NUMBERS.VALID,
      TEST_PINS.VALID_4_DIGIT
    );

    expect(result.success).toBe(true);
    expect(result.token).toBe('test-jwt-token');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        userType: user.userType
      },
      expect.any(String),
      expect.any(Object)
    );
  });

  it('should verify token and return payload', () => {
    const result = authService.verifyToken('test-jwt-token');

    expect(result.valid).toBe(true);
    expect(result.userId).toBe('test-user-id');
    expect(mockJwt.verify).toHaveBeenCalledWith(
      'test-jwt-token',
      expect.any(String)
    );
  });
});
```

### bcrypt Testing Pattern

```typescript
describe('PIN Hashing', () => {
  beforeEach(() => {
    mockBcrypt.hash.mockResolvedValue('hashed-pin');
    mockBcrypt.compare.mockResolvedValue(true);
  });

  it('should hash PIN before storage', async () => {
    const user = createTestUser();
    mockSqliteHelpers.getUserByPhone.mockResolvedValue(user);
    mockSqliteHelpers.updateUser.mockResolvedValue(user);

    await authService.setupPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);

    expect(mockBcrypt.hash).toHaveBeenCalledWith(TEST_PINS.VALID_4_DIGIT, 10);
    expect(mockSqliteHelpers.updateUser).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        pinHash: 'hashed-pin'
      })
    );
  });

  it('should compare PIN with hash during login', async () => {
    const user = createTestUser({ pinHash: 'hashed-pin' });
    mockSqliteHelpers.getUserByPhone.mockResolvedValue(user);

    await authService.loginWithPIN(TEST_PHONE_NUMBERS.VALID, TEST_PINS.VALID_4_DIGIT);

    expect(mockBcrypt.compare).toHaveBeenCalledWith(
      TEST_PINS.VALID_4_DIGIT,
      'hashed-pin'
    );
  });
});
```

### Timer Testing Pattern

```typescript
describe('Verified Phone TTL', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should set 5-minute TTL for verified phone', async () => {
    const otpSession = createTestOTPSession();
    mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
    mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);

    await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
  });

  it('should remove phone from verified set after TTL', async () => {
    const otpSession = createTestOTPSession();
    mockSqliteHelpers.getOTPSession.mockResolvedValue(otpSession);
    mockSqliteHelpers.deleteOTPSession.mockResolvedValue(undefined);

    await authService.verifyOTP(TEST_PHONE_NUMBERS.VALID, '123456');

    // Fast-forward time
    jest.advanceTimersByTime(5 * 60 * 1000);

    // Try to create user (should fail because verification expired)
    mockSqliteHelpers.insertUser.mockResolvedValue(createTestUser());
    const result = await authService.createUser({
      phoneNumber: TEST_PHONE_NUMBERS.VALID,
      name: 'Test User',
      userType: UserType.FARMER,
      location: createTestLocation()
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('verification');
  });
});
```

### Dependencies

The test suite requires the following dependencies (already in package.json):

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/bcrypt": "^5.0.0",
    "jest": "^29.5.0",
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
    'src/features/auth/auth.service.ts'
  ],
  coverageThreshold: {
    'src/features/auth/auth.service.ts': {
      statements: 80,
      branches: 80,
      functions: 100,
      lines: 80
    }
  }
};
```

## Summary

This design provides a comprehensive testing strategy for the Auth Service that will:

1. Achieve 80%+ code coverage through systematic function testing
2. Validate security through PIN hashing, account locking, and expiration tests
3. Ensure correctness through property-based testing of invariants
4. Maintain test isolation through complete dependency mocking
5. Follow project conventions from successful auth controller tests
6. Enable fast test execution (< 5 seconds) with no external dependencies

The test suite will consist of approximately 80-90 unit tests covering all success, error, and edge cases, plus 4 property-based tests validating universal correctness properties. All tests will execute quickly due to complete mocking of database, bcrypt, and jwt operations, enabling fast feedback during development.
