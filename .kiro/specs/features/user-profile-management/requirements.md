# Requirements Document: User Authentication & Profile Management

## Introduction

The User Authentication & Profile Management system provides unified user authentication and comprehensive profile management for Bharat Mandi. It consolidates registration, authentication (OTP, PIN, biometric), session management, account security, and profile data management into a single, cohesive system. 

The system requires minimal mandatory information (name, mobile, location) at registration, then progressively collects optional profile data through contextual prompts and implicit updates during user interactions. This approach minimizes registration friction while building comprehensive user profiles over time.

**Note**: This spec consolidates the previous Auth spec and User Profile Management spec into a single unified specification to eliminate duplication and ensure consistency.

## Glossary

- **Profile_Manager**: The system component responsible for managing user profile data
- **Auth_Service**: The system component handling authentication (OTP, PIN, biometric)
- **Registration_Service**: The system component handling initial user registration
- **Contextual_Prompt_Engine**: The system component that determines when and what profile data to request
- **Implicit_Update_Service**: The system component that automatically updates profile fields from user interactions
- **Profile_Field**: A single data element in a user profile
- **Mandatory_Field**: A profile field that must be collected during registration (name, mobile, location)
- **Optional_Field**: A profile field that can be collected progressively (user_type, crops_grown, etc.)
- **OTP**: One-Time Password sent via SMS for verification
- **PIN**: Personal Identification Number (4-6 digits) for quick login
- **Biometric_Auth**: Authentication using device biometrics (fingerprint, face ID)
- **GPS_Location**: Location captured via device GPS with coordinates
- **Manual_Location**: Location entered as text by the user
- **Profile_Completeness**: Percentage indicating how much of the profile is filled
- **Privacy_Setting**: User-controlled configuration for data visibility
- **Session_Token**: JWT token for authenticated sessions
- **Contextual_Trigger**: An event or action that prompts the system to request specific profile data
- **User_Interaction**: Any action performed by a user (query, upload, transaction)
- **Prompt_Frequency_Limit**: Maximum number of times a specific prompt can be shown to a user
- **Derived_Field**: A profile field automatically populated from user interactions
- **E.164_Format**: International telephone numbering format (e.g., +919876543210, +447700900123)
- **Country_Code**: The international dialing prefix for a country (e.g., +91 for India, +44 for UK)
- **International_SMS_Gateway**: Service that sends SMS to mobile numbers worldwide
- **Account_Lockout**: Temporary account suspension after multiple failed login attempts
- **Failed_Login_Attempt**: An unsuccessful authentication attempt (PIN or biometric)
- **Lockout_Duration**: Time period during which a locked account cannot be accessed (30 minutes)
- **Brute_Force_Attack**: Systematic attempt to guess credentials through repeated login attempts

## Requirements

### Requirement 1: Mobile Number Registration

**User Story:** As a new user, I want to register with my mobile number from any country, so that I can create an account quickly.

#### Acceptance Criteria

1. THE Registration_Service SHALL accept mobile numbers in two formats: 10 digits (without country code) OR full international format with country code
2. THE Registration_Service SHALL normalize 10-digit numbers by prepending +91 (Indian default)
3. THE Registration_Service SHALL validate international numbers using E.164 format standards
4. THE Registration_Service SHALL support mobile numbers from all countries (not limited to India)
5. WHEN a 10-digit number is provided, THE Registration_Service SHALL validate it as an Indian mobile number (starts with 6-9)
6. WHEN a full international number is provided, THE Registration_Service SHALL validate it according to that country's format
7. THE Registration_Service SHALL store all mobile numbers in international E.164 format (e.g., +919876543210, +447700900123)
8. THE Registration_Service SHALL extract and store the country code separately for analytics and display purposes
9. WHEN a valid mobile number is provided, THE Registration_Service SHALL generate a 6-digit OTP
10. THE Registration_Service SHALL send the OTP via SMS to the provided mobile number using international SMS gateway
11. THE Registration_Service SHALL store the OTP with a 10-minute expiration time
12. THE Registration_Service SHALL allow a maximum of 3 OTP verification attempts
13. WHEN an invalid mobile number format is provided, THE Registration_Service SHALL return a descriptive error message indicating the specific validation failure
14. THE Registration_Service SHALL prevent duplicate registrations for the same mobile number
15. THE Registration_Service SHALL use a phone number validation library (e.g., libphonenumber) for accurate international validation

### Requirement 2: OTP Verification

