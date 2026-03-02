# Implementation Plan: Progressive Profile Management

## Overview

This implementation plan breaks down the Progressive Profile Management feature into discrete, actionable coding tasks. The feature enables minimal-friction registration (mobile number only) and progressively builds user profiles through contextual prompts and implicit data collection. It includes a comprehensive gamification system with points, membership tiers, referrals, and trust scoring.

The implementation follows a phased approach:
1. Core profile management and registration
2. Progressive data collection mechanisms
3. Gamification system (points, tiers, referrals)
4. Trust scoring and integrated dashboard

## Tasks

- [x] 1. Set up project structure and core data models
  - Create directory structure for profile management services
  - Define TypeScript interfaces for UserProfile, PromptTracking, PointsTransaction, Referral schemas
  - Set up database schema and migrations
  - Configure TypeScript compilation and linting
  - _Requirements: 1.1, 1.6, 8.1-8.11_

- [x] 2. Implement Registration Service
  - [x] 2.1 Create mobile number validation and OTP service
    - Implement international mobile number validation using libphonenumber-js
    - Support 10-digit format (assume +91) and full international format
    - Normalize all numbers to E.164 format for storage
    - Extract and store country code separately
    - Integrate international SMS gateway for OTP delivery
    - Implement OTP generation and verification logic
    - Add rate limiting for OTP requests
    - _Requirements: 1.1-1.15, 36.1-36.12, 37.1-37.10_
  
  - [ ]* 2.2 Write unit tests for registration service
    - Test mobile number validation edge cases
    - Test OTP generation and expiration
    - Test invalid format error messages
    - _Requirements: 1.3, 12.1_
  
  - [x] 2.3 Create user account initialization
    - Implement account creation with mobile number
    - Initialize profile with default values (all optional fields null)
    - Set initial completion percentage to 10%
    - Award Bronze tier and 50 trust score
    - Generate unique referral code
    - _Requirements: 1.2, 1.6, 1.7, 23.2, 25.2_
  
  - [x] 2.4 Implement registration API endpoints
    - POST /api/v1/profiles/register endpoint
    - POST /api/v1/profiles/verify-otp endpoint
    - Add request validation and error handling
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 3. Implement Profile Manager Service core functionality
  - [x] 3.1 Create profile CRUD operations
    - Implement GET profile by userId
    - Implement PATCH profile field updates
    - Add field-level validation for all profile fields
    - Implement profile data export (JSON format)
    - _Requirements: 14.1-14.7, 16.1-16.6_
  
  - [x] 3.2 Implement profile completeness calculator
    - Create calculateCompletionPercentage function with weighted fields
    - Mobile: 10%, Name: 15%, Location: 20%, UserType: 15%, Crops: 15%, Language: 10%, FarmSize: 10%, Bank: 5%, Picture: 5%
    - Trigger recalculation on any profile field update
    - Cache completion percentage in Redis with 5-minute TTL
    - _Requirements: 8.1-8.11_

  
  - [ ]* 3.3 Write property test for profile completeness calculation
    - **Property 1: Completeness percentage is always between 10 and 105**
    - **Validates: Requirements 8.1-8.11**
  
  - [x] 3.4 Implement privacy settings management
    - Create privacy controls for each optional field
    - Support privacy levels: public, private, platform_only
    - Default all fields to platform_only
    - Apply privacy filters to profile API responses
    - _Requirements: 15.1-15.7_
  
  - [ ]* 3.5 Write unit tests for privacy controls
    - Test privacy level enforcement
    - Test default privacy settings
    - Test privacy filter application
    - _Requirements: 15.3-15.5_

