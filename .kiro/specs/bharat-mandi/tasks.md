# Implementation Plan: Bharat Mandi

## Overview

This implementation plan breaks down the Bharat Mandi mobile platform into discrete, incremental coding tasks. The approach follows a bottom-up strategy, building core infrastructure first, then implementing individual features, and finally integrating everything into a cohesive application.

The platform uses React Native for cross-platform mobile development (iOS/Android), Node.js/Express for backend services, PostgreSQL for transactional data, MongoDB for document storage, and TensorFlow Lite for on-device AI.

## Tasks

- [ ] 1. Project Setup and Infrastructure
  - Initialize React Native project with TypeScript
  - Set up backend Node.js/Express project structure
  - Configure PostgreSQL and MongoDB databases
  - Set up development environment and build tools
  - Configure ESLint, Prettier, and TypeScript strict mode
  - _Requirements: All_

- [ ] 2. Core Data Models and Database Schema
  - [ ] 2.1 Define TypeScript interfaces for all core entities
    - Create User, Transaction, Listing, EscrowAccount, PhotoLogEntry interfaces
    - Create DigitalQualityCertificate, GradingResult, Location, BankAccount interfaces
    - Define enums for statuses, categories, and types
    - _Requirements: 1.4, 2.1, 3.1, 4.1, 5.2, 6.1, 7.3_
  
  - [ ] 2.2 Implement PostgreSQL schema
    - Create tables: users, transactions, escrow_accounts, listings, ratings, credibility_scores
    - Create tables: service_providers, logistics_orders, storage_bookings
    - Define foreign keys, indexes, and constraints
    - Write migration scripts
    - _Requirements: 5.2, 6.1, 7.3, 14.1_
  
  - [ ] 2.3 Implement MongoDB collections
    - Create collections: photo_logs, quality_certificates, price_predictions
    - Create collections: voice_queries, feedback_comments
    - Define schemas and indexes
    - _Requirements: 1.4, 3.1, 17.1, 18.4_
  
  - [ ] 2.4 Set up local SQLite for offline storage
    - Create tables: cached_listings, pending_sync_queue, local_photo_logs, user_profile
    - Create table: ai_models_metadata
    - _Requirements: 8.2, 8.3_

- [ ] 3. Authentication and User Management
  - [ ] 3.1 Implement user registration with OTP verification
    - Create registration API endpoint
    - Integrate SMS/OTP service
    - Implement mobile number validation
    - Store user data with encryption
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 3.2 Write property test for OTP verification requirement
    - **Property 13: OTP Verification Requirement**
    - **Validates: Requirements 5.1**
  
  - [ ] 3.3 Implement login with PIN and biometric authentication
    - Create login API endpoint
    - Implement PIN validation
    - Integrate React Native biometric authentication
    - Generate and manage JWT tokens
    - _Requirements: 5.3_
  
  - [ ] 3.4 Implement account lockout mechanism
    - Track failed login attempts
    - Implement 30-minute lockout after 3 failures
    - Add unlock mechanism
    - _Requirements: 5.4_
  
  - [ ]* 3.5 Write property test for account lockout
    - **Property 14: Account Lockout After Failed Attempts**
    - **Validates: Requirements 5.4**
  
  - [ ] 3.6 Implement profile management
    - Create profile view and edit screens
    - Implement profile update API
    - Add re-verification for sensitive data changes
    - _Requirements: 5.5, 5.6, 5.7_