**User Story:** As a new user, I want to verify my mobile number with an OTP, so that my account is secure.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept a mobile number and 6-digit OTP for verification
2. WHEN the OTP matches and is not expired, THE Auth_Service SHALL mark the mobile number as verified
3. WHEN the OTP is incorrect, THE Auth_Service SHALL increment the attempt counter
4. WHEN the attempt counter reaches 3, THE Auth_Service SHALL invalidate the OTP session
5. WHEN the OTP has expired, THE Auth_Service SHALL return an expiration error
6. THE Auth_Service SHALL allow users to request a new OTP after expiration or max attempts
7. WHEN OTP is successfully verified, THE Auth_Service SHALL proceed to the registration completion step

### Requirement 3: Complete Registration with Mandatory Fields

**User Story:** As a new user who has verified my mobile number, I want to provide my name and location, so that I can complete my registration.

#### Acceptance Criteria

1. AFTER OTP verification, THE Registration_Service SHALL prompt for mandatory fields: name and location
2. THE Registration_Service SHALL validate that name contains 2-100 characters
3. THE Registration_Service SHALL validate that name contains only Unicode letters, spaces, and common name characters
4. THE Registration_Service SHALL require location to be provided via GPS OR manual text entry
5. WHEN GPS location is provided, THE Registration_Service SHALL store coordinates (latitude, longitude) with accuracy metadata
6. WHEN manual location is provided, THE Registration_Service SHALL accept text input (minimum 3 characters)
7. THE Registration_Service SHALL store location with a timestamp and capture method (GPS or manual)
8. WHEN all mandatory fields are provided, THE Registration_Service SHALL create the user profile
9. THE Registration_Service SHALL set initial profile completeness to 40% after registration
10. THE Registration_Service SHALL generate a unique userId (UUID) for the new profile
11. THE Registration_Service SHALL return a session token (JWT) after successful registration

### Requirement 4: GPS Location Capture

**User Story:** As a user, I want to share my GPS location, so that I receive accurate location-based services.

#### Acceptance Criteria

1. THE Registration_Service SHALL provide a GPS capture option during registration
2. WHEN GPS permission is granted, THE Registration_Service SHALL capture current coordinates
3. THE Registration_Service SHALL store latitude and longitude with precision to 6 decimal places
4. THE Registration_Service SHALL store GPS accuracy metadata (in meters)
5. THE Registration_Service SHALL validate that coordinates are within India's geographic boundaries
6. THE Registration_Service SHALL mark GPS-captured locations with higher trust than manual entries
7. WHEN GPS capture fails, THE Registration_Service SHALL fall back to manual location entry
8. THE Registration_Service SHALL store the timestamp when location was captured

### Requirement 5: Manual Location Entry

**User Story:** As a user without GPS or who prefers not to share GPS, I want to enter my location manually, so that I can still complete registration.

#### Acceptance Criteria

1. THE Registration_Service SHALL provide a text input for manual location entry
2. THE Registration_Service SHALL accept location text with minimum 3 characters and maximum 200 characters
3. THE Registration_Service SHALL validate that location text is not empty or only whitespace
4. THE Registration_Service SHALL store manual location with a flag indicating it's user-entered
5. THE Registration_Service SHALL allow users to update their location later through profile settings
6. THE Registration_Service SHALL display a hint suggesting format: "Village/City, District, State"

### Requirement 6: Optional PIN Setup

**User Story:** As a registered user, I want to set up a PIN, so that I can log in quickly without waiting for OTP.

#### Acceptance Criteria

1. AFTER registration, THE Auth_Service SHALL offer optional PIN setup
2. THE Auth_Service SHALL accept PINs with 4-6 digits
3. THE Auth_Service SHALL validate that PIN contains only numeric characters
4. THE Auth_Service SHALL require PIN confirmation (enter twice)
5. THE Auth_Service SHALL hash the PIN before storage using bcrypt
6. THE Auth_Service SHALL not store the PIN in plain text
7. THE Auth_Service SHALL allow users to skip PIN setup and set it up later
8. THE Auth_Service SHALL allow users to change their PIN through profile settings
9. THE Auth_Service SHALL require OTP verification before changing an existing PIN

### Requirement 7: Optional Biometric Setup

**User Story:** As a registered user with a biometric-capable device, I want to enable biometric authentication, so that I can log in securely and conveniently.

#### Acceptance Criteria