- [x] 4. Implement data validation layer
  - [x] 4.1 Create field validators
    - Mobile number: International format using libphonenumber-js
    - 10-digit input: Validate as Indian (starts with 6-9), normalize to +91
    - Full international: Validate according to country-specific rules
    - Name: Unicode letters, spaces, 2-100 characters
    - Location: GPS coordinates within global boundaries (-90 to 90 lat, -180 to 180 lon)
    - Farm size: Positive number 0.1-10000
    - Language: Supported languages list
    - _Requirements: 1.1-1.15, 17.1-17.12, 36.1-36.12_
  
  - [ ]* 4.2 Write property tests for validators
    - **Property 2: Valid inputs always pass validation**
    - **Property 3: Invalid inputs always fail with descriptive errors**
    - **Validates: Requirements 12.1-12.7**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5.0 Implement Account Lockout Protection
  - [ ] 5.0.1 Add lockout fields to user schema
    - Add failedLoginAttempts field (number, default 0)
    - Add lockedUntil field (Date, optional)
    - Add lastLoginAt field (Date, optional)
    - Create database migration
    - _Requirements: 24A.1-24A.10_
  
  - [ ] 5.0.2 Implement failed login tracking
    - Track failed PIN login attempts
    - Track failed biometric login attempts
    - Increment counter on each failure
    - Reset counter on successful login
    - _Requirements: 24A.1-24A.2, 24A.5-24A.6_
  
  - [ ] 5.0.3 Implement account lockout logic
    - Lock account after 3 failed attempts
    - Set lockout duration to 30 minutes
    - Store lockout timestamp
    - Return clear error message with remaining time
    - _Requirements: 24A.1-24A.4_
  
  - [ ] 5.0.4 Implement auto-unlock mechanism
    - Check lockout expiration on login attempt
    - Auto-unlock if lockout period expired
    - Clear lockedUntil timestamp
    - _Requirements: 24A.4_
  
  - [ ] 5.0.5 Allow OTP login when locked
    - Bypass lockout check for OTP authentication
    - Enable account recovery via OTP
    - Reset failed attempts on successful OTP login
    - _Requirements: 24A.8_
  
  - [ ] 5.0.6 Add lockout notifications
    - Send SMS when account is locked
    - Include lockout duration in message
    - Log lockout events for audit
    - _Requirements: 24A.9-24A.10_
  
  - [ ]* 5.0.7 Write tests for account lockout
    - Test lockout after 3 failed attempts
    - Test auto-unlock after 30 minutes
    - Test OTP bypass when locked
    - Test counter reset on success
    - _Requirements: 24A.1-24A.10_

- [ ] 5.1 Implement International Mobile Number Support
  - [ ] 5.1.1 Install and configure libphonenumber-js
    - Install libphonenumber-js package (v1.10+)
    - Configure for tree-shaking to minimize bundle size
    - _Requirements: 1.15, 36.2_
  
  - [ ] 5.1.2 Update mobile number validation service
    - Replace Indian-only validation with international support
    - Implement 10-digit → +91 normalization logic
    - Implement full international number validation
    - Extract country code from validated numbers
    - Return normalized E.164 format
    - _Requirements: 1.1-1.7, 36.1-36.4_
  
  - [ ] 5.1.3 Update database schema for country code
    - Add countryCode field to UserProfile schema (required, indexed)
    - Create migration script for existing users (default +91)
    - Ensure mobileNumber field stores E.164 format
    - Update schema documentation
    - _Requirements: 36.4, 36.8, 37.1_
  
  - [ ] 5.1.4 Update registration flow
    - Store normalized mobileNumber (E.164 format)
    - Store extracted countryCode
    - Update OTP sending to use full international number
    - Handle international SMS delivery errors
    - _Requirements: 1.7-1.10, 36.6-36.7, 36.11_
  
  - [ ] 5.1.5 Add country code selector to UI
    - Create country code dropdown component
    - Default to +91 (India) for primary market
    - Support country search by name or code
    - Display popular countries at top
    - Show format hints based on selected country
    - Validate input as user types
    - _Requirements: 37.4-37.9_
  
  - [ ] 5.1.6 Implement localized number display
    - Detect country code from stored number
    - Format numbers according to country standards
    - Add optional country flags next to numbers
    - _Requirements: 37.1-37.3, 37.10_
  
  - [ ] 5.1.7 Configure international SMS gateway
    - Update SMS gateway configuration for international support
    - Implement country-specific SMS delivery
    - Add retry logic for failed deliveries
    - Implement cost monitoring and rate limiting
    - _Requirements: 1.10, 36.6-36.7, 36.11-36.12_
  
  - [ ]* 5.1.8 Write tests for international mobile support
    - Test 10-digit Indian number validation and normalization
    - Test international number validation (UK, US, UAE, etc.)
    - Test invalid number rejection
    - Test country code extraction
    - Test E.164 format storage
    - Test localized display formatting
    - _Requirements: 1.1-1.15, 36.1-36.12, 37.1-37.10_

