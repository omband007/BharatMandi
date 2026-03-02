# POC UI Endpoint Audit

## Current Endpoint Structure

### Backend Routes (Actual)
```
/api/v1/profiles/register          POST   - Register with mobile number
/api/v1/profiles/verify-otp        POST   - Verify OTP and create profile
/api/v1/profiles/resend-otp        POST   - Resend OTP
/api/v1/profiles/:userId           GET    - Get profile
/api/v1/profiles/:userId/fields    PATCH  - Update profile field
/api/v1/profiles/:userId/export    GET    - Export profile data
/api/v1/profiles/:userId/picture   POST   - Upload profile picture
/api/v1/profiles/:userId/dashboard GET    - Get dashboard

/api/v1/profiles/auth/setup-pin         POST - Setup PIN
/api/v1/profiles/auth/change-pin        POST - Change PIN
/api/v1/profiles/auth/login/pin         POST - Login with PIN
/api/v1/profiles/auth/login/biometric   POST - Login with biometric
/api/v1/profiles/auth/login/otp         POST - Login with OTP
/api/v1/profiles/auth/verify-token      POST - Verify JWT token
/api/v1/profiles/auth/refresh-token     POST - Refresh JWT token
/api/v1/profiles/auth/logout            POST - Logout
/api/v1/profiles/auth/biometric/enable  POST - Enable biometric
/api/v1/profiles/auth/biometric/disable POST - Disable biometric
```

### POC UI Files Status

#### ✅ profile-test.html
**Status**: CORRECT - Already using proper endpoints
- `/api/profile/register` → Should be `/api/v1/profiles/register`
- `/api/profile/verify-otp` → Should be `/api/v1/profiles/verify-otp`
- `/api/profile/:userId` → Should be `/api/v1/profiles/:userId`
- `/api/profile/:userId/fields` → Should be `/api/v1/profiles/:userId/fields`
- `/api/profile/:userId/export` → Should be `/api/v1/profiles/:userId/export`

**Action Required**: Update API_BASE to use `/api/v1/profiles`

#### ❌ index.html
**Status**: INCORRECT - Using old `/api/auth/*` endpoints
- `/api/auth/request-otp` → Should be `/api/v1/profiles/register`
- `/api/auth/verify-otp` → Should be `/api/v1/profiles/verify-otp`
- `/api/auth/register` → Should be `/api/v1/profiles/register` (already covered)
- `/api/auth/login/pin` → Should be `/api/v1/profiles/auth/login/pin`
- `/api/auth/login/biometric` → Should be `/api/v1/profiles/auth/login/biometric`
- `/api/auth/setup-pin` → Should be `/api/v1/profiles/auth/setup-pin`

**Action Required**: Complete rewrite of authentication flow

#### ⚠️ index-v2.html
**Status**: EMPTY FILE
**Action Required**: Delete or implement

## Issues Found

### 1. Endpoint Mismatch
The POC UI is using old endpoint patterns that don't match the new Profile module structure.

### 2. Authentication Flow Confusion
The index.html mixes:
- Old `/api/auth/*` endpoints (don't exist)
- Old `/api/users` endpoints (legacy)
- Registration and authentication in one flow

### 3. Duplicate Index Files
- `index.html` - Main POC UI (needs update)
- `index-v2.html` - Empty file (should be deleted)

## Recommended Actions

### Priority 1: Update index.html
1. Change all `/api/auth/*` to `/api/v1/profiles/auth/*`
2. Change all `/api/profile/*` to `/api/v1/profiles/*`
3. Update authentication flow to match new endpoints
4. Test all authentication scenarios

### Priority 2: Update profile-test.html
1. Change API_BASE from `/api` to `/api/v1`
2. Update endpoint paths to include version

### Priority 3: Clean Up
1. Delete empty `index-v2.html` file
2. Add API version documentation
3. Create endpoint reference guide

## Migration Guide

### Old → New Endpoint Mapping

```javascript
// Registration & OTP
'/api/auth/request-otp'  → '/api/v1/profiles/register'
'/api/auth/verify-otp'   → '/api/v1/profiles/verify-otp'
'/api/auth/resend-otp'   → '/api/v1/profiles/resend-otp'

// Authentication
'/api/auth/login/pin'       → '/api/v1/profiles/auth/login/pin'
'/api/auth/login/biometric' → '/api/v1/profiles/auth/login/biometric'
'/api/auth/login/otp'       → '/api/v1/profiles/auth/login/otp'
'/api/auth/setup-pin'       → '/api/v1/profiles/auth/setup-pin'
'/api/auth/change-pin'      → '/api/v1/profiles/auth/change-pin'

// Profile Management
'/api/profile/:userId'        → '/api/v1/profiles/:userId'
'/api/profile/:userId/fields' → '/api/v1/profiles/:userId/fields'
'/api/profile/:userId/export' → '/api/v1/profiles/:userId/export'

// Token Management
'/api/auth/verify-token'  → '/api/v1/profiles/auth/verify-token'
'/api/auth/refresh-token' → '/api/v1/profiles/auth/refresh-token'
'/api/auth/logout'        → '/api/v1/profiles/auth/logout'

// Biometric
'/api/auth/biometric/enable'  → '/api/v1/profiles/auth/biometric/enable'
'/api/auth/biometric/disable' → '/api/v1/profiles/auth/biometric/disable'
```

### Request/Response Changes

#### Registration (OTP Request)
**Old**: `/api/auth/request-otp`
```json
POST { "phoneNumber": "9876543210" }
```

**New**: `/api/v1/profiles/register`
```json
POST { 
  "mobileNumber": "9876543210",
  "referralCode": "ABC123" // optional
}
Response: {
  "success": true,
  "data": {
    "userId": "+919876543210",
    "otpSent": true
  }
}
```

#### OTP Verification
**Old**: `/api/auth/verify-otp`
```json
POST { 
  "phoneNumber": "9876543210",
  "otp": "123456"
}
```

**New**: `/api/v1/profiles/verify-otp`
```json
POST {
  "userId": "+919876543210",
  "otp": "123456"
}
Response: {
  "success": true,
  "data": {
    "verified": true,
    "profile": { ... },
    "token": "jwt-token-here"
  }
}
```

#### PIN Login
**Old**: `/api/auth/login/pin`
```json
POST {
  "phoneNumber": "9876543210",
  "pin": "1234"
}
```

**New**: `/api/v1/profiles/auth/login/pin`
```json
POST {
  "mobileNumber": "+919876543210",
  "pin": "1234"
}
Response: {
  "success": true,
  "data": {
    "token": "jwt-token",
    "profile": { ... }
  },
  "message": "Login successful"
}
```

## Testing Checklist

- [ ] Registration flow (OTP request)
- [ ] OTP verification
- [ ] PIN setup
- [ ] PIN login
- [ ] Biometric login
- [ ] OTP login
- [ ] Profile view
- [ ] Profile update
- [ ] Profile export
- [ ] Token refresh
- [ ] Logout

## Notes

1. All endpoints now use `/api/v1/profiles` as the base path
2. Authentication endpoints are under `/api/v1/profiles/auth`
3. Mobile numbers are stored in E.164 format (+919876543210)
4. JWT tokens are returned on successful authentication
5. Token expiration is 30 days (not 7 days)