- [ ] 4. Fasal-Parakh (AI Quality Grading) Module
  - [ ] 4.1 Set up TensorFlow Lite integration
    - Add TensorFlow Lite dependencies to React Native
    - Create model loader and inference engine
    - Implement model update mechanism
    - _Requirements: 1.5_
  
  - [ ] 4.2 Implement image capture interface
    - Create camera component with React Native Camera
    - Add image preprocessing (resize, normalize)
    - Implement image quality checks
    - _Requirements: 1.1_
  
  - [ ] 4.3 Implement grading analysis logic
    - Create analyzeImage function with TensorFlow Lite inference
    - Implement size, shape, color, and defect analysis
    - Assign grade (A/B/C) based on evaluation metrics
    - Return GradingResult with all required fields
    - _Requirements: 1.2, 1.3_
  
  - [ ]* 4.4 Write property test for grading completeness
    - **Property 1: Grading Analysis Completeness**
    - **Validates: Requirements 1.2, 1.3**
  
  - [ ]* 4.5 Write property test for grading performance
    - **Property 4: Grading Performance Bound**
    - **Validates: Requirements 1.1**
  
  - [ ]* 4.6 Write property test for offline grading
    - **Property 3: Offline Grading Capability**
    - **Validates: Requirements 1.5**
  
  - [ ] 4.7 Implement Digital Quality Certificate generation
    - Create generateCertificate function
    - Include grade, timestamp, GPS coordinates, image hash, farmer ID
    - Generate unique certificate ID
    - Store certificate in MongoDB
    - _Requirements: 1.4_
  
  - [ ]* 4.8 Write property test for certificate completeness
    - **Property 2: Certificate Generation Completeness**
    - **Validates: Requirements 1.4**
  
  - [ ] 4.9 Implement grading UI screens
    - Create camera screen with capture button
    - Create analysis progress screen
    - Create results screen showing grade and certificate
    - Add option to list produce with certificate
    - _Requirements: 1.6, 1.7_
  
  - [ ]* 4.10 Write unit tests for grading edge cases
    - Test corrupted images
    - Test unsupported produce types
    - Test low confidence scenarios
    - _Requirements: 1.2, 1.3_

- [ ] 5. Checkpoint - Core Grading Feature Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Digital Mandi (Marketplace) Module
  - [ ] 6.1 Implement listing creation
    - Create listing form UI
    - Implement createListing API endpoint
    - Validate required fields (produce type, quantity, price, certificate)
    - Generate unique listing ID
    - Publish to marketplace
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 6.2 Write property test for listing ID uniqueness
    - **Property 15: Listing ID Uniqueness**
    - **Validates: Requirements 6.2**
  
  - [ ] 6.3 Implement search and filter functionality
    - Create search UI with filter options
    - Implement searchListings API endpoint
    - Filter by produce type, location, quality grade, price range, availability date
    - Sort results by rating
    - _Requirements: 6.3, 6.8_
  
  - [ ]* 6.4 Write property test for search filter correctness
    - **Property 16: Search Filter Correctness**
    - **Validates: Requirements 6.3**
  
  - [ ]* 6.5 Write property test for inactive listing exclusion
    - **Property 17: Inactive Listing Exclusion**
    - **Validates: Requirements 6.6**
  
  - [ ] 6.6 Implement listing detail view
    - Create listing detail screen
    - Display produce details, certificate, farmer rating, location
    - Add "Place Order" button for buyers
    - _Requirements: 6.4, 6.5_
  
  - [ ] 6.7 Implement listing status management
    - Create updateListingStatus function
    - Mark listings as sold/expired
    - Remove from active searches
    - Preserve certificate on updates
    - _Requirements: 6.6, 6.7_

- [ ] 7. Transaction Management Module
  - [ ] 7.1 Implement purchase request flow
    - Create "Place Order" UI
    - Implement initiate purchase request API
    - Send notification to farmer
    - _Requirements: 7.1, 7.2_
  
  - [ ] 7.2 Implement order acceptance/rejection
    - Create order notification UI for farmers
    - Implement accept/reject API endpoints
    - Create transaction record on acceptance
    - _Requirements: 7.3_
  
  - [ ]* 7.3 Write property test for transaction creation
    - **Property 18: Transaction Creation on Acceptance**
    - **Validates: Requirements 7.3**
  
  - [ ] 7.4 Implement transaction tracking
    - Create transaction detail screen
    - Display status, payment status, delivery timeline
    - Show transaction events timeline
    - _Requirements: 7.5_
  
  - [ ] 7.5 Implement transaction status updates
    - Create updateTransactionStatus function
    - Send notifications on status changes
    - Record events in transaction timeline
    - _Requirements: 7.6_
  
  - [ ] 7.6 Implement feedback and rating prompts
    - Show feedback form after transaction completion
    - Collect rating and comments
    - Submit to rating system
    - _Requirements: 7.7_

