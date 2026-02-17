# Authentication API Guide

## Overview

The authentication system implements secure user registration and login using OTP (One-Time Password) verification. All sensitive data is encrypted using AES-256 encryption.

## Features

- ✅ OTP-based phone number verification
- ✅ User registration with encrypted data storage
- ✅ PIN-based login with JWT tokens
- ✅ Biometric authentication support
- ✅ Account lockout after 3 failed login attempts (30 minutes)
- ✅ Support for multiple user types (Farmer, Buyer, Logistics Provider, etc.)
- ✅ Bank account encryption
- ✅ Failed attempt tracking (max 3 attempts)
- ✅ OTP expiration (10 minutes)
- ✅ JWT token generation and verification

## API Endpoints

### 1. Request OTP

**Endpoint**: `POST /api/auth/request-otp`

**Request Body**:
```json
{
  "phoneNumber": "9876543210"
}
```

**Response** (Success):
```json
{
  "message": "OTP sent successfully"
}
```

**Response** (Error):
```json
{
  "error": "Invalid phone number format"
}
```

**Notes**:
- Phone number must be a valid 10-digit Indian mobile number (starting with 6-9)
- OTP is valid for 10 minutes
- OTP is sent via SMS (currently mocked, needs AWS Pinpoint integration)

---

### 2. Verify OTP

**Endpoint**: `POST /api/auth/verify-otp`

**Request Body**:
```json
{
  "phoneNumber": "9876543210",
  "otp": "123456"
}
```

**Response** (Success - New User):
```json
{
  "message": "OTP verified successfully",
  "userExists": false,
  "user": null
}
```

**Response** (Success - Existing User):
```json
{
  "message": "OTP verified successfully",
  "userExists": true,
  "user": {
    "id": "uuid",
    "phoneNumber": "9876543210",
    "name": "John Doe",
    "userType": "FARMER",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Mumbai, Maharashtra"
    },
    "createdAt": "2026-02-17T10:00:00.000Z"
  }
}
```

**Response** (Error):
```json
{
  "error": "Invalid OTP. Please try again."
}
```

**Notes**:
- Maximum 3 verification attempts allowed
- After 3 failed attempts, user must request a new OTP
- OTP expires after 10 minutes

---

### 3. Register User

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "phoneNumber": "9876543210",
  "name": "John Doe",
  "userType": "FARMER",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "Mumbai, Maharashtra"
  },
  "bankAccount": {
    "accountNumber": "1234567890",
    "ifscCode": "SBIN0001234",
    "accountHolderName": "John Doe"
  }
}
```

**Response** (Success):
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "phoneNumber": "9876543210",
    "name": "John Doe",
    "userType": "FARMER",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Mumbai, Maharashtra"
    },
    "createdAt": "2026-02-17T10:00:00.000Z"
  }
}
```

**Response** (Error):
```json
{
  "error": "User with this phone number already exists"
}
```

**Notes**:
- `bankAccount` is optional
- Bank account data is encrypted before storage
- Valid user types: `FARMER`, `BUYER`, `LOGISTICS_PROVIDER`, `COLD_STORAGE_PROVIDER`, `SUPPLIER`

---

### 5. Setup PIN

**Endpoint**: `POST /api/auth/setup-pin`

**Request Body**:
```json
{
  "phoneNumber": "9876543210",
  "pin": "1234"
}
```

**Response** (Success):
```json
{
  "message": "PIN set up successfully"
}
```

**Response** (Error):
```json
{
  "error": "PIN must be 4-6 digits"
}
```

**Notes**:
- PIN must be 4-6 digits
- PIN is hashed using bcrypt before storage
- Should be called after user registration

---

### 6. Login with PIN

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "phoneNumber": "9876543210",
  "pin": "1234"
}
```

**Response** (Success):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "phoneNumber": "9876543210",
    "name": "John Doe",
    "userType": "FARMER",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Mumbai, Maharashtra"
    },
    "createdAt": "2026-02-17T10:00:00.000Z"
  }
}
```

**Response** (Error - Invalid PIN):
```json
{
  "error": "Invalid PIN. 2 attempts remaining."
}
```

**Response** (Error - Account Locked):
```json
{
  "error": "Account is locked. Please try again in 25 minutes."
}
```

**Notes**:
- Maximum 3 failed login attempts
- After 3 failed attempts, account is locked for 30 minutes
- JWT token expires in 7 days
- Failed attempts counter resets on successful login

---

### 7. Login with Biometric

**Endpoint**: `POST /api/auth/login/biometric`

**Request Body**:
```json
{
  "phoneNumber": "9876543210"
}
```

**Response** (Success):
```json
{
  "message": "Biometric login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "phoneNumber": "9876543210",
    "name": "John Doe",
    "userType": "FARMER",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Mumbai, Maharashtra"
    },
    "createdAt": "2026-02-17T10:00:00.000Z"
  }
}
```

**Notes**:
- Mobile app should verify biometric locally first (fingerprint/face ID)
- Only call this endpoint after successful biometric verification on device
- Returns JWT token for authenticated session
- Account lockout still applies if account was previously locked

---

### 8. Verify JWT Token

**Endpoint**: `POST /api/auth/verify-token`

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (Success):
```json
{
  "valid": true,
  "userId": "uuid",
  "phoneNumber": "9876543210",
  "userType": "FARMER"
}
```

**Response** (Error):
```json
{
  "error": "Invalid or expired token"
}
```

**Notes**:
- Use this endpoint to validate JWT tokens
- Tokens expire after 7 days
- Returns user information if token is valid

---

### 4. Get User by Phone Number

**Endpoint**: `GET /api/auth/user/:phoneNumber`

