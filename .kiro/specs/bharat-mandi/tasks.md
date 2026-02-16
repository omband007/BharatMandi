# Implementation Plan: Bharat Mandi

## Overview

This implementation plan breaks down the Bharat Mandi mobile platform into discrete, incremental coding tasks. The platform addresses systemic issues in agricultural trade by providing AI-powered produce grading, secure escrow payments, digital farming records, ecosystem integration, and credit-building mechanisms for farmers.

The approach follows a bottom-up strategy: building core infrastructure first, implementing individual features incrementally, and finally integrating everything into a cohesive application. The platform uses React Native for cross-platform mobile development (iOS/Android), Node.js/Express for backend services, PostgreSQL for transactional data, MongoDB for document storage, and TensorFlow Lite for on-device AI.

### Key Features Covered

- **Core Platform** (Requirements 1-13): Fasal-Parakh grading, Smart Escrow, Photo-Log, Credibility Score, Marketplace, Authentication, Offline functionality, Notifications, Security, Multi-language, Disputes, Analytics
- **Ecosystem Integration** (Requirements 14-18): Kisan-Konnect, Kisan-Mitra voice assistant, P2P marketplace, Price Prophecy, Rating system
- **Advanced Features** (Requirements 19-30): Auctions, Disease diagnosis, Crop-AI advisor, Soil health, Smart alerts, Manure marketplace, Voice-to-ad, Government schemes, Route optimization, Live tracking, Traceability

### Technology Stack

- **Mobile**: React Native with TypeScript
- **Backend**: Node.js with Express
- **Databases**: PostgreSQL (transactional), MongoDB (documents), SQLite (offline)
- **AI/ML**: TensorFlow Lite for Edge AI
- **Cloud**: AWS (ECS, RDS, DocumentDB, S3, Lambda, SageMaker)
- **Testing**: Jest (unit tests), fast-check (property-based tests)

## Tasks

- [ ] 1. Project Setup and Infrastructure
  - Initialize React Native project with TypeScript
  - Set up backend Node.js/Express project structure
  - Configure PostgreSQL and MongoDB databases
  - Set up AWS cloud infrastructure (VPC, ECS, RDS, DocumentDB, S3)
  - Configure development environment and build tools
  - Configure ESLint, Prettier, and TypeScript strict mode
  - Set up CI/CD pipeline
  - _Requirements: All_


- [ ] 2. Core Data Models and Database Schema
  - [ ] 2.1 Define TypeScript interfaces for all core entities
    - Create User, Transaction, Listing, EscrowAccount, PhotoLogEntry interfaces
    - Create DigitalQualityCertificate, GradingResult, Location, BankAccount interfaces
    - Create AuctionListing, Bid, DiseaseD iagnosis, SoilTestReport interfaces
    - Create ManureListing, MaturityTestResult, TraceabilityRecord interfaces
    - Define enums for statuses, categories, and types
    - _Requirements: 1.4, 2.1, 3.1, 4.1, 5.2, 6.1, 7.3, 19.1, 20.2, 22.1, 24.1, 25.3, 30.1_
  
  - [ ] 2.2 Implement PostgreSQL schema
    - Create tables: users, transactions, escrow_accounts, listings, ratings, credibility_scores
    - Create tables: service_providers, logistics_orders, storage_bookings, auction_listings, bids
    - Create tables: government_schemes, scheme_applications, route_optimizations, vehicle_tracking
    - Define foreign keys, indexes, and constraints
    - Write migration scripts
    - _Requirements: 5.2, 6.1, 7.3, 14.1, 19.1, 27.1, 28.1, 29.1_
  
  - [ ] 2.3 Implement MongoDB collections
    - Create collections: photo_logs, quality_certificates, price_predictions
    - Create collections: voice_queries, feedback_comments, disease_diagnoses, soil_test_reports
    - Create collections: smart_alerts, traceability_records, ad_listings
    - Define schemas and indexes
    - _Requirements: 1.4, 3.1, 17.1, 18.4, 20.2, 22.1, 23.1, 30.1_
  
  - [ ] 2.4 Set up local SQLite for offline storage
    - Create tables: cached_listings, pending_sync_queue, local_photo_logs, user_profile
    - Create tables: ai_models_metadata, cached_certificates, offline_activities
    - _Requirements: 8.2, 8.3_