- [ ] 8. Smart Escrow Payment System
  - [ ] 8.1 Implement escrow account creation
    - Create createEscrow API endpoint
    - Generate unique escrow ID
    - Link to transaction
    - Set expiration time
    - _Requirements: 2.1_
  
  - [ ] 8.2 Integrate payment gateway
    - Add UPI/NEFT payment integration
    - Implement depositFunds function
    - Lock funds in nodal account
    - Send confirmation notifications
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 8.3 Write property test for fund immutability
    - **Property 5: Escrow Fund Immutability**
    - **Validates: Requirements 2.2**
  
  - [ ] 8.4 Implement delivery validation
    - Create delivery photo capture UI
    - Implement validateDelivery function
    - Use Fasal-Parakh to compare delivery photo with original certificate
    - Calculate quality match percentage
    - _Requirements: 2.5, 2.6_
  
  - [ ]* 8.5 Write property test for grading consistency
    - **Property 6: Grading Consistency**
    - **Validates: Requirements 2.6**
  
  - [ ] 8.6 Implement automatic fund release
    - Create releaseFunds function
    - Auto-approve if quality match >90%
    - Release funds within 1 hour
    - Send notifications to both parties
    - _Requirements: 2.7, 2.9_
  
  - [ ]* 8.7 Write property test for fund release timing
    - **Property 7: Automatic Fund Release Timing**
    - **Validates: Requirements 2.7**
  
  - [ ] 8.8 Implement dispute handling
    - Create initiateDispute function
    - Freeze escrow funds
    - Collect evidence from both parties
    - Flag for manual review if match 70-90%
    - Auto-dispute if match <70%
    - _Requirements: 2.8, 12.1, 12.2_
  
  - [ ]* 8.9 Write property test for dispute freezing escrow
    - **Property 25: Dispute Freezes Escrow**
    - **Validates: Requirements 12.1**

- [ ] 9. Checkpoint - Core Transaction Flow Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Photo-Log (Digital Diary) Module
  - [ ] 10.1 Implement photo capture with metadata
    - Create activity photo capture UI
    - Capture GPS coordinates and timestamp
    - Allow activity category tagging
    - Store locally in SQLite
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 10.2 Write property test for photo-log metadata completeness
    - **Property 8: Photo-Log Metadata Completeness**
    - **Validates: Requirements 3.1**
  
  - [ ] 10.3 Implement timeline viewer
    - Create timeline UI with chronological display
    - Show photos with metadata
    - Filter by activity category
    - _Requirements: 3.4_
  
  - [ ]* 10.4 Write property test for chronological ordering
    - **Property 9: Photo-Log Chronological Ordering**
    - **Validates: Requirements 3.4**
  
  - [ ] 10.5 Implement pattern analysis
    - Create analyzePatterns function
    - Identify optimal timing for activities
    - Suggest next activity with recommended date
    - _Requirements: 3.5_
  
  - [ ] 10.6 Implement transaction linkage
    - Link photo-log entries to completed transactions
    - Create bidirectional references
    - _Requirements: 3.6_
  
  - [ ]* 10.7 Write property test for transaction-photolog linkage
    - **Property 10: Transaction-PhotoLog Linkage**
    - **Validates: Requirements 3.6**
  
  - [ ] 10.8 Implement export functionality
    - Create export function for PDF and JSON formats
    - Include all photos and metadata
    - Format for bank loan/insurance applications
    - _Requirements: 3.7_

- [ ] 11. Credibility Score and Rating System
  - [ ] 11.1 Implement credibility score calculation
    - Create calculateScore function
    - Weight components: transaction history (35%), payment reliability (30%), farming consistency (20%), produce quality (15%)
    - Calculate overall score (300-900 range)
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 11.2 Implement score update mechanism
    - Create updateScore function
    - Trigger on transaction completion
    - Create history entry with timestamp
    - _Requirements: 4.1, 4.4_
  
  - [ ]* 11.3 Write property test for score update with audit trail
    - **Property 11: Credibility Score Update with Audit Trail**
    - **Validates: Requirements 4.1, 4.4**
  
  - [ ] 11.4 Implement baseline score initialization
    - Set baseline value for new users
    - Initialize on registration
    - _Requirements: 4.7_
  
  - [ ]* 11.5 Write property test for baseline initialization
    - **Property 12: Baseline Score Initialization**
    - **Validates: Requirements 4.7, 18.9**
  
  - [ ] 11.6 Implement score display
    - Create credibility score UI component
    - Show overall score and component breakdown
    - Display trend (improving/stable/declining)
    - _Requirements: 4.5_
  
  - [ ] 11.7 Implement lender report generation
    - Create generateLenderReport function
    - Include score, transaction history, photo-log data
    - Require farmer consent
    - _Requirements: 4.6_
  
  - [ ] 11.8 Implement implicit rating calculation
    - Create calculateImplicitRating function
    - Factor in payment speed, rejection rates, grading accuracy
    - Weight recent transactions more heavily
    - _Requirements: 18.1, 18.2, 18.3_
  
  - [ ]* 11.9 Write property test for implicit rating calculation
    - **Property 31: Implicit Rating Calculation**
    - **Validates: Requirements 18.1**
  
  - [ ] 11.10 Implement feedback collection
    - Create feedback form UI
    - Store verbose feedback
    - Allow responses to negative feedback
    - _Requirements: 18.4, 18.7_
  
  - [ ] 11.11 Implement combined rating display
    - Show implicit rating (70%) + explicit rating (30%)
    - Display rating breakdown
    - Show recent feedback
    - _Requirements: 18.5, 18.6_
  
  - [ ]* 11.12 Write property test for profile rating display
    - **Property 32: Profile Rating Display Completeness**
    - **Validates: Requirements 18.5**