1. AFTER registration, THE Auth_Service SHALL offer optional biometric setup
2. THE Auth_Service SHALL detect if the device supports biometric authentication
3. THE Auth_Service SHALL support fingerprint and face ID authentication
4. WHEN biometric is enabled, THE Auth_Service SHALL store a flag in the user profile
5. THE Auth_Service SHALL use device-native biometric APIs for authentication
6. THE Auth_Service SHALL allow users to skip biometric setup and enable it later
7. THE Auth_Service SHALL allow users to disable biometric authentication through settings
8. THE Auth_Service SHALL fall back to OTP/PIN if biometric authentication fails

### Requirement 8: Three Authentication Methods

**User Story:** As a user, I want to choose how I log in (OTP, PIN, or biometric), so that I can use the method most convenient for me.

#### Acceptance Criteria

1. THE Auth_Service SHALL support three authentication methods: OTP, PIN, and biometric
2. THE Auth_Service SHALL allow users to log in with OTP at any time (always available)
3. THE Auth_Service SHALL allow users to log in with PIN if they have set one up
4. THE Auth_Service SHALL allow users to log in with biometric if they have enabled it
5. THE Auth_Service SHALL display available authentication methods on the login screen
6. WHEN PIN login fails, THE Auth_Service SHALL offer OTP as fallback
7. WHEN biometric login fails, THE Auth_Service SHALL offer PIN or OTP as fallback
8. THE Auth_Service SHALL generate a session token (JWT) for successful authentication
9. THE Auth_Service SHALL set session token expiration to 30 days
10. THE Auth_Service SHALL allow users to have multiple active sessions

### Requirement 9: OTP Login

**User Story:** As a user, I want to log in with OTP, so that I can access my account even if I forget my PIN.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept a mobile number for OTP login
2. THE Auth_Service SHALL verify that the mobile number is registered
3. THE Auth_Service SHALL generate and send a 6-digit OTP
4. THE Auth_Service SHALL accept the OTP for verification
5. WHEN OTP is verified, THE Auth_Service SHALL create an authenticated session
6. THE Auth_Service SHALL return a session token (JWT) with user information
7. THE Auth_Service SHALL update the lastActiveAt timestamp in the user profile

### Requirement 10: PIN Login

**User Story:** As a user with a PIN, I want to log in quickly with my PIN, so that I don't have to wait for OTP.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept a mobile number and PIN for login
2. THE Auth_Service SHALL verify that the mobile number is registered
3. THE Auth_Service SHALL verify that the user has a PIN set up
4. THE Auth_Service SHALL compare the provided PIN with the stored hash
5. WHEN PIN matches, THE Auth_Service SHALL create an authenticated session
6. WHEN PIN doesn't match, THE Auth_Service SHALL return an error
7. THE Auth_Service SHALL limit PIN login attempts to 5 per 15 minutes
8. WHEN max attempts are exceeded, THE Auth_Service SHALL temporarily lock PIN login
9. THE Auth_Service SHALL return a session token (JWT) with user information

### Requirement 11: Biometric Login

**User Story:** As a user with biometric enabled, I want to log in with my fingerprint or face, so that I can access my account securely and quickly.

#### Acceptance Criteria

1. THE Auth_Service SHALL verify that the user has biometric authentication enabled
2. THE Auth_Service SHALL use device-native biometric APIs for authentication
3. WHEN biometric authentication succeeds, THE Auth_Service SHALL create an authenticated session
4. WHEN biometric authentication fails, THE Auth_Service SHALL offer PIN or OTP as fallback
5. THE Auth_Service SHALL return a session token (JWT) with user information
6. THE Auth_Service SHALL not store biometric data on the server
7. THE Auth_Service SHALL rely on device-level biometric verification

### Requirement 12: Session Management

**User Story:** As a user, I want my login session to persist, so that I don't have to log in repeatedly.

#### Acceptance Criteria

1. THE Auth_Service SHALL generate JWT tokens for authenticated sessions
2. THE Auth_Service SHALL set token expiration to 30 days
3. THE Auth_Service SHALL include userId, mobileNumber, and name in the token payload
4. THE Auth_Service SHALL validate tokens on protected API endpoints
5. THE Auth_Service SHALL refresh tokens automatically before expiration
6. THE Auth_Service SHALL allow users to log out and invalidate their session
7. THE Auth_Service SHALL support multiple concurrent sessions per user
8. THE Auth_Service SHALL update lastActiveAt timestamp on each authenticated request

### Requirement 13: Profile Viewing

**User Story:** As a user, I want to view my profile information, so that I can see what data is stored about me.

#### Acceptance Criteria