- [ ] 3. Authentication and User Management
  - [ ] 3.1 Implement user registration with OTP verification
    - Create registration API endpoint
    - Integrate SMS/OTP service (AWS Pinpoint)
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
    - Download and bundle initial grading model (<50MB)
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
  
  - [ ]* 4.7 Write property test for grading consistency
    - **Property 6: Grading Consistency**
    - **Validates: Requirements 2.6**
  
  - [ ] 4.8 Implement Digital Quality Certificate generation
    - Create generateCertificate function
    - Include grade, timestamp, GPS coordinates, image hash, farmer ID
    - Generate unique certificate ID
    - Store certificate in MongoDB
    - _Requirements: 1.4_
  
  - [ ]* 4.9 Write property test for certificate completeness
    - **Property 2: Certificate Generation Completeness**
    - **Validates: Requirements 1.4**
  
  - [ ] 4.10 Implement grading UI screens
    - Create camera screen with capture button
    - Create analysis progress screen
    - Create results screen showing grade and certificate
    - Add option to list produce with certificate
    - _Requirements: 1.6, 1.7_
  
  - [ ]* 4.11 Write unit tests for grading edge cases
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
    - Implement initiatePurchaseRequest API
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
    - Add UPI/NEFT payment integration (Razorpay/Paytm)
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
  
  - [ ] 8.5 Implement automatic fund release
    - Create releaseFunds function
    - Auto-approve if quality match >90%
    - Release funds within 1 hour
    - Send notifications to both parties
    - _Requirements: 2.7, 2.9_
  
  - [ ]* 8.6 Write property test for fund release timing
    - **Property 7: Automatic Fund Release Timing**
    - **Validates: Requirements 2.7**
  
  - [ ] 8.7 Implement dispute handling
    - Create initiateDispute function
    - Freeze escrow funds
    - Collect evidence from both parties
    - Flag for manual review if match 70-90%
    - Auto-dispute if match <70%
    - _Requirements: 2.8, 12.1, 12.2_
  
  - [ ]* 8.8 Write property test for dispute freezing escrow
    - **Property 25: Dispute Freezes Escrow**
    - **Validates: Requirements 12.1**

- [ ] 9. Checkpoint - Core Transaction Flow Complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 10. Photo-Log (Digital Diary) Module
  - [ ] 10.1 Implement photo capture with metadata
    - Create activity photo capture UI
    - Capture GPS coordinates and timestamp
    - Allow activity category tagging (tilling, sowing, spraying, fertigation, harvest)
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
  
  - [ ] 10.9 Implement cloud sync
    - Sync photo-log entries when connectivity available
    - Store in MongoDB
    - Upload photos to S3
    - _Requirements: 3.8, 3.9_


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
  
  - [ ] 11.13 Implement rating notification
    - Notify users when ratings change significantly
    - Explain contributing factors
    - _Requirements: 18.8_


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
  
  - [ ] 12.7 Implement offline AI model management
    - Store AI models locally
    - Update models when connectivity available
    - Fall back to previous version on failure
    - _Requirements: 1.5, 8.1, 8.2_

- [ ] 13. Checkpoint - Core Features Complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 14. Notifications and Alerts
  - [ ] 14.1 Implement push notification service
    - Integrate Firebase Cloud Messaging
    - Create notification sending function
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 14.2 Write property test for notification timing
    - **Property 21: Notification Timing Bound**
    - **Validates: Requirements 9.1**
  
  - [ ] 14.3 Implement in-app notifications
    - Create notification center UI
    - Display notifications when push disabled
    - _Requirements: 9.6_
  
  - [ ] 14.4 Implement urgent notifications
    - Prioritize dispute notifications
    - Send to both parties and support team
    - _Requirements: 9.7_

- [ ] 15. Multi-Language Support
  - [ ] 15.1 Set up i18n framework
    - Add react-i18next library
    - Create translation files for Hindi, English, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada
    - _Requirements: 11.4_
  
  - [ ] 15.2 Implement language selection
    - Create language picker UI on first launch
    - Allow language change in settings
    - Update UI immediately without restart
    - _Requirements: 11.1, 11.3_
  
  - [ ]* 15.3 Write property test for language localization
    - **Property 24: Language Localization Completeness**
    - **Validates: Requirements 11.2**
  
  - [ ] 15.4 Localize produce categories and activities
    - Translate farming terminology
    - Use familiar local terms
    - _Requirements: 11.5_
  
  - [ ] 15.5 Implement bilingual certificates
    - Generate certificates in English + user's language
    - _Requirements: 11.6_
  
  - [ ] 15.6 Localize notifications
    - Send notifications in user's preferred language
    - _Requirements: 11.7_


