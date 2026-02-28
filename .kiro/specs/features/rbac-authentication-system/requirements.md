# Requirements Document: RBAC Authentication System

## Introduction

This document specifies the requirements for implementing a comprehensive Role-Based Access Control (RBAC) and authentication/authorization system for Bharat Mandi. The current application has NO authentication on production endpoints, creating a critical security vulnerability. This feature will implement JWT-based authentication, role-based authorization, and ownership verification to secure all endpoints appropriately.

## Glossary

- **Auth_System**: The authentication and authorization system responsible for verifying user identity and permissions
- **JWT_Token**: JSON Web Token used to authenticate requests and carry user identity/role information
- **RBAC_System**: Role-Based Access Control system that maps permissions to roles and enforces access policies
- **Middleware**: Express middleware functions that intercept requests to verify authentication and authorization
- **Protected_Endpoint**: An API endpoint that requires authentication and/or specific permissions to access
- **Public_Endpoint**: An API endpoint accessible without authentication (e.g., login, OTP request)
- **Resource_Owner**: The user who created or owns a specific resource (listing, transaction, profile)
- **Admin**: User with elevated privileges for monitoring and user management
- **SuperAdmin**: User with full system access including dev endpoints
- **Farmer**: User who creates marketplace listings and sells produce
- **Buyer**: User who purchases produce from marketplace listings
- **Ownership_Verification**: Process of confirming that the authenticated user owns the resource they're trying to access
- **Permission**: A specific action that can be performed (e.g., create_listing, delete_user, access_dev_endpoints)
- **Role**: A collection of permissions assigned to users (e.g., FARMER, BUYER, ADMIN, SUPERADMIN)

## Requirements

### Requirement 1: JWT Authentication

**User Story:** As a system administrator, I want all protected endpoints to require valid JWT tokens, so that only authenticated users can access the application.

#### Acceptance Criteria

1. THE Auth_System SHALL generate JWT_Tokens containing userId, phoneNumber, and userType upon successful login
2. THE Auth_System SHALL sign JWT_Tokens with a secure secret key stored in environment variables
3. THE Auth_System SHALL set JWT_Token expiration to 7 days from issuance
4. WHEN a request is made to a Protected_Endpoint, THE Middleware SHALL extract the JWT_Token from the Authorization header
5. WHEN a JWT_Token is missing from a Protected_Endpoint request, THE Middleware SHALL return HTTP 401 with error message "No token provided"
6. WHEN a JWT_Token is invalid or expired, THE Middleware SHALL return HTTP 401 with error message "Invalid or expired token"
7. WHEN a JWT_Token is valid, THE Middleware SHALL decode the token and attach user information to the request object
8. THE Auth_System SHALL validate JWT_Token signature using the same secret key used for signing

### Requirement 2: Role Definition and Management

**User Story:** As a system administrator, I want to define roles with specific permissions, so that I can control what different types of users can do.

#### Acceptance Criteria

1. THE RBAC_System SHALL support the following roles: FARMER, BUYER, ADMIN, SUPERADMIN
2. THE RBAC_System SHALL extend the existing UserType enum to include ADMIN and SUPERADMIN values
3. THE RBAC_System SHALL define permissions for each role in a centralized configuration
4. THE RBAC_System SHALL assign FARMER role permissions: manage_own_listings, manage_own_transactions, manage_own_profile, create_listings, upload_media
5. THE RBAC_System SHALL assign BUYER role permissions: manage_own_transactions, manage_own_profile, create_transactions
6. THE RBAC_System SHALL assign ADMIN role permissions: view_all_users, view_statistics, manage_users, view_cache_stats
7. THE RBAC_System SHALL assign SUPERADMIN role permissions: all ADMIN permissions plus access_dev_endpoints, clear_caches, delete_data
8. THE RBAC_System SHALL store user roles in the users database table

### Requirement 3: Authorization Middleware

**User Story:** As a developer, I want reusable authorization middleware, so that I can easily protect endpoints with role-based access control.

#### Acceptance Criteria

1. THE Middleware SHALL provide a requireAuth function that verifies JWT_Token validity
2. THE Middleware SHALL provide a requireRole function that accepts one or more required roles
3. WHEN a user lacks the required role, THE Middleware SHALL return HTTP 403 with error message "Insufficient permissions"
4. THE Middleware SHALL provide a requireOwnership function that verifies resource ownership
5. THE Middleware SHALL allow chaining of authentication and authorization checks
6. THE Middleware SHALL attach decoded user information (userId, phoneNumber, userType) to the request object for downstream use
7. THE Middleware SHALL log authorization failures for security auditing

### Requirement 4: Ownership Verification

**User Story:** As a farmer, I want to ensure only I can modify my listings and profile, so that my data remains secure.

#### Acceptance Criteria

