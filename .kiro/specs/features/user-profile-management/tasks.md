# Implementation Plan: User Authentication & Profile Management

## Overview

This implementation plan breaks down the User Authentication & Profile Management feature into discrete, actionable coding tasks. The feature provides unified user authentication (OTP, PIN, biometric) and comprehensive profile management with minimal-friction registration (mobile number, name, location, user type) and progressively builds user profiles through contextual prompts and implicit data collection.

The implementation follows a phased approach:
1. Core authentication and registration
2. Profile management and data validation
3. Progressive data collection mechanisms
4. Profile analytics and completion incentives

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
    - _Requirements: 1.1-1.15_
  
  - [ ]* 2.2 Write unit tests for registration service
    - Test mobile number validation edge cases
    - Test OTP generation and expiration
    - Test invalid format error messages
    - _Requirements: 1.1-1.15_
  
  - [x] 2.3 Create user account initialization
    - Implement account creation with mobile number
    - Collect mandatory fields: name, location, userType
    - Initialize profile with default values (optional fields null)
    - Set initial completion percentage to 40%
    - _Requirements: 1.1-1.15, 3.1-3.14_
  
  - [x] 2.4 Implement registration API endpoints
    - POST /api/v1/profiles/register endpoint
    - POST /api/v1/profiles/verify-otp endpoint (with mandatory fields)
    - Add request validation and error handling
    - _Requirements: 1.1-1.15, 3.1-3.14_

- [x] 3. Implement Profile Manager Service core functionality
  - [x] 3.1 Create profile CRUD operations
    - Implement GET profile by userId
    - Implement PATCH profile field updates
    - Add field-level validation for all profile fields
    - Implement profile data export (JSON format)
    - _Requirements: 13.1-13.7, 14.1-14.8, 20.1-20.6_
  
  - [x] 3.2 Implement profile completeness calculator
    - Create calculateCompletionPercentage function with weighted fields
    - Mobile: 10%, Name: 10%, Location: 10%, UserType: 10%, Crops: 20%, Language: 10%, FarmSize: 10%, Bank: 10%, Picture: 10%
    - Trigger recalculation on any profile field update
    - _Requirements: 16.1-16.13_
  
  - [ ]* 3.3 Write property test for profile completeness calculation
    - **Property 1: Completeness percentage is always between 0 and 100**
    - **Validates: Requirements 16.1-16.13**
  
  - [x] 3.4 Implement privacy settings management
    - Create privacy controls for each optional field
    - Support privacy levels: public, private, platform_only
    - Default all fields to platform_only
    - Apply privacy filters to profile API responses
    - _Requirements: 18.1-18.8_
  
  - [ ]* 3.5 Write unit tests for privacy controls
    - Test privacy level enforcement
    - Test default privacy settings
    - Test privacy filter application
    - _Requirements: 18.1-18.8_

- [x] 4. Implement data validation layer
  - [x] 4.1 Create field validators
    - Mobile number: International format using libphonenumber-js
    - 10-digit input: Validate as Indian (starts with 6-9), normalize to +91
    - Full international: Validate according to country-specific rules
    - Name: Unicode letters, spaces, 2-100 characters
    - Location: GPS coordinates within global boundaries (-90 to 90 lat, -180 to 180 lon)
    - Farm size: Positive number 0.1-10000
    - Language: Supported languages list
    - _Requirements: 17.1-17.12, 36.1-36.12_
  
  - [ ]* 4.2 Write property tests for validators
    - **Property 2: Valid inputs always pass validation**
    - **Property 3: Invalid inputs always fail with descriptive errors**
    - **Validates: Requirements 17.1-17.12**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Account Lockout Protection
  - [ ] 6.1 Add lockout fields to user schema
    - Add failedLoginAttempts field (number, default 0)
    - Add lockedUntil field (Date, optional)
    - Add lastLoginAt field (Date, optional)
    - Create database migration
    - _Requirements: 24A.1-24A.10_
  
  - [ ] 6.2 Implement failed login tracking
    - Track failed PIN login attempts
    - Track failed biometric login attempts
    - Increment counter on each failure
    - Reset counter on successful login
    - _Requirements: 24A.1-24A.2, 24A.5-24A.6_
  
  - [ ] 6.3 Implement account lockout logic
    - Lock account after 3 failed attempts
    - Set lockout duration to 30 minutes
    - Store lockout timestamp
    - Return clear error message with remaining time
    - _Requirements: 24A.1-24A.4_
  
  - [ ] 6.4 Implement auto-unlock mechanism
    - Check lockout expiration on login attempt
    - Auto-unlock if lockout period expired
    - Clear lockedUntil timestamp
    - _Requirements: 24A.4_
  
  - [ ] 6.5 Allow OTP login when locked
    - Bypass lockout check for OTP authentication
    - Enable account recovery via OTP
    - Reset failed attempts on successful OTP login
    - _Requirements: 24A.8_
  
  - [ ] 6.6 Add lockout notifications
    - Send SMS when account is locked
    - Include lockout duration in message
    - Log lockout events for audit
    - _Requirements: 24A.9-24A.10_
  
  - [ ]* 6.7 Write tests for account lockout
    - Test lockout after 3 failed attempts
    - Test auto-unlock after 30 minutes
    - Test OTP bypass when locked
    - Test counter reset on success
    - _Requirements: 24A.1-24A.10_