- [ ] 12. Offline Functionality and Sync
  - [ ] 12.1 Implement offline detection
    - Use React Native NetInfo
    - Display offline indicator
    - Disable features requiring real-time verification
    - _Requirements: 8.5, 8.7_
  
  - [ ] 12.2 Implement local data caching
    - Cache listings, transaction history, user profile
    - Store in SQLite
    - _Requirements: 8.3_
  
  - [ ] 12.3 Implement sync queue
    - Queue pending operations (photo uploads, listing updates)
    - Process queue when connectivity restored
    - _Requirements: 8.4_
  
  - [ ] 12.4 Implement conflict resolution
    - Prioritize server data for transaction states
    - Merge photo-log entries (union)
    - _Requirements: 8.6_
  
  - [ ]* 12.5 Write property test for complete synchronization
    - **Property 19: Complete Data Synchronization**
    - **Validates: Requirements 8.4, 8.6**
  
  - [ ]* 12.6 Write property test for conflict resolution rules
    - **Property 20: Conflict Resolution Rules**
    - **Validates: Requirements 8.6**

- [ ] 13. Checkpoint - Core Features Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Kisan-Konnect (Ecosystem Integration)
  - [ ] 14.1 Implement service provider directory
    - Create provider database schema
    - Implement searchProviders API
    - Create directory UI with filters
    - Display provider ratings
    - _Requirements: 14.1, 14.5, 14.6_
  
  - [ ] 14.2 Implement logistics order creation
    - Create logistics order form UI
    - Implement createLogisticsOrder API
    - Auto-trigger on buyer order placement
    - Notify logistics provider
    - _Requirements: 14.2, 14.3, 14.7_
  
  - [ ]* 14.3 Write property test for order-logistics integration
    - **Property 27: Order-Logistics Integration**
    - **Validates: Requirements 14.2**
  
  - [ ] 14.4 Implement cold storage booking
    - Create storage booking form UI
    - Implement bookColdStorage API
    - Integrate storage costs into transaction pricing
    - _Requirements: 14.4, 14.8_
  
  - [ ] 14.5 Implement supplier connection
    - Create supplier search UI
    - Filter by input type, location, ratings
    - Enable direct communication
    - _Requirements: 14.5_

- [ ] 15. Kisan-Mitra (AI Voice Assistant)
  - [ ] 15.1 Integrate speech-to-text engine
    - Add speech recognition library
    - Support regional languages
    - Implement voice input UI
    - _Requirements: 15.1_
  
  - [ ] 15.2 Implement natural language understanding
    - Create query classification model
    - Support query types: prices, weather, best practices, platform help
    - Extract intent and entities
    - _Requirements: 15.3_
  
  - [ ] 15.3 Implement knowledge base
    - Create knowledge base for common queries
    - Store cached responses for offline use
    - _Requirements: 15.8_
  
  - [ ] 15.4 Implement text-to-speech engine
    - Add TTS library
    - Generate voice responses in user's language
    - _Requirements: 15.7_
  
  - [ ] 15.5 Implement query processing
    - Create processVoiceQuery function
    - Return response within 3 seconds
    - Escalate to human if confidence low
    - _Requirements: 15.2, 15.6_
  
  - [ ]* 15.6 Write property test for voice query response time
    - **Property 28: Voice Query Response Time**
    - **Validates: Requirements 15.2**
  
  - [ ] 15.7 Implement WhatsApp integration
    - Integrate WhatsApp Business API
    - Accept and respond to voice messages
    - _Requirements: 15.4_
  
  - [ ] 15.8 Implement phone call integration
    - Set up IVR system
    - Provide automated voice responses
    - _Requirements: 15.5_