- [ ] 16. Data Privacy and Security
  - [ ] 16.1 Implement data encryption
    - Encrypt personal and financial data at rest
    - Use AES-256 encryption
    - _Requirements: 10.1_
  
  - [ ]* 16.2 Write property test for data encryption
    - **Property 22: Data Encryption at Rest**
    - **Validates: Requirements 10.1**
  
  - [ ] 16.3 Implement secure data transmission
    - Use HTTPS with TLS 1.3
    - Implement certificate pinning
    - _Requirements: 10.2_
  
  - [ ] 16.4 Implement consent management
    - Create consent UI for data sharing
    - Require explicit consent before sharing with banks
    - _Requirements: 10.3_
  
  - [ ]* 16.5 Write property test for consent-based sharing
    - **Property 23: Consent-Based Data Sharing**
    - **Validates: Requirements 10.3**
  
  - [ ] 16.6 Implement data deletion
    - Create data deletion API
    - Remove personal data within 30 days
    - Preserve anonymized transaction records
    - _Requirements: 10.4_
  
  - [ ] 16.7 Implement suspicious activity detection
    - Monitor for unusual patterns
    - Suspend account and notify user
    - _Requirements: 10.5_
  
  - [ ] 16.8 Implement PCI-DSS compliance
    - Tokenize sensitive card data
    - Never store raw card numbers
    - _Requirements: 10.6_
  
  - [ ] 16.9 Implement audit logging
    - Log all data access events
    - Store logs securely
    - _Requirements: 10.7_


- [ ] 17. Dispute Resolution System
  - [ ] 17.1 Implement evidence collection
    - Create evidence submission UI
    - Collect photos, messages, transaction details
    - _Requirements: 12.2_
  
  - [ ] 17.2 Implement dispute assignment
    - Assign disputes to resolution team within 24 hours
    - Provide both parties access to evidence
    - _Requirements: 12.3, 12.4_
  
  - [ ] 17.3 Implement resolution execution
    - Release or refund funds based on decision
    - Complete within 48 hours
    - Update credibility scores
    - _Requirements: 12.5, 12.6_
  
  - [ ]* 17.4 Write property test for dispute resolution timing
    - **Property 26: Dispute Resolution Timing**
    - **Validates: Requirements 12.5**
  
  - [ ] 17.5 Implement escalation path
    - Allow disagreement with resolution
    - Escalate to senior review
    - _Requirements: 12.7_

- [ ] 18. Analytics and Insights
  - [ ] 18.1 Implement farmer analytics dashboard
    - Display total sales, average quality, rating trends
    - Show performance vs regional averages
    - _Requirements: 13.1, 13.4_
  
  - [ ] 18.2 Implement market trend analysis
    - Show price trends by produce type and region
    - Suggest high-demand produce
    - _Requirements: 13.2, 13.3_
  
  - [ ] 18.3 Implement photo-log analytics
    - Identify optimal timing patterns
    - Visualize activity cycles
    - _Requirements: 13.5_
  
  - [ ] 18.4 Implement data export
    - Allow export in CSV, PDF formats
    - Include all relevant data
    - _Requirements: 13.6_
  
  - [ ] 18.5 Implement proactive alerts
    - Send alerts on significant market changes
    - Notify about opportunities
    - _Requirements: 13.7_