- [x] 6. Implement Contextual Prompt Engine
  - [x] 6.1 Create prompt opportunity detection
    - Monitor user interactions for missing profile fields
    - Implement field priority ranking (location: 100, name: 90, userType: 85, crops: 80, language: 70, farmSize: 60, picture: 50, bank: 40)
    - Determine highest priority missing field for prompting
    - _Requirements: 2.1, 2.2, 2.7_
  
  - [x] 6.2 Implement prompt frequency management
    - Track prompt dismissals with timestamps
    - Enforce 24-hour cooldown after dismissal
    - Mark field as user_declined after 3 dismissals
    - Limit to one prompt per user interaction
    - Prevent prompts within 5 minutes of last prompt
    - _Requirements: 2.3-2.6, 18.1-18.6_
  
  - [x] 6.3 Create prompt timing logic
    - Display prompts after successful interaction completion
    - Avoid prompts during active interactions
    - Avoid prompts during error conditions
    - Prioritize fields that unlock benefit incentives
    - _Requirements: 18.1-18.6_
  
  - [ ]* 6.4 Write unit tests for prompt engine
    - Test prompt frequency limits
    - Test dismissal tracking
    - Test priority field selection
    - _Requirements: 2.3-2.6, 18.3_

- [x] 7. Implement Implicit Update Service
  - [x] 7.1 Create language detection
    - Integrate language detection API (AWS Comprehend or Google Cloud Translation)
    - Support Hindi, English, Punjabi, Tamil, Telugu, Marathi
    - Update language_preference when confidence > 70%
    - Require 3 consecutive messages in new language to switch
    - _Requirements: 6.1-6.6_
  
  - [x] 7.2 Implement crop detection from images
    - Integrate crop detection service
    - Add crop to crops_grown when confidence > 80%
    - Prevent duplicate crop entries
    - Store crop with source metadata (image_upload, price_query, sale_post)
    - _Requirements: 5.1-5.7_
  
  - [x] 7.3 Create user type inference
    - Infer farmer when user posts crops for sale
    - Infer buyer when user inquires about purchasing
    - Set both when user exhibits both behaviors
    - Prompt explicitly after 5 interactions if type unclear
    - _Requirements: 7.1-7.6_
  
  - [ ]* 7.4 Write unit tests for implicit updates
    - Test language detection and switching logic
    - Test crop detection and deduplication
    - Test user type inference rules
    - _Requirements: 5.3, 6.5, 7.1-7.3_

- [x] 8. Implement location data collection
  - [x] 8.1 Create location capture service
    - Support GPS coordinate capture with accuracy metadata
    - Support manual location entry with validation
    - Integrate geocoding service for location validation
    - Store location with timestamp and type (gps/manual)
    - Set verification status based on capture method
    - _Requirements: 3.1-3.7_
  
  - [ ]* 8.2 Write unit tests for location service
    - Test GPS coordinate validation
    - Test manual location validation
    - Test location storage with metadata
    - _Requirements: 3.3-3.5_