- [ ] 7. Implement International Mobile Number Support
  - [ ] 7.1 Install and configure libphonenumber-js
    - Install libphonenumber-js package (v1.10+)
    - Configure for tree-shaking to minimize bundle size
    - _Requirements: 1.15, 36.2_
  
  - [ ] 7.2 Update mobile number validation service
    - Replace Indian-only validation with international support
    - Implement 10-digit → +91 normalization logic
    - Implement full international number validation
    - Extract country code from validated numbers
    - Return normalized E.164 format
    - _Requirements: 1.1-1.7, 36.1-36.4_
  
  - [ ] 7.3 Update database schema for country code
    - Add countryCode field to UserProfile schema (required, indexed)
    - Create migration script for existing users (default +91)
    - Ensure mobileNumber field stores E.164 format
    - Update schema documentation
    - _Requirements: 36.4, 36.8, 37.1_
  
  - [ ] 7.4 Update registration flow
    - Store normalized mobileNumber (E.164 format)
    - Store extracted countryCode
    - Update OTP sending to use full international number
    - Handle international SMS delivery errors
    - _Requirements: 1.7-1.10, 36.6-36.7, 36.11_
  
  - [ ] 7.5 Add country code selector to UI
    - Create country code dropdown component
    - Default to +91 (India) for primary market
    - Support country search by name or code
    - Display popular countries at top
    - Show format hints based on selected country
    - Validate input as user types
    - _Requirements: 37.4-37.9_
  
  - [ ] 7.6 Implement localized number display
    - Detect country code from stored number
    - Format numbers according to country standards
    - Add optional country flags next to numbers
    - _Requirements: 37.1-37.3, 37.10_
  
  - [ ] 7.7 Configure international SMS gateway
    - Update SMS gateway configuration for international support
    - Implement country-specific SMS delivery
    - Add retry logic for failed deliveries
    - Implement cost monitoring and rate limiting
    - _Requirements: 1.10, 36.6-36.7, 36.11-36.12_
  
  - [ ]* 7.8 Write tests for international mobile support
    - Test 10-digit Indian number validation and normalization
    - Test international number validation (UK, US, UAE, etc.)
    - Test invalid number rejection
    - Test country code extraction
    - Test E.164 format storage
    - Test localized display formatting
    - _Requirements: 1.1-1.15, 36.1-36.12, 37.1-37.10_

- [x] 8. Implement Contextual Prompt Engine
  - [x] 8.1 Create prompt opportunity detection
    - Monitor user interactions for missing profile fields
    - Implement field priority ranking (location: 100, name: 90, userType: 85, crops: 80, language: 70, farmSize: 60, picture: 50, bank: 40)
    - Determine highest priority missing field for prompting
    - _Requirements: 26.1-26.10, 27.1-27.6, 34.1-34.7_
  
  - [x] 8.2 Implement prompt frequency management
    - Track prompt dismissals with timestamps
    - Enforce 24-hour cooldown after dismissal
    - Mark field as user_declined after 3 dismissals
    - Limit to one prompt per user interaction
    - Prevent prompts within 5 minutes of last prompt
    - _Requirements: 26.3-26.6, 34.3_
  
  - [x] 8.3 Create prompt timing logic
    - Display prompts after successful interaction completion
    - Avoid prompts during active interactions
    - Avoid prompts during error conditions
    - Prioritize fields that unlock benefit incentives
    - _Requirements: 26.8-26.10, 34.1-34.7_
  
  - [ ]* 8.4 Write unit tests for prompt engine
    - Test prompt frequency limits
    - Test dismissal tracking
    - Test priority field selection
    - _Requirements: 26.1-26.10, 34.1-34.7_