- [ ] 19. Kisan-Konnect (Ecosystem Integration)
  - [ ] 19.1 Implement service provider directory
    - Create provider database schema
    - Implement searchProviders API
    - Create directory UI with filters
    - Display provider ratings
    - _Requirements: 14.1, 14.5, 14.6_
  
  - [ ] 19.2 Implement logistics order creation
    - Create logistics order form UI
    - Implement createLogisticsOrder API
    - Auto-trigger on buyer order placement
    - Notify logistics provider
    - _Requirements: 14.2, 14.3, 14.7_
  
  - [ ]* 19.3 Write property test for order-logistics integration
    - **Property 27: Order-Logistics Integration**
    - **Validates: Requirements 14.2**
  
  - [ ] 19.4 Implement cold storage booking
    - Create storage booking form UI
    - Implement bookColdStorage API
    - Integrate storage costs into transaction pricing
    - _Requirements: 14.4, 14.8_
  
  - [ ] 19.5 Implement supplier connection
    - Create supplier search UI
    - Filter by input type, location, ratings
    - Enable direct communication
    - _Requirements: 14.5_

- [ ] 20. Kisan-Mitra (AI Voice Assistant)
  - [ ] 20.1 Integrate speech-to-text engine
    - Add speech recognition library
    - Support regional languages
    - Implement voice input UI
    - _Requirements: 15.1_
  
  - [ ] 20.2 Implement natural language understanding
    - Create query classification model
    - Support query types: prices, weather, best practices, platform help
    - Extract intent and entities
    - _Requirements: 15.3_
  
  - [ ] 20.3 Implement knowledge base
    - Create knowledge base for common queries
    - Store cached responses for offline use
    - _Requirements: 15.8_
  
  - [ ] 20.4 Implement text-to-speech engine
    - Add TTS library
    - Generate voice responses in user's language
    - _Requirements: 15.7_
  
  - [ ] 20.5 Implement query processing
    - Create processVoiceQuery function
    - Return response within 3 seconds
    - Escalate to human if confidence low
    - _Requirements: 15.2, 15.6_
  
  - [ ]* 20.6 Write property test for voice query response time
    - **Property 28: Voice Query Response Time**
    - **Validates: Requirements 15.2**
  
  - [ ] 20.7 Implement WhatsApp integration
    - Integrate WhatsApp Business API
    - Accept and respond to voice messages
    - _Requirements: 15.4_
  
  - [ ] 20.8 Implement phone call integration
    - Set up IVR system
    - Provide automated voice responses
    - _Requirements: 15.5_


- [ ] 21. P2P Input Marketplace
  - [ ] 21.1 Implement P2P listing creation
    - Create P2P listing form UI
    - Support seeds, saplings, manure, fertilizer, equipment
    - Allow price or exchange preference
    - _Requirements: 16.1, 16.2_
  
  - [ ] 21.2 Implement P2P search
    - Create search UI with proximity filter
    - Filter by input type, location, price
    - Prioritize geographically closer farmers
    - _Requirements: 16.3, 16.8_
  
  - [ ] 21.3 Implement P2P listing detail view
    - Display seller rating, distance, contact option
    - Enable direct communication
    - _Requirements: 16.4, 16.5_
  
  - [ ] 21.4 Implement exchange completion
    - Track P2P transaction completion
    - Allow rating from both parties
    - Support barter (no monetary transaction)
    - _Requirements: 16.6, 16.7_
  
  - [ ]* 21.5 Write property test for P2P rating availability
    - **Property 29: P2P Rating Availability**
    - **Validates: Requirements 16.6**

- [ ] 22. Price Prophecy (Price Prediction)
  - [ ] 22.1 Implement price forecasting model
    - Train LSTM model on historical price data
    - Include features: historical prices, seasonal patterns, weather, festivals
    - Generate 7-day rolling forecast
    - Deploy model to AWS SageMaker
    - _Requirements: 17.1, 17.2_
  
  - [ ] 22.2 Implement prediction API
    - Create getPriceForecast endpoint
    - Return daily predictions with confidence intervals
    - Include prediction accuracy metrics
    - _Requirements: 17.1, 17.3_
  
  - [ ]* 22.3 Write property test for forecast completeness
    - **Property 30: Price Forecast Completeness**
    - **Validates: Requirements 17.1, 17.3**
  
  - [ ] 22.4 Implement price prediction UI
    - Create price chart with historical and predicted prices
    - Show confidence intervals
    - Display recommendation (sell now/wait/store)
    - _Requirements: 17.5, 17.8_
  
  - [ ] 22.5 Implement price alerts
    - Send alerts when favorable selling conditions detected
    - Suggest alternatives when price drops predicted
    - _Requirements: 17.4, 17.6, 17.7_