- [x] 9. Implement Profile Picture Service
  - [x] 9.1 Create image upload and processing
    - Accept JPEG, PNG, WebP formats up to 5MB
    - Validate image format and size
    - Resize to 400x400 for storage
    - Generate 100x100 thumbnail
    - Store with unique filename in S3/Cloudinary
    - _Requirements: 21.1-21.7_
  
  - [x] 9.2 Integrate content moderation
    - Integrate AWS Rekognition or Clarifai
    - Check for inappropriate content before storage
    - Reject images that fail moderation
    - _Requirements: 21.12_
  
  - [x] 9.3 Implement profile picture management
    - POST /api/v1/profiles/{userId}/picture endpoint
    - Support camera capture and file upload
    - Update completion percentage by 5% on upload
    - Display default avatar when no picture set
    - Allow picture update and removal
    - Delete stored files on removal
    - _Requirements: 21.3, 21.8-21.11_
  
  - [ ]* 9.4 Write unit tests for profile picture service
    - Test image validation
    - Test resize and thumbnail generation
    - Test file storage and deletion
    - _Requirements: 21.4-21.6_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement Gamification Service - Points System
  - [ ] 11.1 Create points calculation engine
    - Define points rules: profile_complete_100 (50), create_listing (10), check_weather (5), query_price (5), farming_advice (5), transaction (20), upload_photo (15), daily_streak (10)
    - Define daily limits per activity type
    - Implement 200 points daily cap (excluding referrals/transactions)
    - _Requirements: 22.2-22.9_
  
  - [ ] 11.2 Implement points awarding logic
    - Award points for each activity type
    - Check daily limits before awarding
    - Update current and lifetime points
    - Create points transaction record
    - Trigger tier check after points award
    - _Requirements: 22.1-22.13_
  
  - [ ] 11.3 Create daily streak tracking
    - Track consecutive days of platform usage
    - Award 10 points per streak day
    - Reset streak on missed day
    - Store last streak date
    - _Requirements: 22.9_
  
  - [ ] 11.4 Implement points history and balance APIs
    - GET /api/v1/gamification/{userId}/points endpoint
    - GET /api/v1/gamification/{userId}/points/history endpoint
    - Cache points balance in Redis with 1-minute TTL
    - _Requirements: 22.10-22.11_
  
  - [ ]* 11.5 Write property tests for points system
    - **Property 4: Points balance never goes negative**
    - **Property 5: Daily cap is never exceeded for regular activities**
    - **Validates: Requirements 22.1, 22.13**

- [ ] 12. Implement Membership Tier System
  - [ ] 12.1 Create tier calculation and promotion
    - Define tier thresholds: Bronze (0), Silver (500), Gold (2000), Platinum (5000)
    - Calculate tier based on lifetime points
    - Promote tier when threshold reached
    - Maintain tier even if current points spent
    - _Requirements: 23.1-23.5, 23.13_
  
  - [ ] 12.2 Implement tier benefits
    - Priority support for Gold and Platinum
    - Featured listing placement for Platinum
    - Reduced transaction fees for Gold and Platinum
    - _Requirements: 23.9-23.11_
  
  - [ ] 12.3 Create tier display and notifications
    - Display tier badge in profile
    - Show progress to next tier as percentage
    - Send notification on tier promotion
    - Display tier badges in marketplace listings
    - _Requirements: 23.6-23.8, 23.12_
  
  - [ ]* 12.4 Write unit tests for tier system
    - Test tier calculation logic
    - Test tier promotion triggers
    - Test tier persistence after point spending
    - _Requirements: 23.3-23.5, 23.13_

- [ ] 13. Implement Referral Program
  - [ ] 13.1 Create referral code generation
    - Generate unique referral code per user
    - Display referral code in profile
    - Provide share functionality (SMS, WhatsApp)
    - _Requirements: 24.1-24.3_
  
  - [ ] 13.2 Implement referral tracking
    - Link new user to referrer on registration
    - Award 100 points on referee registration
    - Award 200 points on referee first transaction
    - Prevent self-referrals
    - Limit to 50 referrals per user per month
    - _Requirements: 24.4-24.10_
  
  - [ ] 13.3 Create referral history and analytics
    - Display referral count in profile
    - Maintain referral history with status
    - Track referral conversion rates
    - Show benefits earned from referrals
    - _Requirements: 24.7-24.8, 24.11-24.12_
  
  - [ ]* 13.4 Write unit tests for referral system
    - Test referral code uniqueness
    - Test self-referral prevention
    - Test referral limit enforcement
    - _Requirements: 24.9-24.10_