1. THE Profile_Manager SHALL provide an API endpoint to retrieve user profile
2. THE Profile_Manager SHALL return all profile fields for the authenticated user
3. THE Profile_Manager SHALL include profile completeness percentage
4. THE Profile_Manager SHALL include metadata (createdAt, updatedAt, lastActiveAt)
5. THE Profile_Manager SHALL apply privacy filters based on the requester's context
6. THE Profile_Manager SHALL not expose sensitive fields (PIN hash) in the response
7. THE Profile_Manager SHALL return profile picture URLs if available

### Requirement 14: Profile Editing

**User Story:** As a user, I want to edit my profile information, so that I can keep my data up to date.

#### Acceptance Criteria

1. THE Profile_Manager SHALL allow users to update optional fields at any time
2. THE Profile_Manager SHALL allow users to update name through profile settings
3. THE Profile_Manager SHALL allow users to update location through profile settings
4. THE Profile_Manager SHALL not allow direct mobile number changes (requires re-verification)
5. THE Profile_Manager SHALL validate all field updates before saving
6. WHEN a field is updated, THE Profile_Manager SHALL update the updatedAt timestamp
7. THE Profile_Manager SHALL recalculate profile completeness after updates
8. THE Profile_Manager SHALL log all profile edits with timestamp for audit purposes

### Requirement 15: Optional Profile Fields

**User Story:** As a user, I want to add optional information to my profile, so that I can receive personalized services.

#### Acceptance Criteria

1. THE Profile_Manager SHALL support optional field: userType (farmer, buyer, both)
2. THE Profile_Manager SHALL support optional field: cropsGrown (array of crop names)
3. THE Profile_Manager SHALL support optional field: farmSize (value and unit)
4. THE Profile_Manager SHALL support optional field: languagePreference
5. THE Profile_Manager SHALL support optional field: bankAccount (account number, IFSC, holder name)
6. THE Profile_Manager SHALL support optional field: profilePicture (URL)
7. THE Profile_Manager SHALL allow users to add optional fields at any time
8. THE Profile_Manager SHALL increase profile completeness when optional fields are added
9. THE Profile_Manager SHALL not require optional fields for core functionality

### Requirement 16: Profile Completeness Calculation

**User Story:** As a user, I want to see how complete my profile is, so that I understand what information I can still provide.

#### Acceptance Criteria

1. THE Profile_Manager SHALL calculate profile completeness as a percentage (0-100)
2. THE Profile_Manager SHALL assign mobileNumber (verified) a weight of 20%
3. THE Profile_Manager SHALL assign name a weight of 10%
4. THE Profile_Manager SHALL assign location a weight of 10%
5. THE Profile_Manager SHALL assign userType a weight of 15%
6. THE Profile_Manager SHALL assign cropsGrown (at least one) a weight of 15%
7. THE Profile_Manager SHALL assign languagePreference a weight of 10%
8. THE Profile_Manager SHALL assign farmSize a weight of 10%
9. THE Profile_Manager SHALL assign bankAccount a weight of 5%
10. THE Profile_Manager SHALL assign profilePicture a weight of 5%
11. WHEN any field is updated, THE Profile_Manager SHALL recalculate completeness within 1 second
12. THE Profile_Manager SHALL display completeness percentage in the user profile

### Requirement 17: Data Validation

**User Story:** As a system administrator, I want all profile data to be validated, so that we maintain data quality.

#### Acceptance Criteria

1. THE Profile_Manager SHALL validate mobileNumber is in valid E.164 international format
2. THE Profile_Manager SHALL validate Indian mobile numbers (10 digits) start with 6-9
3. THE Profile_Manager SHALL validate international mobile numbers according to their country's format rules
4. THE Profile_Manager SHALL validate name contains 2-100 characters
5. THE Profile_Manager SHALL validate name contains only Unicode letters, spaces, and common name characters
6. THE Profile_Manager SHALL validate location text is 3-200 characters
7. THE Profile_Manager SHALL validate GPS coordinates are within valid global boundaries (-90 to 90 latitude, -180 to 180 longitude)
8. THE Profile_Manager SHALL validate farmSize is a positive number with valid unit
9. THE Profile_Manager SHALL validate languagePreference is a supported language code
10. THE Profile_Manager SHALL validate bankAccount fields match the user's country banking standards
11. WHEN validation fails, THE Profile_Manager SHALL return specific error messages
12. THE Profile_Manager SHALL not store invalid data

### Requirement 18: Privacy Controls

