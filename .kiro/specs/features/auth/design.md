---
parent_spec: bharat-mandi-main
implements_requirements: [5]
depends_on: [shared/database]
status: complete
type: feature
code_location: src/features/auth/
---

# Design Document: User Authentication

**Parent Spec:** [Bharat Mandi Main Design](../../bharat-mandi-main/design.md)  
**Related Requirements:** [Auth Requirements](./requirements.md)  
**Depends On:** [Dual Database Design](../../shared/database/design.md)  
**Code Location:** `src/features/auth/`  
**Status:** ✅ Complete

## Overview

The authentication system provides secure user registration and login using OTP verification, PIN/biometric authentication, and JWT tokens. It integrates with the dual database system for offline support.

## Architecture

```
┌─────────────────────────────────────────┐
│         Auth Controller                  │
│  POST /api/auth/register                │
│  POST /api/auth/verify-otp              │
│  POST /api/auth/login                   │
│  GET  /api/auth/profile                 │
│  PUT  /api/auth/profile                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Auth Service                     │
│  - registerUser()                       │
│  - verifyOTP()                          │
│  - loginWithPIN()                       │
│  - updateProfile()                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Database Manager                    │
│  - createUser()                         │
│  - getUserByPhone()                     │
│  - updateUser()                         │
│  - updateUserPin()                      │
└─────────────────────────────────────────┘
```

## Data Models

```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  userType: 'farmer' | 'buyer';
  pin?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface OTPSession {
  id: string;
  phone: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
}
```

## Security

- PINs hashed with bcrypt (10 rounds)
- JWT tokens with 24-hour expiration
- Account lockout after 3 failed attempts (30 minutes)
- OTP expiration after 10 minutes

## Database Integration

Uses DatabaseManager for all operations:
- Write operations target PostgreSQL first
- Read operations fall back to SQLite when offline
- Automatic sync when connectivity restored

## API Endpoints

### POST /api/auth/register
Register new user with phone number

### POST /api/auth/verify-otp
Verify OTP and complete registration

### POST /api/auth/login
Login with phone and PIN

### GET /api/auth/profile
Get user profile (requires JWT)

### PUT /api/auth/profile
Update user profile (requires JWT)

## Testing

- Unit tests: `auth.service.test.ts`
- Property-based tests: `auth.service.pbt.test.ts`
- Integration tests with database

## Implementation Files

- `auth.service.ts` - Business logic
- `auth.controller.ts` - API endpoints
- `auth.types.ts` - TypeScript interfaces
- `index.ts` - Module exports