- [ ] 14. Implement Points Redemption
  - [ ] 14.1 Create redemption catalog
    - Define redemption options: featured_listing_24h (500), transaction_fee_waiver (2000), priority_support_30d (3000)
    - Display available rewards with point costs
    - Show user's current points balance
    - _Requirements: 27.1-27.3, 27.11_
  
  - [ ] 14.2 Implement redemption processing
    - POST /api/v1/gamification/{userId}/redeem endpoint
    - Validate sufficient points before redemption
    - Deduct points from current balance immediately
    - Activate benefit within 1 minute
    - Create redemption transaction record
    - Send confirmation notification
    - _Requirements: 27.6-27.10_
  
  - [ ] 14.3 Create redemption history
    - Maintain history of all redeemed benefits
    - Display redemption history in profile
    - Note that tiers are based on lifetime points
    - _Requirements: 27.8, 27.12_
  
  - [ ]* 14.4 Write unit tests for redemption
    - Test insufficient points prevention
    - Test points deduction
    - Test benefit activation
    - _Requirements: 27.6, 27.10_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement Trust Score Service
  - [ ] 16.1 Create trust score calculation engine
    - Initialize new users at 50 trust score
    - Define positive events: profile_complete_100 (+5), verify_location_gps (+3), complete_transaction (+2), positive_feedback (+5)
    - Define negative events: negative_feedback (-10), cancel_transaction (-15), dispute_raised (-20)
    - Enforce min (0) and max (100) bounds
    - _Requirements: 25.1-25.9_
  
  - [ ] 16.2 Implement trust score update logic
    - POST /api/v1/trust/{userId}/event endpoint
    - Calculate score change based on event type
    - Update trust score with bounds checking
    - Log change to trust score history
    - _Requirements: 25.2-25.9, 25.15_
  
  - [ ] 16.3 Create trust score ranges and restrictions
    - Define ranges: Low (0-40), Medium (41-70), High (71-85), Excellent (86-100)
    - Restrict listing creation for Low trust users
    - Provide improvement tips for Low/Medium users
    - _Requirements: 25.12-25.14_
  
  - [ ] 16.4 Implement trust score display
    - Display trust score as visual indicator (stars/progress bar)
    - Show trust score badges in marketplace listings
    - GET /api/v1/trust/{userId} endpoint with history
    - _Requirements: 25.10-25.11, 25.16_
  
  - [ ]* 16.5 Write property tests for trust score
    - **Property 6: Trust score always stays within 0-100 bounds**
    - **Property 7: Trust score changes are always logged**
    - **Validates: Requirements 25.1, 25.15**

- [ ] 17. Implement Integrated Profile Dashboard
  - [ ] 17.1 Create dashboard data aggregation
    - Aggregate profile data, completion percentage, points, tier, trust score
    - Calculate tier progress percentage
    - Fetch recent points-earning activities
    - Identify locked features and unlock requirements
    - Generate quick action suggestions
    - _Requirements: 26.1-26.12_
  
  - [ ] 17.2 Implement dashboard API endpoint
    - GET /api/v1/profiles/{userId}/dashboard endpoint
    - Return comprehensive dashboard data structure
    - Cache dashboard data with appropriate TTL
    - _Requirements: 26.1-26.12_
  
  - [ ]* 17.3 Write integration tests for dashboard
    - Test dashboard data completeness
    - Test quick actions generation
    - Test locked features identification
    - _Requirements: 26.9-26.11_

- [ ] 18. Implement profile editing and verification
  - [ ] 18.1 Create profile editing interface
    - Display all profile fields with current values
    - Allow editing of all optional fields
    - Require re-verification for mobile number changes
    - Validate new values before saving
    - Reset verification status on verified field edits
    - Log all edits with timestamp and previous value
    - _Requirements: 14.1-14.7_
  
  - [ ] 18.2 Implement profile verification
    - Set mobile verification status after OTP
    - Set location verification based on GPS vs manual
    - Set crop verification when detected from images
    - Display verification badges in UI
    - Allow admin manual verification
    - _Requirements: 13.1-13.6_
  
  - [ ]* 18.3 Write unit tests for profile editing
    - Test field validation on edit
    - Test verification status reset
    - Test edit logging
    - _Requirements: 14.5-14.7_

- [ ] 19. Implement profile deletion and data export
  - [ ] 19.1 Create data export functionality
    - Generate JSON file with all profile fields
    - Include metadata (collection_date, verification_status, privacy_settings)
    - Complete export within 5 seconds
    - Deliver via download link or email
    - Log export requests
    - _Requirements: 16.1-16.6_
  
  - [ ] 19.2 Implement profile deletion
    - Display confirmation dialog with consequences
    - Mark account for deletion immediately
    - Anonymize mobile number on deletion request
    - Complete full deletion within 30 days
    - Retain transaction records per legal requirements
    - Send confirmation on completion
    - _Requirements: 17.1-17.7_
  
  - [ ]* 19.3 Write unit tests for deletion
    - Test immediate anonymization
    - Test transaction record retention
    - Test deletion confirmation
    - _Requirements: 17.5-17.7_