**User Story:** As a user, I want to control what profile information is visible to others, so that I maintain my privacy.

#### Acceptance Criteria

1. THE Profile_Manager SHALL provide privacy settings for each optional field
2. THE Profile_Manager SHALL support three privacy levels: public, private, platform_only
3. WHEN set to private, THE Profile_Manager SHALL not display the field to other users
4. WHEN set to platform_only, THE Profile_Manager SHALL use the field internally but not display it
5. WHEN set to public, THE Profile_Manager SHALL display the field on the user's public profile
6. THE Profile_Manager SHALL default all fields to platform_only
7. THE Profile_Manager SHALL allow users to change privacy settings at any time
8. THE Profile_Manager SHALL always keep mobileNumber and location as platform_only (not public)

### Requirement 19: Profile Picture Management

**User Story:** As a user, I want to add a profile picture, so that my profile is more personalized.

#### Acceptance Criteria

1. THE Profile_Manager SHALL support profile picture upload in JPEG, PNG, and WebP formats
2. THE Profile_Manager SHALL accept profile pictures up to 5MB in size
3. THE Profile_Manager SHALL provide camera capture and file upload options
4. THE Profile_Manager SHALL validate image format and size before upload
5. THE Profile_Manager SHALL resize profile pictures to 400x400 pixels for storage
6. THE Profile_Manager SHALL generate a thumbnail at 100x100 pixels
7. THE Profile_Manager SHALL store images with unique filenames
8. WHEN a picture is uploaded, THE Profile_Manager SHALL increase completeness by 5%
9. THE Profile_Manager SHALL display a default avatar when no picture is set
10. THE Profile_Manager SHALL allow users to update or remove their picture
11. THE Profile_Manager SHALL delete old image files when a new picture is uploaded

### Requirement 20: Data Export

**User Story:** As a user, I want to export my profile data, so that I have a copy for my records.

#### Acceptance Criteria

1. THE Profile_Manager SHALL provide a data export function
2. WHEN export is requested, THE Profile_Manager SHALL generate a JSON file with all profile data
3. THE Profile_Manager SHALL include metadata (timestamps, privacy settings)
4. THE Profile_Manager SHALL complete export within 5 seconds
5. THE Profile_Manager SHALL deliver the export file via download
6. THE Profile_Manager SHALL log all export requests with timestamp

### Requirement 21: Profile Deletion

**User Story:** As a user, I want to delete my profile, so that I can exercise my right to be forgotten.

#### Acceptance Criteria

1. THE Profile_Manager SHALL provide a profile deletion function
2. WHEN deletion is requested, THE Profile_Manager SHALL display a confirmation dialog
3. WHEN confirmed, THE Profile_Manager SHALL mark the account for deletion immediately
4. THE Profile_Manager SHALL complete full data deletion within 30 days
5. THE Profile_Manager SHALL anonymize the mobile number immediately
6. THE Profile_Manager SHALL retain transaction records as required by law
7. THE Profile_Manager SHALL send a confirmation when deletion is complete

### Requirement 22: Mobile Number Change

**User Story:** As a user, I want to change my mobile number, so that I can update my contact information.

#### Acceptance Criteria

1. THE Profile_Manager SHALL require OTP verification on the current mobile number
2. THE Profile_Manager SHALL require OTP verification on the new mobile number
3. THE Profile_Manager SHALL validate that the new mobile number is not already registered
4. WHEN both OTPs are verified, THE Profile_Manager SHALL update the mobile number
5. THE Profile_Manager SHALL invalidate all existing sessions after mobile number change
6. THE Profile_Manager SHALL require the user to log in again with the new mobile number
7. THE Profile_Manager SHALL log mobile number changes for security audit

### Requirement 23: Password Reset (PIN Reset)

**User Story:** As a user who forgot my PIN, I want to reset it, so that I can regain access to quick login.

#### Acceptance Criteria

1. THE Auth_Service SHALL provide a PIN reset function
2. THE Auth_Service SHALL require OTP verification before PIN reset
3. WHEN OTP is verified, THE Auth_Service SHALL allow the user to set a new PIN
4. THE Auth_Service SHALL validate the new PIN format (4-6 digits)
5. THE Auth_Service SHALL hash and store the new PIN
6. THE Auth_Service SHALL log PIN reset events for security audit

### Requirement 24: Account Security

**User Story:** As a user, I want my account to be secure, so that my data is protected.

#### Acceptance Criteria