- [ ] 23. Checkpoint - Ecosystem Features Complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 24. Auction and Bidding Engine
  - [ ] 24.1 Implement auction listing creation
    - Create auction mode toggle in listing form
    - Implement createAuction API endpoint
    - Set minimum bid price and duration
    - Display countdown timer on auction listings
    - _Requirements: 19.1, 19.2_
  
  - [ ] 24.2 Implement bid placement and validation
    - Create bid placement UI
    - Implement placeBid API endpoint
    - Validate bid is higher than current highest bid
    - Update real-time bid display
    - _Requirements: 19.3, 19.4_
  
  - [ ]* 24.3 Write property test for bid validation
    - **Property 33: Auction Bid Validation**
    - **Validates: Requirements 19.4**
  
  - [ ] 24.4 Implement bid notifications
    - Notify previous highest bidder when outbid
    - Notify farmer on each new bid
    - _Requirements: 19.5_
  
  - [ ] 24.5 Implement auction closure
    - Auto-close auction on expiration
    - Notify winning bidder and farmer
    - Create transaction with winning bid
    - Convert to fixed-price if no bids
    - _Requirements: 19.6, 19.7, 19.8_
  
  - [ ]* 24.6 Write property test for auction winner notification
    - **Property 34: Auction Winner Notification**
    - **Validates: Requirements 19.6**


- [ ] 25. Disease and Pest Diagnosis Module
  - [ ] 25.1 Integrate disease detection AI model
    - Add disease detection TensorFlow Lite model
    - Create model loader for offline use
    - Support 50+ common crop diseases
    - _Requirements: 20.1, 20.8_
  
  - [ ] 25.2 Implement crop image analysis
    - Create disease analysis UI
    - Implement analyzeCropImage function
    - Identify disease type, pest type, or nutrient deficiency
    - Return severity level and confidence score
    - _Requirements: 20.1, 20.2, 20.3_
  
  - [ ]* 25.3 Write property test for diagnosis completeness
    - **Property 35: Disease Diagnosis Completeness**
    - **Validates: Requirements 20.2, 20.3**
  
  - [ ] 25.4 Implement treatment recommendations
    - Create treatment knowledge base
    - Provide both chemical and organic options
    - Display product names, dosage, application methods
    - _Requirements: 20.4, 20.5_
  
  - [ ]* 25.5 Write property test for treatment availability
    - **Property 36: Treatment Recommendation Availability**
    - **Validates: Requirements 20.4**
  
  - [ ] 25.6 Implement supplier integration
    - Link treatments to connected suppliers
    - Enable direct purchase from diagnosis screen
    - _Requirements: 20.6_
  
  - [ ] 25.7 Implement Photo-Log integration
    - Save diagnosis to Photo-Log with disease tag
    - Link diagnosis to farming timeline
    - _Requirements: 20.7_


- [ ] 26. Crop-AI Advisor Module
  - [ ] 26.1 Implement multimodal query processing
    - Create text + image/video input UI
    - Implement processMultimodalQuery function
    - Support farmer's preferred language
    - _Requirements: 21.1, 21.2_
  
  - [ ] 26.2 Implement visual content analysis
    - Analyze photos and videos for crop context
    - Identify crop type and growth stage
    - Detect potential issues from visuals
    - _Requirements: 21.2, 21.3_
  
  - [ ]* 26.3 Write property test for multimodal analysis
    - **Property 37: Crop-AI Multimodal Analysis**
    - **Validates: Requirements 21.2, 21.3**
  
  - [ ] 26.4 Implement contextual recommendations
    - Provide location-specific advice
    - Consider current season and weather
    - Give actionable farming steps
    - _Requirements: 21.4, 21.5_
  
  - [ ] 26.5 Implement query type support
    - Support sowing, irrigation, fertilization, pest control, harvesting queries
    - Integrate with weather API
    - Integrate with Price Prophecy module
    - _Requirements: 21.5, 21.6, 21.7_
  
  - [ ] 26.6 Implement expert escalation
    - Detect low-confidence responses
    - Escalate to human agricultural experts
    - _Requirements: 21.8_


