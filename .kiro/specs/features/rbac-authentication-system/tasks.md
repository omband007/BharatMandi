# Implementation Plan: RBAC Authentication System

## Overview

This implementation plan breaks down the RBAC Authentication System into discrete coding tasks following a 3-phase migration strategy: Foundation (create middleware and tests), Gradual Rollout (apply middleware incrementally), and Full Enforcement (enable on all endpoints). The implementation uses TypeScript and builds on existing JWT infrastructure while adding comprehensive authentication, authorization, ownership verification, rate limiting, and security logging.

## Tasks

- [ ] 1. Set up project structure and type definitions
  - Create directory structure for middleware and logging components
  - Define TypeScript interfaces and enums (UserRole, Permission, AuthenticatedRequest, SecurityEvent)
  - Create type extensions file at `src/shared/types/auth.types.ts`
  - _Requirements: 2.1, 2.2, 3.6, 13.6_

- [ ]* 1.1 Write property test for type definitions
  - **Property 6: Role Permission Consistency**
  - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**

- [ ] 2. Implement authentication middleware
  - [ ] 2.1 Create authentication middleware at `src/shared/middleware/auth.middleware.ts`
    - Implement `requireAuth` function to extract and verify JWT tokens
    - Extract token from Authorization header (Bearer format)
    - Use existing `verifyToken()` from auth.service.ts
    - Query database to get full user information including role
    - Attach user info to `req.user` (userId, phoneNumber, userType, role)
    - Handle missing, invalid, and expired tokens with 401 responses
    - Define public endpoints list (auth endpoints, i18n endpoints, health)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 5.1-5.9_

  - [ ]* 2.2 Write unit tests for authentication middleware
    - Test missing token returns 401
    - Test malformed token returns 401
    - Test expired token returns 401
    - Test valid token attaches user to request
    - Test public endpoints skip authentication
    - Test invalid signature returns 401
    - _Requirements: 1.5, 1.6, 10.5_

  - [ ]* 2.3 Write property test for JWT token structure
    - **Property 1: JWT Token Structure Completeness**
    - **Validates: Requirements 1.1**

  - [ ]* 2.4 Write property test for JWT signature verification
    - **Property 2: JWT Token Signature Round-Trip**
    - **Validates: Requirements 1.2, 1.8**

  - [ ]* 2.5 Write property test for JWT expiration
    - **Property 3: JWT Token Expiration Time**
    - **Validates: Requirements 1.3**

  - [ ]* 2.6 Write property test for token extraction
    - **Property 4: Token Extraction from Authorization Header**
    - **Validates: Requirements 1.4**

  - [ ]* 2.7 Write property test for user attachment
    - **Property 5: Valid Token User Attachment**
    - **Validates: Requirements 1.7, 3.6**

- [ ] 3. Implement role authorization middleware
  - [ ] 3.1 Create role middleware at `src/shared/middleware/role.middleware.ts`
    - Define UserRole enum (FARMER, BUYER, ADMIN, SUPERADMIN)
    - Define Permission interface with all permission flags
    - Create rolePermissions mapping for each role
    - Implement `requireRole(...roles)` function for role checking
    - Implement `hasPermission(role, permission)` utility function
    - Return 403 for insufficient permissions
    - Support multiple acceptable roles (OR logic)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 3.2, 3.3_

  - [ ]* 3.2 Write unit tests for role authorization
    - Test FARMER role has correct permissions
    - Test BUYER role has correct permissions
    - Test ADMIN role has correct permissions
    - Test SUPERADMIN role has all permissions
    - Test insufficient role returns 403
    - Test multiple acceptable roles (OR logic)
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 3.3_

  - [ ]* 3.3 Write property test for role permissions
    - **Property 6: Role Permission Consistency**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**