- [ ] 16. P2P Input Marketplace
  - [ ] 16.1 Implement P2P listing creation
    - Create P2P listing form UI
    - Support seeds, saplings, manure, fertilizer, equipment
    - Allow price or exchange preference
    - _Requirements: 16.1, 16.2_
  
  - [ ] 16.2 Implement P2P search
    - Create search UI with proximity filter
    - Filter by input type, location, price
    - Prioritize geographically closer farmers
    - _Requirements: 16.3, 16.8_
  
  - [ ] 16.3 Implement P2P listing detail view
    - Display seller rating, distance, contact option
    - Enable direct communication
    - _Requirements: 16.4, 16.5_
  
  - [ ] 16.4 Implement exchange completion
    - Track P2P transaction completion
    - Allow rating from both parties
    - Support barter (no monetary transaction)
    - _Requirements: 16.6, 16.7_
  
  - [ ]* 16.5 Write property test for P2P rating availability
    - **Property 29: P2P Rating Availability**
    - **Validates: Requirements 16.6**

- [ ] 17. Price Prophecy (Price Prediction)
  - [ ] 17.1 Implement price forecasting model
    - Train LSTM model on historical price data
    - Include features: historical prices, seasonal patterns, weather, festivals
    - Generate 7-day rolling forecast
    - _Requirements: 17.1, 17.2_
  
  - [ ] 17.2 Implement prediction API
    - Create getPriceForecast endpoint
    - Return daily predictions with confidence intervals
    - Include prediction accuracy metrics
    - _Requirements: 17.1, 17.3_
  
  - [ ]* 17.3 Write property test for forecast completeness
    - **Property 30: Price Forecast Completeness**
    - **Validates: Requirements 17.1, 17.3**
  
  - [ ] 17.4 Implement price prediction UI
    - Create price chart with historical and predicted prices
    - Show confidence intervals
    - Display recommendation (sell now/wait/store)
    - _Requirements: 17.5, 17.8_
  
  - [ ] 17.5 Implement price alerts
    - Send alerts when favorable selling conditions detected
    - Suggest alternatives when price drops predicted
    - _Requirements: 17.4, 17.6, 17.7_

- [ ] 18. Notifications and Alerts
  - [ ] 18.1 Implement push notification service
    - Integrate Firebase Cloud Messaging
    - Create notification sending function
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 18.2 Write property test for notification timing
    - **Property 21: Notification Timing Bound**
    - **Validates: Requirements 9.1**
  
  - [ ] 18.3 Implement in-app notifications
    - Create notification center UI
    - Display notifications when push disabled
    - _Requirements: 9.6_
  
  - [ ] 18.4 Implement urgent notifications
    - Prioritize dispute notifications
    - Send to both parties and support team
    - _Requirements: 9.7_

- [ ] 19. Multi-Language Support
  - [ ] 19.1 Set up i18n framework
    - Add react-i18next library
    - Create translation files for Hindi, English, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada
    - _Requirements: 11.4_
  
  - [ ] 19.2 Implement language selection
    - Create language picker UI on first launch
    - Allow language change in settings
    - Update UI immediately without restart
    - _Requirements: 11.1, 11.3_
  
  - [ ]* 19.3 Write property test for language localization
    - **Property 24: Language Localization Completeness**
    - **Validates: Requirements 11.2**
  
  - [ ] 19.4 Localize produce categories and activities
    - Translate farming terminology
    - Use familiar local terms
    - _Requirements: 11.5_
  
  - [ ] 19.5 Implement bilingual certificates
    - Generate certificates in English + user's language
    - _Requirements: 11.6_
  
  - [ ] 19.6 Localize notifications
    - Send notifications in user's preferred language
    - _Requirements: 11.7_