- [ ] 20. Implement completion incentives and display
  - [ ] 20.1 Create benefit incentive system
    - Define thresholds: 50% (personalized recommendations), 70% (weather alerts), 90% (payment features)
    - Lock features below required completion percentage
    - Display locked features with clear messaging
    - Show required fields when accessing locked feature
    - Send notification when benefit unlocked
    - _Requirements: 10.1-10.7_
  
  - [ ] 20.2 Implement profile completion banner
    - Display banner when completion < 80%
    - Show percentage as numeric value and progress bar
    - List top 3 missing high-value fields
    - Navigate to input interface on field click
    - Hide banner when completion >= 80%
    - Allow temporary dismissal (7 days)
    - _Requirements: 9.1-9.6_
  
  - [ ]* 20.3 Write unit tests for incentives
    - Test feature locking logic
    - Test threshold-based unlocking
    - Test banner display conditions
    - _Requirements: 9.1, 9.5, 10.2-10.4_

- [ ] 21. Implement bulk profile import
  - [ ] 21.1 Create bulk import service
    - Accept CSV and JSON formats
    - Validate all fields before processing
    - Match records to existing users by mobile number
    - Update only empty fields on match
    - Skip invalid records and log errors
    - Generate import summary report
    - _Requirements: 19.1-19.7_
  
  - [ ]* 21.2 Write unit tests for bulk import
    - Test validation logic
    - Test existing user matching
    - Test empty field update logic
    - _Requirements: 19.3-19.6_

- [ ] 22. Implement analytics and monitoring
  - [ ] 22.1 Create profile analytics tracking
    - Track time to collect each field from registration
    - Track field collection source (explicit, implicit, manual, import)
    - Calculate average completion percentage
    - Track prompt acceptance and dismissal rates
    - Identify low collection rate fields
    - _Requirements: 20.1-20.7_
  
  - [ ] 22.2 Create gamification analytics
    - Track total points awarded across users
    - Track points by activity type
    - Track average points per user
    - Track tier distribution
    - Track referral conversion rates
    - Track points redemption rates
    - Track correlation with retention
    - Track trust score distribution
    - _Requirements: 28.1-28.11_
  
  - [ ] 22.3 Implement analytics dashboards
    - Create product dashboard (completion trends, feature unlocks, engagement)
    - Create operations dashboard (system health, API performance, errors)
    - Create business dashboard (user growth, tier distribution, referral effectiveness)
    - _Requirements: 20.6, 28.10_
  
  - [ ]* 22.4 Write integration tests for analytics
    - Test metric calculation accuracy
    - Test dashboard data aggregation
    - Test analytics query performance
    - _Requirements: 20.3-20.5, 28.3-28.5_

- [ ] 23. Integration and API wiring
  - [ ] 23.1 Wire all services together
    - Connect Registration Service to Profile Manager
    - Connect Contextual Prompt Engine to user interaction events
    - Connect Implicit Update Service to Kisan Mitra and Marketplace
    - Connect Gamification Service to all activity events
    - Connect Trust Score Service to transaction and feedback events
    - _Requirements: All integration requirements_
  
  - [ ] 23.2 Implement API gateway routing
    - Configure routes for all endpoints
    - Add authentication middleware
    - Add rate limiting
    - Add request logging
    - Add error handling middleware
    - _Requirements: All API requirements_
  
  - [ ] 23.3 Set up caching layer
    - Configure Redis for profile data (5-min TTL)
    - Configure Redis for points balance (1-min TTL)
    - Implement cache invalidation on updates
    - _Requirements: Performance requirements_
  
  - [ ]* 23.4 Write end-to-end integration tests
    - Test complete registration to profile completion flow
    - Test gamification flow from earning to redemption
    - Test trust score lifecycle
    - Test privacy settings enforcement
    - _Requirements: All requirements_

- [ ] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript as specified in the design document
- User type is limited to farmer/buyer (both) as per user request
- Integration with external services (SMS, image storage, content moderation, geocoding, language detection) is required
- Caching strategy uses Redis for performance optimization
- All profile fields have privacy controls with platform_only as default