1. WHEN a user attempts to update a profile, THE Auth_System SHALL verify the JWT_Token userId matches the profile userId
2. WHEN a user attempts to delete a listing, THE Auth_System SHALL verify the user owns the listing by checking the listing's userId
3. WHEN a user attempts to upload media to a listing, THE Auth_System SHALL verify the user owns the listing
4. WHEN a user attempts to modify a transaction, THE Auth_System SHALL verify the user is either the buyer or seller in that transaction
5. WHEN ownership verification fails, THE Auth_System SHALL return HTTP 403 with error message "You do not have permission to access this resource"
6. THE Auth_System SHALL query the database to retrieve resource ownership information when needed
7. THE Auth_System SHALL cache ownership checks within the same request to avoid duplicate database queries

### Requirement 5: Public Endpoint Configuration

**User Story:** As a user, I want to access authentication and language detection endpoints without logging in, so that I can register and use the app.

#### Acceptance Criteria

1. THE Auth_System SHALL allow unauthenticated access to POST /api/auth/request-otp
2. THE Auth_System SHALL allow unauthenticated access to POST /api/auth/verify-otp
3. THE Auth_System SHALL allow unauthenticated access to POST /api/auth/register
4. THE Auth_System SHALL allow unauthenticated access to POST /api/auth/setup-pin
5. THE Auth_System SHALL allow unauthenticated access to POST /api/auth/login
6. THE Auth_System SHALL allow unauthenticated access to POST /api/auth/login/biometric
7. THE Auth_System SHALL allow unauthenticated access to POST /api/i18n/detect-language
8. THE Auth_System SHALL allow unauthenticated access to GET /api/i18n/languages
9. THE Auth_System SHALL require authentication for all other endpoints not explicitly listed as public

### Requirement 6: Protected Endpoint Security

**User Story:** As a system administrator, I want critical endpoints protected with appropriate authorization, so that sensitive operations are secure.

#### Acceptance Criteria