**Response** (Success):
```json
{
  "user": {
    "id": "uuid",
    "phoneNumber": "9876543210",
    "name": "John Doe",
    "userType": "FARMER",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Mumbai, Maharashtra"
    },
    "bankAccount": {
      "accountNumber": "1234567890",
      "ifscCode": "SBIN0001234",
      "accountHolderName": "John Doe"
    },
    "createdAt": "2026-02-17T10:00:00.000Z"
  }
}
```

**Response** (Error):
```json
{
  "error": "User not found"
}
```

---

## Complete Registration and Login Flow

### New User Registration
1. **Request OTP**
   ```bash
   curl -X POST http://localhost:3000/api/auth/request-otp \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "9876543210"}'
   ```

2. **Verify OTP** (check console for OTP)
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "9876543210", "otp": "123456"}'
   ```

3. **Register User**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "phoneNumber": "9876543210",
       "name": "John Doe",
       "userType": "FARMER",
       "location": {
         "latitude": 19.0760,
         "longitude": 72.8777,
         "address": "Mumbai, Maharashtra"
       },
       "bankAccount": {
         "accountNumber": "1234567890",
         "ifscCode": "SBIN0001234",
         "accountHolderName": "John Doe"
       }
     }'
   ```

4. **Setup PIN**
   ```bash
   curl -X POST http://localhost:3000/api/auth/setup-pin \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "9876543210", "pin": "1234"}'
   ```

### Existing User Login
1. **Login with PIN**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "9876543210", "pin": "1234"}'
   ```

2. **Or Login with Biometric** (after device biometric verification)
   ```bash
   curl -X POST http://localhost:3000/api/auth/login/biometric \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "9876543210"}'
   ```

3. **Use JWT Token** for authenticated requests
   ```bash
   curl -X GET http://localhost:3000/api/protected-endpoint \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

## Security Features

### Data Encryption
- Bank account details are encrypted using AES-256-CBC
- Encryption key should be stored in environment variables (AWS KMS in production)
- Encrypted data format: `iv:encryptedText`

### PIN Security
- PIN is hashed using bcrypt (10 salt rounds)
- PIN must be 4-6 digits
- Never stored in plain text

### Account Lockout
- Maximum 3 failed login attempts
- Account locked for 30 minutes after 3 failures
- Failed attempts counter resets on successful login
- Lockout applies to both PIN and biometric login

### JWT Tokens
- Tokens expire after 7 days
- Signed using HS256 algorithm
- Contains userId, phoneNumber, and userType
- Should be stored securely on client (encrypted storage)

### OTP Security
- 6-digit random OTP
- 10-minute expiration
- Maximum 3 verification attempts
- OTP sessions stored in-memory (use Redis in production)

### Phone Number Validation
- Must be 10 digits
- Must start with 6, 7, 8, or 9 (Indian mobile numbers)
- Format: `^[6-9]\d{9}$`

## Production Considerations

### SMS Integration
Currently, OTP sending is mocked. For production:

1. **AWS Pinpoint Integration**:
   ```typescript
   import AWS from 'aws-sdk';
   const pinpoint = new AWS.Pinpoint({ region: 'ap-south-1' });
   
   await pinpoint.sendMessages({
     ApplicationId: process.env.PINPOINT_APP_ID,
     MessageRequest: {
       Addresses: {
         [phoneNumber]: { ChannelType: 'SMS' }
       },
       MessageConfiguration: {
         SMSMessage: {
           Body: `Your Bharat Mandi OTP is: ${otp}. Valid for 10 minutes.`,
           MessageType: 'TRANSACTIONAL'
         }
       }
     }
   }).promise();
   ```

2. **Alternative SMS Providers**:
   - Twilio
   - MSG91
   - Gupshup

### OTP Storage
Currently using in-memory Map. For production:

1. **Redis**:
   ```typescript
   import Redis from 'ioredis';
   const redis = new Redis(process.env.REDIS_URL);
   
   // Store OTP
   await redis.setex(`otp:${phoneNumber}`, 600, JSON.stringify(otpSession));
   
   // Retrieve OTP
   const session = await redis.get(`otp:${phoneNumber}`);
   ```

### Encryption Key Management
Use AWS KMS for encryption key management:

```typescript
import AWS from 'aws-sdk';
const kms = new AWS.KMS({ region: 'ap-south-1' });

// Encrypt
const encrypted = await kms.encrypt({
  KeyId: process.env.KMS_KEY_ID,
  Plaintext: Buffer.from(data)
}).promise();

// Decrypt
const decrypted = await kms.decrypt({
  CiphertextBlob: encrypted.CiphertextBlob
}).promise();
```

## Testing

Run tests:
```bash
npm test src/services/auth.service.test.ts
```

**Note**: Tests require a PostgreSQL database connection. Update `.env` with test database credentials.

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bharat_mandi

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# JWT
JWT_SECRET=your-jwt-secret-key-change-in-production

# SMS (Production)
PINPOINT_APP_ID=your-pinpoint-app-id
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Redis (Production)
REDIS_URL=redis://localhost:6379
```

## Next Steps

- [x] Implement JWT token generation for authenticated sessions
- [x] Add PIN-based login (Task 3.3)
- [x] Add biometric authentication support (Task 3.3)
- [ ] Implement account lockout mechanism (Task 3.4) - Partially done, needs property test
- [ ] Add profile management endpoints (Task 3.6)
- [ ] Integrate AWS Pinpoint for SMS
- [ ] Set up Redis for OTP storage
- [ ] Implement rate limiting for OTP requests
- [ ] Add middleware for JWT authentication on protected routes