- [ ] 20. Data Privacy and Security
  - [ ] 20.1 Implement data encryption
    - Encrypt personal and financial data at rest
    - Use AES-256 encryption
    - _Requirements: 10.1_
  
  - [ ]* 20.2 Write property test for data encryption
    - **Property 22: Data Encryption at Rest**
    - **Validates: Requirements 10.1**
  
  - [ ] 20.3 Implement secure data transmission
    - Use HTTPS with TLS 1.3
    - Implement certificate pinning
    - _Requirements: 10.2_
  
  - [ ] 20.4 Implement consent management
    - Create consent UI for data sharing
    - Require explicit consent before sharing with banks
    - _Requirements: 10.3_
  
  - [ ]* 20.5 Write property test for consent-based sharing
    - **Property 23: Consent-Based Data Sharing**
    - **Validates: Requirements 10.3**
  
  - [ ] 20.6 Implement data deletion
    - Create data deletion API
    - Remove personal data within 30 days
    - Preserve anonymized transaction records
    - _Requirements: 10.4_
  
  - [ ] 20.7 Implement suspicious activity detection
    - Monitor for unusual patterns
    - Suspend account and notify user
    - _Requirements: 10.5_
  
  - [ ] 20.8 Implement PCI-DSS compliance
    - Tokenize sensitive card data
    - Never store raw card numbers
    - _Requirements: 10.6_
  
  - [ ] 20.9 Implement audit logging
    - Log all data access events
    - Store logs securely
    - _Requirements: 10.7_

- [ ] 21. Dispute Resolution System
  - [ ] 21.1 Implement evidence collection
    - Create evidence submission UI
    - Collect photos, messages, transaction details
    - _Requirements: 12.2_
  
  - [ ] 21.2 Implement dispute assignment
    - Assign disputes to resolution team within 24 hours
    - Provide both parties access to evidence
    - _Requirements: 12.3, 12.4_
  
  - [ ] 21.3 Implement resolution execution
    - Release or refund funds based on decision
    - Complete within 48 hours
    - Update credibility scores
    - _Requirements: 12.5, 12.6_
  
  - [ ]* 21.4 Write property test for dispute resolution timing
    - **Property 26: Dispute Resolution Timing**
    - **Validates: Requirements 12.5**
  
  - [ ] 21.5 Implement escalation path
    - Allow disagreement with resolution
    - Escalate to senior review
    - _Requirements: 12.7_

- [ ] 22. Analytics and Insights
  - [ ] 22.1 Implement farmer analytics dashboard
    - Display total sales, average quality, rating trends
    - Show performance vs regional averages
    - _Requirements: 13.1, 13.4_
  
  - [ ] 22.2 Implement market trend analysis
    - Show price trends by produce type and region
    - Suggest high-demand produce
    - _Requirements: 13.2, 13.3_
  
  - [ ] 22.3 Implement photo-log analytics
    - Identify optimal timing patterns
    - Visualize activity cycles
    - _Requirements: 13.5_
  
  - [ ] 22.4 Implement data export
    - Allow export in CSV, PDF formats
    - Include all relevant data
    - _Requirements: 13.6_
  
  - [ ] 22.5 Implement proactive alerts
    - Send alerts on significant market changes
    - Notify about opportunities
    - _Requirements: 13.7_

- [ ] 23. Integration and Wiring
  - [ ] 23.1 Wire authentication to all protected routes
    - Add JWT middleware to API endpoints
    - Implement token refresh mechanism
    - _Requirements: 5.3_
  
  - [ ] 23.2 Wire grading to listing creation
    - Connect certificate generation to listing flow
    - Validate certificate before listing
    - _Requirements: 1.6, 6.1_
  
  - [ ] 23.3 Wire marketplace to transaction flow
    - Connect order placement to escrow creation
    - Link transaction to logistics
    - _Requirements: 7.1, 8.1, 14.2_
  
  - [ ] 23.4 Wire photo-log to credibility score
    - Feed photo-log data to score calculation
    - Update score on new activities
    - _Requirements: 4.2_
  
  - [ ] 23.5 Wire rating system to all user profiles
    - Display ratings on listings
    - Show ratings in search results
    - Update ratings after transactions
    - _Requirements: 6.4, 6.5, 18.5_
  
  - [ ] 23.6 Wire notifications to all events
    - Send notifications on all status changes
    - Integrate with push notification service
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_
  
  - [ ] 23.7 Wire offline sync to all modules
    - Connect sync queue to all data operations
    - Trigger sync on connectivity restore
    - _Requirements: 8.4_

- [ ] 24. Final Checkpoint - Complete System Integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 25. End-to-End Integration Tests
  - Test complete user journeys
  - Test farmer registration → grading → listing → sale → payment
  - Test buyer registration → search → order → payment → delivery
  - Test offline → online sync flow
  - Test dispute resolution flow
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: infrastructure → core features → integration
- Offline functionality is built into each module from the start
- Security and privacy are implemented throughout, not as an afterthought