- [ ] 27. Soil Health Records Module
  - [ ] 27.1 Implement soil report upload and OCR
    - Create soil report upload UI
    - Integrate OCR engine for text extraction
    - Parse soil test parameters (pH, N, P, K, OC, EC)
    - _Requirements: 22.1, 22.2_
  
  - [ ]* 27.2 Write property test for soil data extraction
    - **Property 38: Soil Test Data Extraction**
    - **Validates: Requirements 22.2**
  
  - [ ] 27.3 Implement soil data storage
    - Store extracted parameters with test date and lab name
    - Link to farmer and field
    - _Requirements: 22.3_
  
  - [ ] 27.4 Implement soil health dashboard
    - Display current values for all parameters
    - Show historical trends with graphs
    - _Requirements: 22.4, 22.5_
  
  - [ ] 27.5 Implement deficiency detection
    - Highlight parameters outside optimal range
    - Suggest corrective actions
    - Recommend specific fertilizers and application rates
    - _Requirements: 22.6, 22.7_
  
  - [ ]* 27.6 Write property test for deficiency detection
    - **Property 39: Soil Deficiency Detection**
    - **Validates: Requirements 22.6, 22.7**
  
  - [ ] 27.7 Implement crop suggestions
    - Suggest crops suitable for current soil conditions
    - Consider season and market demand
    - _Requirements: 22.8_

- [ ] 28. Smart Alerts and Predictive Advisory
  - [ ] 28.1 Implement weather alert system
    - Integrate weather API
    - Detect significant weather changes
    - Send alerts with actionable suggestions
    - _Requirements: 23.1_
  
  - [ ] 28.2 Implement pest outbreak alerts
    - Track regional pest outbreaks
    - Send preventive alerts to nearby farmers
    - _Requirements: 23.2_
  
  - [ ] 28.3 Implement price fluctuation alerts
    - Monitor market price changes
    - Alert farmers with ready produce
    - _Requirements: 23.3_
  
  - [ ] 28.4 Implement power cut alerts
    - Integrate with power schedule data
    - Send voice call alerts for irrigation schedules
    - _Requirements: 23.4_
  
  - [ ] 28.5 Implement harvest reminders
    - Analyze Photo-Log activity patterns
    - Send reminders at optimal harvest time
    - _Requirements: 23.5_
  
  - [ ] 28.6 Implement government scheme alerts
    - Track scheme application windows
    - Notify eligible farmers when schemes open
    - _Requirements: 23.6_
  
  - [ ] 28.7 Implement multi-channel alert delivery
    - Send alerts via push notifications, SMS, and voice calls
    - Ensure at least two channels for critical alerts
    - Include actionable suggestions with each alert
    - _Requirements: 23.7, 23.8_
  
  - [ ]* 28.8 Write property test for multi-channel delivery
    - **Property 40: Multi-Channel Alert Delivery**
    - **Validates: Requirements 23.7**

- [ ] 29. Manure and Compost Marketplace
  - [ ] 29.1 Implement manure listing creation
    - Create manure listing form UI
    - Support cow, buffalo, poultry, goat, mixed types
    - Require photos and optional maturity test results
    - _Requirements: 24.1, 24.2_
  
  - [ ] 29.2 Implement manure search
    - Create search UI with filters
    - Filter by type, location, quantity, price
    - Prioritize geographically closer suppliers
    - _Requirements: 24.3, 24.8_
  
  - [ ]* 29.3 Write property test for proximity prioritization
    - **Property 41: Manure Listing Proximity Prioritization**
    - **Validates: Requirements 24.8**
  
  - [ ] 29.4 Implement manure listing detail view
    - Display seller rating, distance, estimated delivery cost
    - Show maturity test results if available
    - _Requirements: 24.4, 24.7_
  
  - [ ] 29.5 Implement manure purchase flow
    - Create purchase UI
    - Coordinate logistics for bulk transport
    - Allow quality verification before payment release
    - _Requirements: 24.5, 24.6_
  
  - [ ] 29.6 Implement manure transaction rating
    - Allow both parties to rate transaction
    - Collect feedback on quality and delivery
    - _Requirements: 24.7_