1. THE Auth_Service SHALL hash all PINs using bcrypt with salt
2. THE Auth_Service SHALL use HTTPS for all API communications
3. THE Auth_Service SHALL implement rate limiting on authentication endpoints
4. THE Auth_Service SHALL log all authentication attempts
5. THE Auth_Service SHALL detect and prevent brute force attacks
6. THE Auth_Service SHALL use JWT tokens with secure signing
7. THE Auth_Service SHALL not expose sensitive data in error messages
8. THE Auth_Service SHALL implement CORS policies for API security

### Requirement 24A: Account Lockout Protection

**User Story:** As a user, I want my account protected from brute force attacks with automatic lockout, so that unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN PIN login fails 3 consecutive times, THE Auth_Service SHALL lock the account for 30 minutes
2. WHEN biometric login fails 3 consecutive times, THE Auth_Service SHALL lock the account for 30 minutes
3. WHEN account is locked, THE Auth_Service SHALL return a clear error message indicating lockout duration
4. WHEN lockout period expires, THE Auth_Service SHALL automatically unlock the account
5. THE Auth_Service SHALL reset failed attempt counter on successful login
6. THE Auth_Service SHALL track failed attempts per authentication method separately
7. THE Auth_Service SHALL store lockout timestamp in user profile
8. THE Auth_Service SHALL allow OTP-based login even when account is locked (for account recovery)
9. THE Auth_Service SHALL log all account lockout events for security audit
10. THE Auth_Service SHALL notify users via SMS when their account is locked

### Requirement 25: Audit Logging

**User Story:** As a system administrator, I want to track user activities, so that I can monitor security and compliance.

#### Acceptance Criteria

1. THE Profile_Manager SHALL log all profile creation events
2. THE Profile_Manager SHALL log all profile update events with field names
3. THE Profile_Manager SHALL log all authentication events (success and failure)
4. THE Profile_Manager SHALL log all mobile number change events
5. THE Profile_Manager SHALL log all PIN reset events
6. THE Profile_Manager SHALL log all profile deletion requests
7. THE Profile_Manager SHALL store logs with timestamp, userId, and action type
8. THE Profile_Manager SHALL retain logs for at least 90 days


### Requirement 26: Progressive Data Collection Strategy

**User Story:** As a product manager, I want the system to collect profile data progressively through interactions, so that users are not overwhelmed with forms while we build complete profiles.

#### Acceptance Criteria

1. THE Contextual_Prompt_Engine SHALL identify opportunities to collect Optional_Fields during User_Interactions
2. WHEN a User_Interaction requires a missing Profile_Field, THE Contextual_Prompt_Engine SHALL prompt the user for that field
3. THE Contextual_Prompt_Engine SHALL limit prompts to one Profile_Field per User_Interaction
4. WHEN a user dismisses a prompt, THE Contextual_Prompt_Engine SHALL record the dismissal timestamp
5. THE Contextual_Prompt_Engine SHALL not re-prompt for the same Profile_Field within 24 hours of dismissal
6. WHEN a user dismisses the same prompt 3 times, THE Contextual_Prompt_Engine SHALL mark that field as user_declined
7. THE Profile_Manager SHALL prioritize collecting high-value fields (userType, cropsGrown) before low-value fields (farmSize)
8. THE Contextual_Prompt_Engine SHALL not display prompts during active User_Interactions
9. THE Contextual_Prompt_Engine SHALL display prompts after successful completion of a User_Interaction
10. THE Contextual_Prompt_Engine SHALL not display prompts if the user has received a prompt in the last 5 minutes

### Requirement 27: Contextual Prompts for User Type

**User Story:** As a user interacting with the marketplace, I want the system to ask about my role when relevant, so that I see appropriate features.

#### Acceptance Criteria

1. WHEN a user posts crops for sale, THE Contextual_Prompt_Engine SHALL prompt for userType if not set
2. WHEN a user inquires about purchasing crops, THE Contextual_Prompt_Engine SHALL prompt for userType if not set
3. THE Contextual_Prompt_Engine SHALL offer three options: farmer, buyer, both
4. IF userType cannot be inferred after 5 User_Interactions, THEN THE Contextual_Prompt_Engine SHALL explicitly ask the user
5. THE Profile_Manager SHALL use userType to customize the user interface and available features
6. THE Profile_Manager SHALL allow users to manually update userType through settings

### Requirement 28: Implicit Crop Detection and Updates

**User Story:** As a user uploading crop photos, I want the system to automatically understand what crops I grow, so that I receive relevant recommendations without manual data entry.

