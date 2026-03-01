# Endpoint Security Audit - Bharat Mandi Complete App

## Summary
Comprehensive audit of ALL endpoints across the entire Bharat Mandi application to ensure dev-only capabilities are properly protected and production endpoints are correctly placed.

## ✅ Properly Protected Dev Endpoints

All dev endpoints are in `src/features/dev/dev.controller.ts` with proper production checks:

1. **POST /api/dev/clear-translation-cache** - Clears Redis translation cache
   - ✅ Has `NODE_ENV === 'production'` check
   
2. **POST /api/dev/clear-sync-queue** - Clears sync queue
   - ✅ Has `NODE_ENV === 'production'` check
   
3. **POST /api/dev/clean-all-data** - Deletes ALL data (DANGEROUS!)
   - ✅ Has `NODE_ENV === 'production'` check
   
4. **POST /api/dev/delete-media** - Deletes all media
   - ✅ Has `NODE_ENV === 'production'` check
   
5. **POST /api/dev/delete-listings** - Deletes all listings
   - ✅ Has `NODE_ENV === 'production'` check
   
6. **GET /api/dev/stats** - Database statistics
   - ⚠️ No explicit production check, but route is only mounted in dev mode via `app.ts`

## ✅ Production Endpoints (Correctly Placed)

### Authentication (`src/features/auth/auth.controller.ts`)
All legitimate production endpoints:
- POST /api/auth/request-otp - Request OTP for phone verification
- POST /api/auth/verify-otp - Verify OTP code
- POST /api/auth/register - Register new user
- POST /api/auth/setup-pin - Set up PIN for user
- POST /api/auth/login - Login with phone + PIN
- POST /api/auth/login/biometric - Login with biometric
- POST /api/auth/verify-token - Verify JWT token
- GET /api/auth/user/:phoneNumber - Get user by phone
- GET /api/auth/profile/:userId - Get user profile
- PUT /api/auth/profile/:userId - Update user profile

### Users (`src/features/users/users.controller.ts`)
All legitimate production endpoints:
- POST /api/users - Create new user
- GET /api/users - Get all users

### Marketplace (`src/features/marketplace/marketplace.controller.ts`)
All legitimate production endpoints:
- POST /api/marketplace/listings - Create listing
- POST /api/marketplace/listings/with-media - Create listing with media (atomic operation)
- GET /api/marketplace/listings - Get all listings
- GET /api/marketplace/listings/:id - Get listing by ID
- PUT /api/marketplace/listings/:id - Update listing
- DELETE /api/marketplace/listings/:id - Delete listing

### Media (`src/features/marketplace/media.controller.ts`)
All legitimate production endpoints:
- POST /api/marketplace/listings/:listingId/media - Upload media
- GET /api/marketplace/listings/:listingId/media - Get listing media
- DELETE /api/marketplace/listings/:listingId/media/:mediaId - Delete media
- PUT /api/marketplace/listings/:listingId/media/reorder - Reorder media
- PUT /api/marketplace/listings/:listingId/media/:mediaId/primary - Set primary media

### Transactions (`src/features/transactions/transaction.controller.ts`)
All legitimate production endpoints:
- POST /api/transactions - Initiate purchase
- POST /api/transactions/:id/accept - Accept order
- POST /api/transactions/:id/lock-payment - Lock payment in escrow
- POST /api/transactions/:id/dispatch - Mark as dispatched
- POST /api/transactions/:id/deliver - Mark as delivered
- POST /api/transactions/:id/release-funds - Release funds from escrow
- GET /api/transactions/:id - Get transaction by ID

### Grading (`src/features/grading/grading.controller.ts`)
All legitimate production endpoints:
- POST /api/grading/grade-with-image - Grade produce with image upload (AI)
- POST /api/grading/grade - Grade produce (legacy base64 endpoint)

### Translation/i18n (`src/features/i18n/i18n.controller.ts`)
All legitimate production endpoints:
- GET /api/i18n/translations/:lang - Get translation bundle
- GET /api/i18n/languages - Get supported languages
- GET /api/i18n/validate - Validate translations
- POST /api/i18n/change-language - Change user language
- GET /api/i18n/user-language/:userId - Get user language
- POST /api/i18n/translate - Translate text (AWS Translate)
- POST /api/i18n/translate-batch - Batch translate
- POST /api/i18n/detect-language - Detect language
- GET /api/i18n/cache-stats - Get cache statistics
- POST /api/i18n/translate/feedback - Submit translation feedback
- GET /api/i18n/translate/feedback/stats - Get feedback statistics

