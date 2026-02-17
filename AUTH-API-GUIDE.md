# Authentication API Guide

## Overview

The authentication system implements secure user registration and login using OTP (One-Time Password) verification. All sensitive data is encrypted using AES-256 encryption.

## Features

- ✅ OTP-based phone number verification
- ✅ User registration with encrypted data storage
- ✅ Support for multiple user types (Farmer, Buyer, Logistics Provider, etc.)
- ✅ Bank account encryption
- ✅ Failed attempt tracking (max 3 attempts)
- ✅ OTP expiration (10 minutes)

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

## Complete Registration Flow

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

3. **Register User** (if new user)
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

## Security Features

### Data Encryption
- Bank account details are encrypted using AES-256-CBC
- Encryption key should be stored in environment variables (AWS KMS in production)
- Encrypted data format: `iv:encryptedText`

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

# SMS (Production)
PINPOINT_APP_ID=your-pinpoint-app-id
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Redis (Production)
REDIS_URL=redis://localhost:6379
```

## Next Steps

- [ ] Implement JWT token generation for authenticated sessions
- [ ] Add PIN-based login (Task 3.3)
- [ ] Add biometric authentication support (Task 3.3)
- [ ] Implement account lockout mechanism (Task 3.4)
- [ ] Add profile management endpoints (Task 3.6)
- [ ] Integrate AWS Pinpoint for SMS
- [ ] Set up Redis for OTP storage
- [ ] Implement rate limiting for OTP requests