- [ ] 4. Implement ownership verification middleware
  - [ ] 4.1 Create ownership middleware at `src/shared/middleware/ownership.middleware.ts`
    - Define ResourceType enum (LISTING, TRANSACTION, PROFILE, MEDIA)
    - Implement `requireOwnership(resourceType, resourceIdParam)` function
    - Implement `requireTransactionParticipant(transactionIdParam)` function
    - Implement `verifyOwnership(userId, resourceType, resourceId)` helper
    - Query database to determine resource owner
    - For transactions: verify user is buyer OR seller
    - Cache ownership checks within same request
    - Return 403 for ownership failures, 404 for non-existent resources
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.6, 7.7_

  - [ ]* 4.2 Write unit tests for ownership verification
    - Test owner can access their listing
    - Test non-owner cannot access listing
    - Test buyer can access their transaction
    - Test seller can access their transaction
    - Test non-participant cannot access transaction
    - Test non-existent resource returns 404
    - Test ownership check caching
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [ ]* 4.3 Write property test for profile ownership
    - **Property 10: Profile Ownership Verification**
    - **Validates: Requirements 4.1**

  - [ ]* 4.4 Write property test for listing ownership
    - **Property 11: Listing Ownership Verification**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 4.5 Write property test for transaction participant verification
    - **Property 12: Transaction Participant Verification**
    - **Validates: Requirements 4.4, 7.6**

  - [ ]* 4.6 Write property test for ownership caching
    - **Property 13: Ownership Check Caching**
    - **Validates: Requirements 4.7**

- [ ] 5. Implement rate limiting middleware
  - [ ] 5.1 Create rate limit middleware at `src/shared/middleware/rate-limit.middleware.ts`
    - Define RateLimitConfig interface
    - Implement `createRateLimiter(config)` function using Redis
    - Track request counts per user per time window
    - Return 429 with Retry-After header when limit exceeded
    - Reset counters after time window expires
    - Create pre-configured limiters: translateBatchLimiter (10 req/min), gradingLimiter (20 req/min)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ]* 5.2 Write unit tests for rate limiting
    - Test requests within limit succeed
    - Test requests exceeding limit return 429
    - Test Retry-After header is present
    - Test counter resets after window
    - Test different users have separate counters
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.7_

  - [ ]* 5.3 Write property test for translate batch rate limiting
    - **Property 23: Translate Batch Rate Limiting**
    - **Validates: Requirements 12.1**

  - [ ]* 5.4 Write property test for grading rate limiting
    - **Property 24: Grading Endpoint Rate Limiting**
    - **Validates: Requirements 12.2, 12.3**

  - [ ]* 5.5 Write property test for rate limit headers
    - **Property 25: Rate Limit Response Headers**
    - **Validates: Requirements 12.5**

  - [ ]* 5.6 Write property test for rate limit window reset
    - **Property 26: Rate Limit Window Reset**
    - **Validates: Requirements 12.7**

- [ ] 6. Implement security logger
  - [ ] 6.1 Create security logger at `src/shared/logging/security-logger.ts`
    - Define SecurityEventType enum (LOGIN_SUCCESS, LOGIN_FAILURE, AUTH_FAILURE, etc.)
    - Define SecurityEvent interface with all required fields
    - Implement `logSecurityEvent(event)` function
    - Implement `getCorrelationId(req)` helper function
    - Write logs to separate security log file
    - Include correlation IDs for request tracing
    - Log asynchronously (non-blocking)
    - _Requirements: 3.7, 8.5, 10.2, 10.7, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [ ]* 6.2 Write unit tests for security logger
    - Test successful login logged with required fields
    - Test failed login logged with required fields
    - Test authorization failure logged
    - Test ownership failure logged
    - Test admin action logged
    - Test rate limit violation logged
    - Test correlation ID present in all logs
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.8_

  - [ ]* 6.3 Write property test for authorization failure logging
    - **Property 9: Authorization Failure Logging**
    - **Validates: Requirements 3.7, 10.2**

  - [ ]* 6.4 Write property test for admin action logging
    - **Property 17: Admin Action Logging**
    - **Validates: Requirements 8.5, 14.5**

  - [ ]* 6.5 Write property test for security event logging
    - **Property 19: Security Event Comprehensive Logging**
    - **Validates: Requirements 10.7, 14.1, 14.2, 14.3, 14.4**

  - [ ]* 6.6 Write property test for log correlation IDs
    - **Property 29: Log Correlation ID Presence**
    - **Validates: Requirements 14.8**

  - [ ]* 6.7 Write property test for rate limit violation logging
    - **Property 30: Rate Limit Violation Logging**
    - **Validates: Requirements 14.6**