- [ ] 30. Manure Maturity Test Module
  - [ ] 30.1 Integrate maturity test AI model
    - Add manure analysis TensorFlow Lite model
    - Support offline analysis
    - _Requirements: 25.8_
  
  - [ ] 30.2 Implement manure analysis
    - Create maturity test UI
    - Analyze visual characteristics (color, texture, moisture)
    - Evaluate decomposition stage
    - _Requirements: 25.1, 25.2_
  
  - [ ] 30.3 Implement maturity classification
    - Classify as Fully Decomposed, Partially Decomposed, or Raw
    - Return confidence score and decomposition percentage
    - _Requirements: 25.3_
  
  - [ ]* 30.4 Write property test for maturity classification
    - **Property 42: Manure Maturity Classification**
    - **Validates: Requirements 25.3**
  
  - [ ] 30.5 Implement warnings and recommendations
    - Warn about raw manure crop damage
    - Suggest composting duration for raw/partial manure
    - _Requirements: 25.4_
  
  - [ ] 30.6 Implement maturity certificate generation
    - Generate certificate for fully decomposed manure
    - Include test date, confidence, and validity period
    - _Requirements: 25.5_
  
  - [ ] 30.7 Integrate with manure marketplace
    - Encourage maturity testing for listings
    - Display test results on listings
    - _Requirements: 25.6, 25.7_

- [ ] 31. Voice-to-Ad Generation Module
  - [ ] 31.1 Implement voice recording interface
    - Create voice recording UI
    - Support regional languages
    - Record farmer's item description
    - _Requirements: 26.1_
  
  - [ ] 31.2 Implement speech-to-text and information extraction
    - Transcribe voice input
    - Extract item type, quantity, price, condition
    - Identify missing information
    - _Requirements: 26.2, 26.3_
  
  - [ ] 31.3 Implement image enhancement
    - Capture photos of item
    - Analyze images to enhance description
    - Generate catchy title
    - _Requirements: 26.4_
  
  - [ ] 31.4 Implement ad preview and editing
    - Show generated ad preview
    - Allow farmer to edit before publishing
    - Categorize ad appropriately
    - _Requirements: 26.5, 26.7_
  
  - [ ] 31.5 Implement clarifying questions
    - Detect unclear or missing information
    - Ask clarifying questions
    - _Requirements: 26.8_
  
  - [ ]* 31.6 Write property test for ad generation completeness
    - **Property 43: Voice-to-Ad Generation Completeness**
    - **Validates: Requirements 26.2, 26.3**

- [ ] 32. Government Scheme Eligibility Engine
  - [ ] 32.1 Implement farmer profile analyzer
    - Collect farmer profile data (land size, crop type, location, income, category)
    - Store profile information
    - _Requirements: 27.1_
  
  - [ ] 32.2 Integrate government schemes database
    - Fetch active government schemes
    - Update scheme database regularly
    - _Requirements: 27.2_
  
  - [ ] 32.3 Implement eligibility matching algorithm
    - Match farmer profile against scheme criteria
    - Calculate match score for each scheme
    - Rank schemes by eligibility
    - _Requirements: 27.1, 27.2_
  
  - [ ] 32.4 Implement scheme display and details
    - Display eligible schemes with benefits and criteria
    - Show application deadline and estimated benefit
    - Highlight schemes with high match scores
    - _Requirements: 27.3, 27.4_
  
  - [ ] 32.5 Implement document requirement checker
    - Show required documents for each scheme
    - Allow uploading documents from Photo-Log or device
    - _Requirements: 27.5, 27.6_
  
  - [ ] 32.6 Implement application portal integration
    - Provide links to official application portals
    - Track application status
    - _Requirements: 27.7_
  
  - [ ] 32.7 Implement new scheme notifications
    - Notify eligible farmers when new schemes are announced
    - _Requirements: 27.8_
  
  - [ ]* 32.8 Write property test for eligibility matching
    - **Property 44: Scheme Eligibility Matching Accuracy**
    - **Validates: Requirements 27.1, 27.2**