## 🟡 Endpoints Requiring Attention

### Medium Priority

1. **POST /api/i18n/translate-batch** - Batch translation
   - Status: **Production endpoint but needs rate limiting**
   - Risk: Medium - Could be expensive if abused (AWS costs)
   - Recommendation: Add rate limiting (e.g., 10 requests/minute per user)

2. **POST /api/grading/grade-with-image** - AI grading
   - Status: **Production endpoint but needs rate limiting**
   - Risk: Medium - Could be expensive if abused (AWS Rekognition costs)
   - Recommendation: Add rate limiting (e.g., 20 requests/minute per user)

3. **POST /api/grading/grade** - Legacy AI grading
   - Status: **Production endpoint but needs rate limiting**
   - Risk: Medium - Could be expensive if abused (AWS Rekognition costs)
   - Recommendation: Add rate limiting (e.g., 20 requests/minute per user)

### Low Priority

1. **GET /api/dev/stats** - Database statistics
   - Status: **Dev endpoint without explicit production check**
   - Current: Route only mounted when `NODE_ENV !== 'production'` in app.ts
   - Recommendation: Add explicit production check for defense in depth
   - Code location: `src/features/dev/dev.controller.ts:288`

2. **GET /api/i18n/cache-stats** - Translation cache statistics
   - Status: **Production endpoint - legitimate monitoring**
   - Risk: Very Low - Only exposes cache size, no sensitive data
   - Recommendation: Consider moving to admin-only endpoint in future

3. **GET /api/users** - Get all users
   - Status: **Production endpoint but should be admin-only**
   - Risk: Medium - Exposes all user data without authentication
   - Recommendation: Add authentication middleware and admin role check
   - Code location: `src/features/users/users.controller.ts:73`

## ❌ Security Issues Found

### HIGH PRIORITY - Missing Authentication

The following endpoints are missing authentication/authorization checks:

1. **All endpoints lack authentication middleware**
   - None of the production endpoints verify JWT tokens
   - No role-based access control (RBAC)
   - Recommendation: Implement auth middleware globally

2. **GET /api/users** - Lists ALL users without auth
   - Risk: HIGH - Anyone can see all user data
   - Recommendation: Require admin authentication

3. **PUT /api/auth/profile/:userId** - Update any user profile
   - Risk: HIGH - No verification that requester owns the profile
   - Recommendation: Verify JWT token matches userId

4. **DELETE /api/marketplace/listings/:id** - Delete any listing
   - Risk: HIGH - No verification of ownership
   - Recommendation: Verify user owns the listing

5. **POST /api/transactions/:id/release-funds** - Release escrow funds
   - Risk: CRITICAL - Financial operation without auth
   - Recommendation: Require strong authentication + ownership verification

## 🔒 Recommendations by Priority

### CRITICAL (Implement Immediately)
1. **Add authentication middleware** to all production endpoints
2. **Add ownership verification** for:
   - Profile updates
   - Listing modifications/deletions
   - Transaction operations
   - Media uploads/deletions
3. **Add role-based access control** for admin endpoints

### HIGH (Implement Soon)
1. **Add rate limiting** to expensive endpoints:
   - Translation batch operations
   - AI grading operations
2. **Add explicit production check** to `/api/dev/stats`
3. **Restrict `/api/users` endpoint** to admin-only

### MEDIUM (Plan for Future)
1. Consider moving cache-stats to admin-only
2. Add request logging for audit trail
3. Add input validation middleware

## ✅ What's Working Well

1. **Dev endpoints are properly isolated** in dev controller
2. **All destructive dev operations** have production checks
3. **Dev routes are conditionally mounted** in app.ts
4. **No accidental exposure** of dev capabilities in production code
5. **Clear separation** between dev and production controllers

## Conclusion

### Dev/Production Separation: ✅ EXCELLENT
All dev-only endpoints are properly protected and isolated.

### Authentication/Authorization: ❌ CRITICAL ISSUE
**The app currently has NO authentication on production endpoints.** This is a critical security vulnerability that must be addressed before production deployment.

### Rate Limiting: ⚠️ NEEDS ATTENTION
Expensive AWS operations (translation, AI grading) need rate limiting to prevent abuse and cost overruns.

## Next Steps

1. Implement JWT authentication middleware
2. Add ownership verification to sensitive operations
3. Add rate limiting to expensive endpoints
4. Add admin role and restrict admin-only endpoints
5. Add explicit production check to `/api/dev/stats`

## Last Updated
2026-02-28