- [ ] 7. Integrate security logging into middleware
  - [ ] 7.1 Add security logging to authentication middleware
    - Log authentication failures (AUTH_FAILURE)
    - Log successful authentication attempts
    - Include IP address, endpoint, timestamp, correlation ID
    - _Requirements: 10.7, 14.1, 14.2_

  - [ ] 7.2 Add security logging to role middleware
    - Log authorization failures (AUTHZ_FAILURE)
    - Log admin actions (ADMIN_ACTION)
    - Log superadmin actions (SUPERADMIN_ACTION)
    - Include userId, endpoint, required role, user role
    - _Requirements: 3.7, 8.5, 10.2, 14.3, 14.5_

  - [ ] 7.3 Add security logging to ownership middleware
    - Log ownership verification failures (OWNERSHIP_FAILURE)
    - Include userId, resource type, resource ID
    - _Requirements: 10.2, 14.4_

  - [ ] 7.4 Add security logging to rate limit middleware
    - Log rate limit violations (RATE_LIMIT_EXCEEDED)
    - Include userId, endpoint, current count
    - _Requirements: 14.6_

- [ ]* 7.5 Write integration tests for logging
  - Test full authentication flow logs correctly
  - Test full authorization flow logs correctly
  - Test ownership verification flow logs correctly
  - Test rate limiting flow logs correctly
  - _Requirements: 10.7, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Apply middleware to auth routes
  - [ ] 9.1 Update auth controller to use authentication middleware
    - Apply `requireAuth` to PUT /api/auth/profile/:userId
    - Apply `requireOwnership` to profile update endpoint
    - Ensure public endpoints remain unauthenticated (login, register, OTP)
    - _Requirements: 5.1-5.6, 6.2, 11.5_

  - [ ]* 9.2 Write integration tests for auth routes
    - Test profile update requires authentication and ownership
    - Test login endpoints remain public
    - Test OTP endpoints remain public
    - _Requirements: 5.1-5.6, 6.2_

- [ ] 10. Apply middleware to marketplace routes
  - [ ] 10.1 Update marketplace controller to use middleware
    - Apply `requireAuth` and `requireOwnership` to DELETE /api/marketplace/listings/:id
    - Apply `requireAuth` and `requireOwnership` to PUT /api/marketplace/listings/:id
    - Apply `requireAuth` and `requireOwnership` to POST /api/marketplace/listings/:listingId/media
    - Apply `requireAuth` to listing creation endpoints
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 10.2 Write integration tests for marketplace routes
    - Test listing deletion requires authentication and ownership
    - Test listing update requires authentication and ownership
    - Test media upload requires authentication and ownership
    - Test non-owner cannot modify listing
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 11. Apply middleware to transaction routes
  - [ ] 11.1 Update transaction controller to use middleware
    - Apply `requireAuth` and `requireTransactionParticipant` to POST /api/transactions/:id/accept
    - Apply `requireAuth` and `requireTransactionParticipant` to POST /api/transactions/:id/lock-payment
    - Apply `requireAuth` and `requireTransactionParticipant` to POST /api/transactions/:id/dispatch
    - Apply `requireAuth` and `requireTransactionParticipant` to POST /api/transactions/:id/mark-delivered
    - Apply `requireAuth` and `requireTransactionParticipant` to POST /api/transactions/:id/release-funds
    - Apply `requireAuth` and `requireTransactionParticipant` to GET /api/transactions/:id
    - _Requirements: 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 11.2 Write integration tests for transaction routes
    - Test seller can accept transaction
    - Test buyer can lock payment
    - Test seller can dispatch order
    - Test seller can mark as delivered
    - Test buyer can release funds
    - Test non-participant cannot access transaction
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 11.3 Write property test for transaction action authorization
    - **Property 16: Transaction Action Authorization**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 12. Apply middleware to admin routes
  - [ ] 12.1 Update users controller to use role middleware
    - Apply `requireAuth` and `requireRole(ADMIN, SUPERADMIN)` to GET /api/users
    - _Requirements: 6.1, 8.1, 8.3_

  - [ ] 12.2 Update i18n controller to use role middleware
    - Apply `requireAuth` and `requireRole(ADMIN, SUPERADMIN)` to GET /api/i18n/cache-stats
    - Apply `requireAuth` and `requireRole(ADMIN, SUPERADMIN)` to GET /api/i18n/translate/feedback/stats
    - _Requirements: 8.1, 8.2_

  - [ ]* 12.3 Write integration tests for admin routes
    - Test admin can access user list
    - Test superadmin can access user list
    - Test farmer cannot access user list
    - Test buyer cannot access user list
    - Test admin can access cache stats
    - _Requirements: 6.1, 8.1, 8.2, 8.3, 8.4_