- [x] 9. Implement Implicit Update Service
  - [x] 9.1 Create language detection
    - Integrate language detection API (AWS Comprehend or Google Cloud Translation)
    - Support Hindi, English, Punjabi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Odia
    - Update language_preference when confidence > 70%
    - Require 3 consecutive messages in new language to switch
    - _Requirements: 29.1-29.7_
  
  - [x] 9.2 Implement crop detection from images
    - Integrate crop detection service
    - Add crop to crops_grown when confidence > 80%
    - Prevent duplicate crop entries
    - Store crop with source metadata (image_upload, price_query, sale_post)
    - _Requirements: 28.1-28.8_
  
  - [x] 9.3 Create user type inference
    - Infer farmer when user posts crops for sale
    - Infer buyer when user inquires about purchasing
    - Set both when user exhibits both behaviors
    - Wait for 3 consistent behaviors before inferring
    - Prompt explicitly after 5 interactions if type unclear
    - _Requirements: 27.1-27.6, 33.1-33.6_
  
  - [ ]* 9.4 Write unit tests for implicit updates
    - Test language detection and switching logic
    - Test crop detection and deduplication
    - Test user type inference rules
    - _Requirements: 28.1-28.8, 29.1-29.7, 33.1-33.6_

- [x] 10. Implement location data collection
  - [x] 10.1 Create location capture service
    - Support GPS coordinate capture with accuracy metadata
    - Support manual location entry with validation
    - Integrate geocoding service for location validation
    - Store location with timestamp and type (gps/manual)
    - Set verification status based on capture method
    - _Requirements: 4.1-4.8, 5.1-5.6_
  
  - [ ]* 10.2 Write unit tests for location service
    - Test GPS coordinate validation
    - Test manual location validation
    - Test location storage with metadata
    - _Requirements: 4.1-4.8, 5.1-5.6_

- [x] 11. Implement Profile Picture Service
  - [x] 11.1 Create image upload and processing
    - Accept JPEG, PNG, WebP formats up to 5MB
    - Validate image format and size
    - Resize to 400x400 for storage
    - Generate 100x100 thumbnail
    - Store with unique filename in S3/Cloudinary
    - _Requirements: 19.1-19.7_
  
  - [x] 11.2 Integrate content moderation
    - Integrate AWS Rekognition or Clarifai
    - Check for inappropriate content before storage
    - Reject images that fail moderation
    - _Requirements: 19.1-19.11_
  
  - [x] 11.3 Implement profile picture management
    - POST /api/v1/profiles/{userId}/picture endpoint
    - Support camera capture and file upload
    - Update completion percentage by 10% on upload
    - Display default avatar when no picture set
    - Allow picture update and removal
    - Delete stored files on removal
    - _Requirements: 19.1-19.11_
  
  - [ ]* 11.4 Write unit tests for profile picture service
    - Test image validation
    - Test resize and thumbnail generation
    - Test file storage and deletion
    - _Requirements: 19.1-19.11_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement Farm Size Collection
  - [ ] 13.1 Create farm size prompt logic
    - Trigger prompt when user requests fertilizer/seed quantity advice
    - Accept farmSize in acres or hectares
    - Validate farmSize is positive number between 0.1 and 10000
    - Store with unit of measurement
    - _Requirements: 30.1-30.7_
  
  - [ ] 13.2 Implement farm size usage
    - Use farmSize to scale quantity-based recommendations
    - Allow users to update farmSize through profile settings
    - Increase profile completeness when farm size is added
    - _Requirements: 30.5-30.7_
  
  - [ ]* 13.3 Write unit tests for farm size
    - Test validation logic
    - Test unit conversion
    - Test recommendation scaling
    - _Requirements: 30.1-30.7_

- [ ] 14. Implement Profile Completion Display and Incentives
  - [ ] 14.1 Create profile completion banner
    - Display banner when completion < 80%
    - Show percentage as numeric value and progress bar
    - List top 3 missing high-value fields
    - Navigate to input interface on field click
    - Hide banner when completion >= 80%
    - Allow temporary dismissal (7 days)
    - _Requirements: 31.1-31.7_
  
  - [ ] 14.2 Implement completion incentives
    - Define feature unlocks at specific thresholds
    - 50%: Unlock personalized crop recommendations
    - 70%: Unlock weather alerts
    - 90%: Unlock payment features
    - Display locked features with clear messaging
    - Show required fields when accessing locked feature
    - Send notification when feature unlocked
    - _Requirements: 32.1-32.7_
  
  - [ ]* 14.3 Write unit tests for completion display
    - Test banner display conditions
    - Test feature locking logic
    - Test threshold-based unlocking
    - _Requirements: 31.1-31.7, 32.1-32.7_

- [ ] 15. Implement profile editing and verification
  - [ ] 15.1 Create profile editing interface
    - Display all profile fields with current values
    - Allow editing of all optional fields
    - Require re-verification for mobile number changes
    - Validate new values before saving
    - Reset verification status on verified field edits
    - Log all edits with timestamp and previous value
    - _Requirements: 14.1-14.8_
  
  - [ ] 15.2 Implement profile verification
    - Set mobile verification status after OTP
    - Set location verification based on GPS vs manual
    - Set crop verification when detected from images
    - Display verification badges in UI
    - _Requirements: 4.6, 5.4, 28.1-28.8_
  
  - [ ]* 15.3 Write unit tests for profile editing
    - Test field validation on edit
    - Test verification status reset
    - Test edit logging
    - _Requirements: 14.1-14.8_