#### Acceptance Criteria

1. WHEN a user uploads a crop image, THE Implicit_Update_Service SHALL detect the crop type from the image
2. WHEN a crop type is detected with confidence above 80%, THE Implicit_Update_Service SHALL add it to the user's cropsGrown list
3. THE Implicit_Update_Service SHALL not add duplicate crop entries to cropsGrown
4. WHEN a user queries prices for a specific crop, THE Implicit_Update_Service SHALL add that crop to cropsGrown
5. WHEN a user posts a crop for sale, THE Implicit_Update_Service SHALL add that crop to cropsGrown
6. THE Profile_Manager SHALL store each crop entry with a timestamp and source (image_upload, price_query, sale_post)
7. THE Profile_Manager SHALL allow users to view and remove crops from their cropsGrown list
8. THE Profile_Manager SHALL increase profile completeness when crops are added

### Requirement 29: Language Preference Detection

**User Story:** As a user interacting in my preferred language, I want the system to remember my language choice, so that I have a consistent experience.

#### Acceptance Criteria

1. WHEN a user sends their first message, THE Implicit_Update_Service SHALL detect the language from the message text
2. THE Implicit_Update_Service SHALL support detection for Hindi, English, Punjabi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, and Odia
3. WHEN language is detected with confidence above 70%, THE Profile_Manager SHALL store it as languagePreference
4. THE Profile_Manager SHALL use the stored languagePreference for all subsequent system responses
5. WHEN a user switches language in a message, THE Implicit_Update_Service SHALL update languagePreference after 3 consecutive messages in the new language
6. THE Profile_Manager SHALL allow users to manually change languagePreference through settings
7. THE Profile_Manager SHALL increase profile completeness when language preference is set

### Requirement 30: Farm Size Collection

**User Story:** As a user receiving farming advice, I want to provide my farm size when relevant, so that I receive appropriately scaled recommendations.

#### Acceptance Criteria

1. WHEN a user requests advice about fertilizer quantities or seed amounts, THE Contextual_Prompt_Engine SHALL prompt for farmSize
2. THE Profile_Manager SHALL accept farmSize in acres or hectares
3. THE Profile_Manager SHALL validate that farmSize is a positive number between 0.1 and 10000
4. WHEN farmSize is provided, THE Profile_Manager SHALL store it with the unit of measurement
5. THE Profile_Manager SHALL use farmSize to scale all quantity-based recommendations
6. THE Profile_Manager SHALL allow users to update farmSize through profile settings
7. THE Profile_Manager SHALL increase profile completeness when farm size is added

### Requirement 31: Profile Completeness Display

**User Story:** As a user, I want to see my profile completion status prominently, so that I am motivated to complete my profile.

#### Acceptance Criteria

1. WHEN Profile_Completeness is below 80%, THE Profile_Manager SHALL display a profile completion banner
2. THE Profile_Manager SHALL show Profile_Completeness as a numeric value and visual progress bar
3. THE Profile_Manager SHALL list the top 3 missing high-value Profile_Fields in the banner
4. WHEN a user clicks on a missing Profile_Field, THE Profile_Manager SHALL navigate to the appropriate input interface
5. WHEN Profile_Completeness reaches 80% or above, THE Profile_Manager SHALL hide the completion banner
6. THE Profile_Manager SHALL allow users to dismiss the completion banner temporarily (hidden for 7 days)
7. THE Profile_Manager SHALL display profile completeness in the user dashboard

### Requirement 32: Completion Incentives

**User Story:** As a user, I want to understand what benefits I gain from completing my profile, so that I am motivated to provide additional information.

#### Acceptance Criteria

1. THE Profile_Manager SHALL define feature unlocks for specific Profile_Completeness thresholds
2. WHEN Profile_Completeness reaches 50%, THE Profile_Manager SHALL unlock personalized crop recommendations
3. WHEN Profile_Completeness reaches 70%, THE Profile_Manager SHALL unlock weather alerts
4. WHEN Profile_Completeness reaches 90%, THE Profile_Manager SHALL unlock payment features
5. THE Profile_Manager SHALL display locked features with clear messaging about required Profile_Completeness
6. WHEN a user attempts to access a locked feature, THE Profile_Manager SHALL show which Profile_Fields are needed
7. THE Profile_Manager SHALL send a notification when a new feature is unlocked

### Requirement 33: Implicit User Type Inference

**User Story:** As a user, I want the system to understand my role from my behavior, so that I don't have to explicitly state it.