- [ ] 13. Apply middleware to superadmin routes
  - [ ] 13.1 Update dev controller to use superadmin middleware
    - Apply `requireAuth` and `requireRole(SUPERADMIN)` to POST /api/dev/clear-translation-cache
    - Apply `requireAuth` and `requireRole(SUPERADMIN)` to POST /api/dev/clear-sync-queue
    - Apply `requireAuth` and `requireRole(SUPERADMIN)` to POST /api/dev/clean-all-data
    - Apply `requireAuth` and `requireRole(SUPERADMIN)` to POST /api/dev/delete-media
    - Apply `requireAuth` and `requireRole(SUPERADMIN)` to POST /api/dev/delete-listings
    - Apply `requireAuth` and `requireRole(SUPERADMIN)` to GET /api/dev/stats
    - Maintain existing NODE_ENV checks as secondary defense
    - _Requirements: 6.9, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ]* 13.2 Write integration tests for superadmin routes
    - Test superadmin can access dev endpoints
    - Test admin cannot access dev endpoints
    - Test farmer cannot access dev endpoints
    - Test buyer cannot access dev endpoints
    - _Requirements: 6.9, 9.1-9.7_

  - [ ]* 13.3 Write property test for dev endpoint protection
    - **Property 15: Dev Endpoint SuperAdmin Requirement**
    - **Validates: Requirements 6.9**

- [ ] 14. Apply rate limiting to expensive endpoints
  - [ ] 14.1 Add rate limiting to translation endpoints
    - Apply `translateBatchLimiter` to POST /api/i18n/translate-batch
    - _Requirements: 12.1_

  - [ ] 14.2 Add rate limiting to grading endpoints
    - Apply `gradingLimiter` to POST /api/grading/grade
    - Apply `gradingLimiter` to POST /api/grading/grade-with-image
    - _Requirements: 12.2, 12.3_

  - [ ]* 14.3 Write integration tests for rate limiting
    - Test translate batch rate limit (10 req/min)
    - Test grading rate limit (20 req/min)
    - Test rate limit response includes Retry-After header
    - Test rate limit resets after window
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.7_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Add database migration for role field (optional)
  - [ ] 16.1 Create migration file for role column
    - Create SQL migration at `src/shared/database/migrations/005_add_user_roles.sql`
    - Add role column to users table (VARCHAR(50))
    - Set default roles based on existing userType
    - Create index on role column for performance
    - _Requirements: 2.8, 11.7_

  - [ ] 16.2 Update user model to include role field
    - Add role field to User interface
    - Implement role derivation from userType for backward compatibility
    - _Requirements: 2.8, 11.3, 11.4_

- [ ] 17. Implement error handling improvements
  - [ ] 17.1 Enhance error responses for security
    - Ensure authentication errors don't leak user existence
    - Ensure error messages don't include sensitive information
    - Remove stack traces from production error responses
    - Return 404 for non-existent resources instead of 403
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ]* 17.2 Write unit tests for error handling
    - Test authentication errors don't reveal user existence
    - Test error messages don't include tokens or secrets
    - Test production errors don't include stack traces
    - Test non-existent resources return 404
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ]* 17.3 Write property test for information leakage prevention
    - **Property 18: Error Message Information Leakage Prevention**
    - **Validates: Requirements 10.1, 10.3, 10.4**

- [ ] 18. Implement authentication rate limiting
  - [ ] 18.1 Add rate limiting to authentication endpoints
    - Create authentication rate limiter (5 failed attempts per minute per IP)
    - Apply to login endpoints
    - _Requirements: 10.6_

  - [ ]* 18.2 Write unit tests for authentication rate limiting
    - Test 5 failed attempts trigger rate limit
    - Test successful login doesn't count toward limit
    - Test rate limit resets after window
    - _Requirements: 10.6_

  - [ ]* 18.3 Write property test for authentication rate limiting
    - **Property 20: Authentication Rate Limiting**
    - **Validates: Requirements 10.6**