- [ ] 33. Logistics Route Optimization Module
  - [ ] 33.1 Implement pooling opportunity detection
    - Identify multiple farmers in same region with produce ready
    - Check if pickups can be combined
    - _Requirements: 28.1_
  
  - [ ] 33.2 Implement route optimization algorithm
    - Apply traveling salesman algorithm
    - Consider road conditions, traffic, produce perishability, truck capacity, time windows
    - Generate optimal pickup sequence
    - _Requirements: 28.2, 28.3_
  
  - [ ] 33.3 Implement cost calculation and splitting
    - Calculate total cost for optimized route
    - Split costs among farmers proportionally
    - Show cost savings compared to individual transport
    - _Requirements: 28.8_
  
  - [ ] 33.4 Implement farmer notification and acceptance
    - Notify all farmers with pickup schedule
    - Collect acceptance from farmers
    - _Requirements: 28.4, 28.5_
  
  - [ ] 33.5 Implement navigation for drivers
    - Provide turn-by-turn navigation
    - Update pickup status at each location
    - _Requirements: 28.6_
  
  - [ ] 33.6 Implement transaction status updates
    - Update transaction status for all farmers after pickups complete
    - _Requirements: 28.7_
  
  - [ ]* 33.7 Write property test for route optimization
    - **Property 45: Route Optimization Efficiency**
    - **Validates: Requirements 28.3**

- [ ] 34. Live Vehicle Tracking Module
  - [ ] 34.1 Implement GPS tracking activation
    - Activate tracking when produce is loaded
    - Integrate with GPS tracker
    - _Requirements: 29.1_
  
  - [ ] 34.2 Implement real-time location display
    - Display vehicle location on map
    - Update location every 30 seconds
    - Show ETA, distance remaining, current speed
    - _Requirements: 29.2, 29.3_
  
  - [ ] 34.3 Implement route deviation detection
    - Monitor vehicle against planned route
    - Alert on significant deviations
    - _Requirements: 29.4_
  
  - [ ] 34.4 Implement extended stop alerts
    - Detect when vehicle stops for extended periods
    - Send alerts to relevant parties
    - _Requirements: 29.5_
  
  - [ ] 34.5 Implement arrival notifications
    - Notify farmer and buyer when vehicle reaches destination
    - _Requirements: 29.6_
  
  - [ ] 34.6 Implement tracking history
    - Store complete route with timestamps
    - Display tracking history on request
    - _Requirements: 29.7_
  
  - [ ] 34.7 Handle GPS signal loss
    - Show last known location when GPS signal is lost
    - Estimate position based on last known data
    - _Requirements: 29.8_
  
  - [ ]* 34.8 Write property test for tracking accuracy
    - **Property 46: Live Tracking Location Accuracy**
    - **Validates: Requirements 29.2**

- [ ] 35. End-to-End Traceability Module
  - [ ] 35.1 Implement traceability record creation
    - Create record when farmer starts new crop cycle
    - Include seed source and planting date
    - _Requirements: 30.1_
  
  - [ ] 35.2 Implement activity linking
    - Link Photo-Log entries to traceability record
    - Record fertilizer, pesticide, and water usage
    - _Requirements: 30.2, 30.3_
  
  - [ ] 35.3 Implement quality certificate linking
    - Link Digital Quality Certificate to traceability record
    - _Requirements: 30.4_
  
  - [ ] 35.4 Implement transaction linking
    - Add transaction details to traceability record
    - _Requirements: 30.5_
  
  - [ ] 35.5 Implement logistics information linking
    - Add logistics and tracking information to traceability record
    - _Requirements: 30.6_
  
  - [ ] 35.6 Implement traceability timeline display
    - Display complete traceability timeline with verifiable proof
    - Show all activities from seed to delivery
    - _Requirements: 30.7_
  
  - [ ] 35.7 Implement QR code generation
    - Generate QR code for traceability record
    - Enable verification via QR code scan
    - _Requirements: 30.8_
  
  - [ ]* 35.8 Write property test for traceability completeness
    - **Property 47: Traceability Record Completeness**
    - **Validates: Requirements 30.1, 30.2, 30.3, 30.4, 30.5, 30.6**

- [ ] 36. Final Integration and Testing
  - [ ] 36.1 Integrate all modules
    - Wire all modules together
    - Ensure seamless data flow between modules
    - Test end-to-end workflows
  
  - [ ] 36.2 Perform comprehensive testing
    - Run all unit tests
    - Run all property-based tests
    - Perform integration testing
    - Conduct user acceptance testing
  
  - [ ] 36.3 Optimize performance
    - Profile application performance
    - Optimize slow operations
    - Reduce memory usage
  
  - [ ] 36.4 Security audit
    - Review security implementations
    - Test encryption and authentication
    - Verify data privacy compliance
  
  - [ ] 36.5 Deployment preparation
    - Prepare production environment
    - Set up monitoring and logging
    - Create deployment documentation