1. THE Auth_System SHALL require ADMIN or SUPERADMIN role for GET /api/users
2. THE Auth_System SHALL require authentication and ownership verification for PUT /api/auth/profile/:userId
3. THE Auth_System SHALL require authentication and ownership verification for DELETE /api/marketplace/listings/:id
4. THE Auth_System SHALL require authentication and ownership verification for PUT /api/marketplace/listings/:id
5. THE Auth_System SHALL require authentication and ownership verification for POST /api/marketplace/listings/:listingId/media
6. THE Auth_System SHALL require authentication and transaction participant verification for POST /api/transactions/:id/release-funds
7. THE Auth_System SHALL require authentication and transaction participant verification for POST /api/transactions/:id/accept
8. THE Auth_System SHALL require authentication and transaction participant verification for POST /api/transactions/:id/dispatch
9. THE Auth_System SHALL require SUPERADMIN role for all endpoints under /api/dev/*

### Requirement 7: Transaction Authorization

**User Story:** As a buyer, I want to ensure only authorized participants can modify transactions, so that my purchases are secure.

#### Acceptance Criteria

1. WHEN a user attempts to accept a transaction, THE Auth_System SHALL verify the user is the seller (listing owner)
2. WHEN a user attempts to lock payment, THE Auth_System SHALL verify the user is the buyer
3. WHEN a user attempts to dispatch an order, THE Auth_System SHALL verify the user is the seller
4. WHEN a user attempts to mark as delivered, THE Auth_System SHALL verify the user is the seller
5. WHEN a user attempts to release funds, THE Auth_System SHALL verify the user is the buyer
6. WHEN a user attempts to view transaction details, THE Auth_System SHALL verify the user is either the buyer or seller
7. THE Auth_System SHALL retrieve transaction details from the database to determine buyer and seller identities

### Requirement 8: Admin Endpoint Protection

**User Story:** As a system administrator, I want admin-only endpoints properly secured, so that sensitive operations are restricted.

#### Acceptance Criteria

1. THE Auth_System SHALL require ADMIN or SUPERADMIN role for GET /api/i18n/cache-stats
2. THE Auth_System SHALL require ADMIN or SUPERADMIN role for GET /api/i18n/translate/feedback/stats
3. THE Auth_System SHALL require ADMIN or SUPERADMIN role for GET /api/users
4. WHEN a non-admin user attempts to access an admin endpoint, THE Auth_System SHALL return HTTP 403 with error message "Admin access required"
5. THE Auth_System SHALL log all admin endpoint access attempts for audit purposes

### Requirement 9: SuperAdmin Endpoint Protection

**User Story:** As a system administrator, I want dev endpoints restricted to superadmins only, so that dangerous operations cannot be performed by regular users.

#### Acceptance Criteria

1. THE Auth_System SHALL require SUPERADMIN role for POST /api/dev/clear-translation-cache
2. THE Auth_System SHALL require SUPERADMIN role for POST /api/dev/clear-sync-queue
3. THE Auth_System SHALL require SUPERADMIN role for POST /api/dev/clean-all-data
4. THE Auth_System SHALL require SUPERADMIN role for POST /api/dev/delete-media
5. THE Auth_System SHALL require SUPERADMIN role for POST /api/dev/delete-listings
6. THE Auth_System SHALL require SUPERADMIN role for GET /api/dev/stats
7. WHEN a non-superadmin user attempts to access a dev endpoint, THE Auth_System SHALL return HTTP 403 with error message "SuperAdmin access required"
8. THE Auth_System SHALL maintain existing NODE_ENV production checks as a secondary defense layer

### Requirement 10: Error Handling and Security

**User Story:** As a security engineer, I want proper error handling that doesn't leak sensitive information, so that the system remains secure.

#### Acceptance Criteria

1. WHEN authentication fails, THE Auth_System SHALL return generic error messages that do not reveal whether a user exists
2. WHEN authorization fails, THE Auth_System SHALL log the failure with user ID, attempted action, and timestamp
3. THE Auth_System SHALL not include sensitive information (passwords, tokens, secrets) in error messages
4. THE Auth_System SHALL not include stack traces in production error responses
5. WHEN a JWT_Token is malformed, THE Auth_System SHALL return HTTP 401 with error message "Invalid token format"
6. THE Auth_System SHALL rate-limit authentication attempts to prevent brute force attacks (maximum 5 failed attempts per minute per IP)
7. THE Auth_System SHALL log all authentication and authorization events for security auditing

### Requirement 11: Backward Compatibility

**User Story:** As a developer, I want the new auth system to work with existing user data, so that current users are not disrupted.

#### Acceptance Criteria

1. THE Auth_System SHALL continue to use the existing JWT_Token generation logic in auth.service.ts
2. THE Auth_System SHALL continue to use the existing verifyToken function for token validation
3. THE Auth_System SHALL default existing users without a role to FARMER or BUYER based on their userType
4. THE Auth_System SHALL support the existing UserType enum values (FARMER, BUYER, LOGISTICS_PROVIDER, etc.)
5. THE Auth_System SHALL maintain compatibility with existing login endpoints (PIN and biometric)
6. THE Auth_System SHALL not require database schema changes for existing user fields
7. THE Auth_System SHALL add new role field to users table with default values for existing users

### Requirement 12: Rate Limiting for Expensive Operations

**User Story:** As a system administrator, I want rate limiting on expensive AWS operations, so that costs are controlled and abuse is prevented.

#### Acceptance Criteria

1. THE Auth_System SHALL limit POST /api/i18n/translate-batch to 10 requests per minute per authenticated user
2. THE Auth_System SHALL limit POST /api/grading/grade-with-image to 20 requests per minute per authenticated user
3. THE Auth_System SHALL limit POST /api/grading/grade to 20 requests per minute per authenticated user
4. WHEN rate limit is exceeded, THE Auth_System SHALL return HTTP 429 with error message "Rate limit exceeded. Please try again later."
5. THE Auth_System SHALL include Retry-After header in rate limit responses indicating seconds until retry is allowed
6. THE Auth_System SHALL use Redis for distributed rate limiting across multiple server instances
7. THE Auth_System SHALL reset rate limit counters every minute

### Requirement 13: Middleware Integration

**User Story:** As a developer, I want authentication middleware easily integrated into existing routes, so that implementation is straightforward.

#### Acceptance Criteria

1. THE Middleware SHALL be implemented as Express middleware functions compatible with existing route handlers
2. THE Middleware SHALL be applied to routes using standard Express app.use() or router-level middleware
3. THE Middleware SHALL pass control to the next middleware or route handler when authentication succeeds
4. THE Middleware SHALL short-circuit the request and return an error response when authentication fails
5. THE Middleware SHALL be composable, allowing multiple middleware functions to be chained
6. THE Middleware SHALL provide TypeScript type definitions for request objects with attached user information
7. THE Middleware SHALL not modify existing route handler signatures

### Requirement 14: Security Logging and Auditing

**User Story:** As a security engineer, I want comprehensive logging of authentication and authorization events, so that I can detect and investigate security incidents.

#### Acceptance Criteria

1. THE Auth_System SHALL log successful login attempts with userId, phoneNumber, timestamp, and IP address
2. THE Auth_System SHALL log failed login attempts with phoneNumber, timestamp, IP address, and failure reason
3. THE Auth_System SHALL log authorization failures with userId, attempted endpoint, required permission, and timestamp
4. THE Auth_System SHALL log ownership verification failures with userId, resource type, resource ID, and timestamp
5. THE Auth_System SHALL log all admin and superadmin actions with full request details
6. THE Auth_System SHALL log rate limit violations with userId, endpoint, and timestamp
7. THE Auth_System SHALL write security logs to a separate log file or logging service for analysis
8. THE Auth_System SHALL include correlation IDs in logs to trace requests across multiple services