#### Acceptance Criteria

1. WHEN a user posts crops for sale, THE Implicit_Update_Service SHALL infer userType as farmer
2. WHEN a user inquires about purchasing crops, THE Implicit_Update_Service SHALL infer userType as buyer
3. WHEN a user exhibits both selling and buying behaviors, THE Profile_Manager SHALL set userType as both
4. THE Implicit_Update_Service SHALL wait for 3 consistent behaviors before inferring userType
5. THE Profile_Manager SHALL allow users to override inferred userType through settings
6. THE Profile_Manager SHALL increase profile completeness when user type is inferred

### Requirement 34: Contextual Prompt Timing

**User Story:** As a user, I want profile prompts to appear at natural moments, so that they don't interrupt my workflow.

#### Acceptance Criteria

1. THE Contextual_Prompt_Engine SHALL not display prompts during active User_Interactions
2. THE Contextual_Prompt_Engine SHALL display prompts after successful completion of a User_Interaction
3. THE Contextual_Prompt_Engine SHALL not display prompts if the user has received a prompt in the last 5 minutes
4. THE Contextual_Prompt_Engine SHALL prioritize prompts for Profile_Fields that unlock features
5. THE Contextual_Prompt_Engine SHALL not display prompts during error conditions or failed interactions
6. WHEN multiple Profile_Fields could be prompted, THE Contextual_Prompt_Engine SHALL select the highest priority field
7. THE Contextual_Prompt_Engine SHALL track prompt frequency per user to avoid overwhelming them

### Requirement 35: Profile Analytics

**User Story:** As a product manager, I want to analyze profile completion patterns, so that I can optimize the progressive profiling strategy.

#### Acceptance Criteria

1. THE Profile_Manager SHALL track the time taken to collect each Profile_Field from registration
2. THE Profile_Manager SHALL track the source of each Profile_Field (explicit_prompt, implicit_update, manual_edit)
3. THE Profile_Manager SHALL calculate average Profile_Completeness across all users
4. THE Profile_Manager SHALL track prompt acceptance rates for each Profile_Field
5. THE Profile_Manager SHALL track prompt dismissal rates for each Profile_Field
6. THE Profile_Manager SHALL provide analytics dashboard showing profile completion trends over time
7. THE Profile_Manager SHALL identify Profile_Fields with low collection rates for optimization
8. THE Profile_Manager SHALL track correlation between profile completeness and user retention


### Requirement 36: International Mobile Number Support

**User Story:** As an international user, I want to register with my country's mobile number, so that I can use the platform from anywhere.

#### Acceptance Criteria

1. THE Registration_Service SHALL support mobile numbers from all countries worldwide
2. THE Registration_Service SHALL use a phone number validation library (e.g., libphonenumber-js) for accurate validation
3. THE Registration_Service SHALL validate phone numbers according to each country's specific format rules
4. THE Registration_Service SHALL extract and store the country code from international numbers
5. THE Registration_Service SHALL display mobile numbers in localized format based on the country code
6. THE Registration_Service SHALL support international SMS delivery through a global SMS gateway
7. THE Registration_Service SHALL handle SMS delivery failures gracefully with retry logic
8. THE Profile_Manager SHALL store the user's country code for localization and analytics purposes
9. THE Profile_Manager SHALL use country code to determine default language preference
10. THE Profile_Manager SHALL use country code to determine default currency and units
11. THE Auth_Service SHALL support OTP delivery to all international mobile numbers
12. THE Auth_Service SHALL handle international SMS costs and rate limiting appropriately

### Requirement 37: Country Code Detection and Display

**User Story:** As a user, I want my mobile number displayed in a familiar format, so that it's easy to recognize.

#### Acceptance Criteria

1. THE Profile_Manager SHALL detect the country code from the mobile number
2. THE Profile_Manager SHALL display mobile numbers in the format standard for that country
3. THE Profile_Manager SHALL show country flags next to mobile numbers (optional)
4. THE Profile_Manager SHALL provide a country code selector in the registration UI
5. THE Profile_Manager SHALL default the country code selector to +91 (India) for the primary market
6. THE Profile_Manager SHALL allow users to search for countries by name or code
7. THE Profile_Manager SHALL display popular countries at the top of the selector
8. THE Profile_Manager SHALL validate the mobile number format as the user types
9. THE Profile_Manager SHALL show format hints based on the selected country (e.g., "10 digits starting with 6-9" for India)
10. THE Profile_Manager SHALL store the country code separately from the mobile number for analytics