- [ ] 16. Implement profile deletion and data export
  - [ ] 16.1 Create data export functionality
    - Generate JSON file with all profile fields
    - Include metadata (timestamps, privacy settings)
    - Complete export within 5 seconds
    - Deliver via download link
    - Log export requests
    - _Requirements: 20.1-20.6_
  
  - [ ] 16.2 Implement profile deletion
    - Display confirmation dialog with consequences
    - Mark account for deletion immediately
    - Anonymize mobile number on deletion request
    - Complete full deletion within 30 days
    - Retain transaction records per legal requirements
    - Send confirmation on completion
    - _Requirements: 21.1-21.7_
  
  - [ ]* 16.3 Write unit tests for deletion
    - Test immediate anonymization
    - Test transaction record retention
    - Test deletion confirmation
    - _Requirements: 21.1-21.7_

- [ ] 17. Implement mobile number change
  - [ ] 17.1 Create mobile number change flow
    - Require OTP verification on current mobile number
    - Require OTP verification on new mobile number
    - Validate new mobile number is not already registered
    - Update mobile number when both OTPs verified
    - Invalidate all existing sessions after change
    - Require user to log in again with new number
    - Log mobile number changes for security audit
    - _Requirements: 22.1-22.7_
  
  - [ ]* 17.2 Write unit tests for mobile number change
    - Test dual OTP verification
    - Test duplicate number prevention
    - Test session invalidation
    - _Requirements: 22.1-22.7_

- [ ] 18. Implement PIN reset
  - [ ] 18.1 Create PIN reset flow
    - Provide PIN reset function
    - Require OTP verification before reset
    - Allow user to set new PIN after OTP verified
    - Validate new PIN format (4-6 digits)
    - Hash and store new PIN
    - Log PIN reset events for security audit
    - _Requirements: 23.1-23.6_
  
  - [ ]* 18.2 Write unit tests for PIN reset
    - Test OTP requirement
    - Test PIN validation
    - Test PIN hashing
    - _Requirements: 23.1-23.6_

- [ ] 19. Implement audit logging
  - [ ] 19.1 Create audit logging service
    - Log all profile creation events
    - Log all profile update events with field names
    - Log all authentication events (success and failure)
    - Log all mobile number change events
    - Log all PIN reset events
    - Log all profile deletion requests
    - Store logs with timestamp, userId, and action type
    - Retain logs for at least 90 days
    - _Requirements: 25.1-25.8_
  
  - [ ]* 19.2 Write unit tests for audit logging
    - Test log creation for each event type
    - Test log retention
    - Test log query performance
    - _Requirements: 25.1-25.8_

- [ ] 20. Implement profile analytics
  - [ ] 20.1 Create profile analytics tracking
    - Track time to collect each field from registration
    - Track field collection source (explicit_prompt, implicit_update, manual_edit)
    - Calculate average completion percentage
    - Track prompt acceptance rates for each field
    - Track prompt dismissal rates for each field
    - Identify fields with low collection rates
    - Track correlation between profile completeness and user retention
    - _Requirements: 35.1-35.8_
  
  - [ ] 20.2 Implement analytics dashboards
    - Create product dashboard (completion trends, feature unlocks, engagement)
    - Create operations dashboard (system health, API performance, errors)
    - Provide analytics showing profile completion trends over time
    - _Requirements: 35.6_
  
  - [ ]* 20.3 Write integration tests for analytics
    - Test metric calculation accuracy
    - Test dashboard data aggregation
    - Test analytics query performance
    - _Requirements: 35.1-35.8_

- [ ] 21. Integration and API wiring
  - [ ] 21.1 Wire all services together
    - Connect Registration Service to Profile Manager
    - Connect Contextual Prompt Engine to user interaction events
    - Connect Implicit Update Service to Kisan Mitra and Marketplace
    - _Requirements: All integration requirements_
  
  - [ ] 21.2 Implement API gateway routing
    - Configure routes for all endpoints
    - Add authentication middleware
    - Add rate limiting
    - Add request logging
    - Add error handling middleware
    - _Requirements: All API requirements_
  
  - [ ]* 21.3 Write end-to-end integration tests
    - Test complete registration to profile completion flow
    - Test progressive data collection flow
    - Test privacy settings enforcement
    - _Requirements: All requirements_

- [ ] 22. Final checkpoint - Ensure all tests pass
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
- All profile fields have privacy controls with platform_only as default
- Gamification, trust scoring, and referrals are separate specs and NOT part of this user-profile-management spec