- [ ] 19. Write comprehensive integration tests
  - [ ]* 19.1 Write integration test for full authentication flow
    - Test login → token generation → protected endpoint access
    - _Requirements: 1.1-1.8, 3.1, 11.1, 11.2_

  - [ ]* 19.2 Write integration test for full authorization flow
    - Test authentication → role check → handler execution
    - _Requirements: 2.1-2.7, 3.2, 3.3_

  - [ ]* 19.3 Write integration test for full ownership flow
    - Test authentication → ownership check → handler execution
    - _Requirements: 4.1-4.7_

  - [ ]* 19.4 Write integration test for middleware chaining
    - Test auth → role → ownership → handler chain
    - _Requirements: 3.5, 13.5_

  - [ ]* 19.5 Write property test for middleware composition
    - **Property 8: Middleware Chaining Composition**
    - **Validates: Requirements 3.5, 13.5**

  - [ ]* 19.6 Write property test for successful authentication flow
    - **Property 27: Successful Authentication Flow Control**
    - **Validates: Requirements 13.3**

  - [ ]* 19.7 Write property test for failed authentication flow
    - **Property 28: Failed Authentication Flow Control**
    - **Validates: Requirements 13.4**

- [ ] 20. Write property tests for endpoint protection
  - [ ]* 20.1 Write property test for non-public endpoint authentication
    - **Property 14: Non-Public Endpoint Authentication Requirement**
    - **Validates: Requirements 5.9**

  - [ ]* 20.2 Write property test for role persistence
    - **Property 7: Role Persistence Round-Trip**
    - **Validates: Requirements 2.8, 11.7**

  - [ ]* 20.3 Write property test for existing user role defaulting
    - **Property 21: Existing User Role Defaulting**
    - **Validates: Requirements 11.3**

  - [ ]* 20.4 Write property test for backward compatible login
    - **Property 22: Backward Compatible Login**
    - **Validates: Requirements 11.5**

- [ ] 21. Update configuration and environment setup
  - [ ] 21.1 Add environment variables for RBAC system
    - Document JWT_SECRET and JWT_EXPIRY (already in use)
    - Add REDIS_URL for rate limiting
    - Add RATE_LIMIT_ENABLED flag
    - Add SECURITY_LOG_LEVEL and SECURITY_LOG_FILE
    - Update .env.example with new variables
    - _Requirements: 1.2, 12.6_

  - [ ] 21.2 Create rate limit configuration file
    - Create `src/shared/middleware/rate-limit.config.ts`
    - Define rate limit configurations for all endpoints
    - _Requirements: 12.1, 12.2, 12.3, 12.7_

- [ ] 22. Update documentation
  - [ ] 22.1 Create API documentation for authentication
    - Document authentication requirements for each endpoint
    - Document required roles for protected endpoints
    - Document rate limits for expensive endpoints
    - Provide examples of Authorization header format
    - Document error responses (401, 403, 429)
    - Create file at `docs/api/AUTHENTICATION.md`
    - _Requirements: All requirements_

  - [ ] 22.2 Create developer guide for middleware usage
    - Guide for applying middleware to new endpoints
    - Guide for adding new roles and permissions
    - Guide for implementing ownership verification for new resources
    - Guide for configuring rate limits for new endpoints
    - Create file at `docs/development/RBAC-MIDDLEWARE-GUIDE.md`
    - _Requirements: 3.1, 3.2, 3.4, 13.1, 13.2_

  - [ ] 22.3 Create operations guide for deployment
    - Redis setup instructions
    - Environment variable configuration
    - Security log analysis guide
    - Monitoring and alerting recommendations
    - Create file at `docs/operations/RBAC-DEPLOYMENT.md`
    - _Requirements: 12.6, 14.7_

- [ ] 23. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a 3-phase migration strategy to minimize disruption
- All middleware is composable and can be chained in any order
- Security logging is asynchronous and non-blocking
- Rate limiting uses Redis for distributed coordination
- The system maintains backward compatibility with existing user data and authentication flows
