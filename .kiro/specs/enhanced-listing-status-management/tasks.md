# Implementation Plan: Enhanced Listing Status Management

## Overview

This implementation plan converts the enhanced listing status management design into actionable coding tasks. The feature replaces the `isActive` boolean field with an explicit `status` enum (ACTIVE, SOLD, EXPIRED, CANCELLED), implements automatic expiration based on produce categories and harvest dates, and synchronizes listing status with transaction completion events.

**Development Phase Simplifications:**
- No backward compatibility required (clean schema recreation)
- No data migration logic (DROP TABLE IF EXISTS and CREATE TABLE)
- No offline sync tasks (Requirement 13 removed)
- Direct schema replacement instead of ALTER TABLE migrations

## Tasks

- [x] 1. Set up produce categories infrastructure
  - [x] 1.1 Create produce categories database schema
    - Create `produce_categories` table with fields: id, name, expiry_period_hours, description, created_at, updated_at
    - Add CHECK constraint for expiry_period_hours (1-8760 hours)
    - Create index on name column
    - Implement for both PostgreSQL and SQLite
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [x] 1.2 Seed default produce categories
    - Insert four default categories: Leafy Greens (24h), Fruits (48h), Root Vegetables (168h), Grains (672h)
    - Include descriptions for each category
    - _Requirements: 6.5_
  
  - [x] 1.3 Implement CategoryManager service
    - Create `src/features/marketplace/category-manager.ts`
    - Implement createCategory(), updateCategory(), deleteCategory(), getCategories(), getCategoryById()
    - Add validation for expiry period range (1-8760 hours)
    - Prevent deletion of categories with existing listings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_
  
  - [ ]* 1.4 Write unit tests for CategoryManager
    - Test category creation with valid and invalid expiry periods
    - Test category update and deletion
    - Test prevention of deleting categories with listings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [x] 2. Update listings database schema
  - [x] 2.1 Create new listings schema with status column
    - Drop existing listings table (DROP TABLE IF EXISTS listings)
    - Create listings table with new schema including: status enum, listing_type enum, produce_category_id FK, expiry_date, sold_at, transaction_id, expired_at, cancelled_at, cancelled_by, payment_method_preference enum, sale_channel enum, sale_price, sale_notes
    - Add CHECK constraints for status-specific timestamps
    - Create indexes: idx_listings_status, idx_listings_expiry_date_status, idx_listings_category
    - Implement for both PostgreSQL (with ENUM types) and SQLite (with TEXT + CHECK)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 15.1, 15.2, 15.3, 15.4, 15.7, 18.1, 18.2, 18.3, 18.4, 19.6, 19.7_
  
  - [x] 2.2 Create listing_status_history table
    - Create table with fields: id, listing_id FK, previous_status, new_status, changed_at, triggered_by, trigger_type, metadata (JSONB/TEXT)
    - Add indexes for listing_id and changed_at
    - Add CHECK constraint for trigger_type (USER, SYSTEM, TRANSACTION)
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 3. Implement core status management
  - [x] 3.1 Create ListingStatusManager service
    - Create `src/features/marketplace/listing-status-manager.ts`
    - Implement transitionStatus() with validation and audit trail recording
    - Implement validateTransition() with state machine rules
    - Implement getListingsByStatus() with filtering support
    - Implement calculateExpiryDate() using harvest_date + category.expiry_period_hours
    - Implement recordStatusChange() for audit trail
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.2, 9.3, 11.1, 11.2, 16.1, 16.2, 16.5, 17.1_
  
  - [ ]* 3.2 Write property test for status transition validation
    - **Property 1: Valid transitions are always accepted**
    - **Validates: Requirements 11.1, 11.2**
    - Test that ACTIVE→SOLD, ACTIVE→EXPIRED, ACTIVE→CANCELLED, CANCELLED→ACTIVE are always allowed
    - Test that SOLD→* and EXPIRED→* are always rejected
  
  - [ ]* 3.3 Write property test for expiry date calculation
    - **Property 2: Expiry date calculation is consistent**
    - **Validates: Requirements 16.1, 16.2, 17.1**
    - Test that expiry_date = harvest_date + category.expiry_period_hours for all inputs
    - Test that calculation works for both past and future harvest dates
  
  - [ ]* 3.4 Write unit tests for ListingStatusManager
    - Test status transitions with valid and invalid states
    - Test audit trail recording
    - Test filtering by single and multiple statuses
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.2, 11.1, 11.2_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement automatic expiration service
  - [x] 5.1 Create ExpirationService
    - Create `src/features/marketplace/expiration.service.ts`
    - Implement checkExpiredListings() to query ACTIVE listings where expiry_date < NOW()
    - Implement expireListing() to transition status to EXPIRED and record expired_at
    - Implement scheduleExpirationCheck() to run hourly
    - Add logging for each expiration event
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ]* 5.2 Write property test for expiration logic
    - **Property 3: Listings expire when expiry_date passes**
    - **Validates: Requirements 4.1, 4.3**
    - Test that all ACTIVE listings with expiry_date < NOW() are transitioned to EXPIRED
    - Test that listings with expiry_date >= NOW() remain ACTIVE
  
  - [ ]* 5.3 Write unit tests for ExpirationService
    - Test expiration of listings past expiry date
    - Test that non-ACTIVE listings are not expired
    - Test scheduler setup and teardown
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Implement transaction-listing status synchronization
  - [x] 6.1 Create StatusSynchronizer service
    - Create `src/features/marketplace/status-synchronizer.ts`
    - Implement onTransactionCompleted() to transition listing to SOLD
    - Implement onTransactionCancelled() to return listing to ACTIVE (if expiry_date not passed) or EXPIRED
    - Implement onTransactionRejected() to return listing to ACTIVE or EXPIRED
    - Implement onEscrowRefunded() to return listing to ACTIVE or EXPIRED
    - Implement shouldReactivateListing() to check if expiry_date has passed
    - Add validation to only update ACTIVE listings on completion
    - Record transaction_id and sold_at timestamp
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 6.2 Write property test for transaction synchronization
    - **Property 4: Transaction completion always marks listing as SOLD**
    - **Validates: Requirements 5.1, 5.2**
    - Test that COMPLETED transaction always transitions ACTIVE listing to SOLD
    - Test that transaction_id and sold_at are always recorded
  
  - [ ]* 6.3 Write property test for cancellation reactivation
    - **Property 5: Cancelled transactions reactivate listings if not expired**
    - **Validates: Requirements 7.1, 7.2, 7.5**
    - Test that CANCELLED/REJECTED transactions return listing to ACTIVE if expiry_date >= NOW()
    - Test that CANCELLED/REJECTED transactions transition to EXPIRED if expiry_date < NOW()
  
  - [ ]* 6.4 Write unit tests for StatusSynchronizer
    - Test transaction completion with ACTIVE and non-ACTIVE listings
    - Test transaction cancellation before and after expiry
    - Test escrow refund scenarios
    - _Requirements: 5.1, 5.2, 5.5, 7.1, 7.2, 7.5_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update MarketplaceService for listing creation
  - [x] 8.1 Modify createListing() to require produce_category_id, listing_type, and payment_method_preference
    - Add validation for produce_category_id existence
    - Add validation for listing_type (PRE_HARVEST or POST_HARVEST)
    - Add validation for payment_method_preference (PLATFORM_ONLY, DIRECT_ONLY, BOTH)
    - Set default payment_method_preference to BOTH if not specified
    - Calculate expiry_date using CategoryManager and ListingStatusManager
    - Set initial status to ACTIVE
    - Record initial status change in audit trail
    - _Requirements: 1.2, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 16.1, 16.2, 16.5, 17.1, 17.2, 17.5, 18.1, 18.2, 18.3, 18.4, 18.6_
  
  - [ ]* 8.2 Write property test for listing creation
    - **Property 6: All new listings start with ACTIVE status**
    - **Validates: Requirements 1.2**
    - Test that createListing() always sets status to ACTIVE
    - Test that expiry_date is always calculated correctly
  
  - [ ]* 8.3 Write unit tests for listing creation
    - Test listing creation with valid category and listing type
    - Test rejection of invalid category
    - Test expiry date calculation for PRE_HARVEST and POST_HARVEST
    - _Requirements: 1.2, 15.1, 15.2, 17.1, 17.5_

- [x] 9. Implement manual listing cancellation
  - [x] 9.1 Add cancelListing() method to MarketplaceService
    - Validate listing is ACTIVE before cancellation
    - Check for active transactions (PAYMENT_LOCKED or later states)
    - Reject cancellation if active transaction exists
    - Transition status to CANCELLED using ListingStatusManager
    - Record cancelled_at timestamp and cancelled_by user ID
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 9.2 Write property test for cancellation validation
    - **Property 7: Cancellation is rejected for listings with active transactions**
    - **Validates: Requirements 8.4**
    - Test that listings with transactions in PAYMENT_LOCKED or later states cannot be cancelled
    - Test that listings with PENDING/ACCEPTED transactions can be cancelled
  
  - [ ]* 9.3 Write unit tests for listing cancellation
    - Test successful cancellation of ACTIVE listing
    - Test rejection of cancellation with active transaction
    - Test rejection of cancellation for non-ACTIVE listings
    - _Requirements: 8.1, 8.2, 8.4_

- [x] 9A. Implement manual sale confirmation
  - [x] 9A.1 Add markAsSold() method to ListingStatusManager
    - Accept listingId, saleChannel, and optional details (transactionId, salePrice, saleNotes)
    - Validate listing is ACTIVE before marking as sold
    - Validate saleChannel is PLATFORM_DIRECT or EXTERNAL
    - WHERE saleChannel is PLATFORM_DIRECT, require transactionId
    - WHERE saleChannel is EXTERNAL, allow optional salePrice and saleNotes
    - Check for active transactions (PAYMENT_LOCKED or later states)
    - Reject if active transaction exists with error message
    - Transition status to SOLD using transitionStatus()
    - Record sold_at timestamp, saleChannel, and optional details
    - Create audit trail entry with trigger_type='USER'
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10_
  
  - [ ]* 9A.2 Write property test for manual sale confirmation
    - **Property 9: Manual sale confirmation always transitions ACTIVE to SOLD**
    - **Validates: Requirements 19.5, 19.10**
    - Test that markAsSold() always transitions ACTIVE listings to SOLD
    - Test that markAsSold() rejects non-ACTIVE listings
  
  - [ ]* 9A.3 Write property test for active transaction blocking
    - **Property 10: Manual sale blocked when active transaction exists**
    - **Validates: Requirements 19.9**
    - Test that markAsSold() is rejected when transaction status >= PAYMENT_LOCKED
    - Test that markAsSold() succeeds when no active transaction or transaction status < PAYMENT_LOCKED
  
  - [ ]* 9A.4 Write unit tests for manual sale confirmation
    - Test successful manual sale with PLATFORM_DIRECT channel
    - Test successful manual sale with EXTERNAL channel
    - Test rejection when active transaction exists
    - Test rejection when listing is not ACTIVE
    - Test validation of required fields per channel
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.9, 19.10_

- [x] 9B. Implement direct payment transaction flow
  - [x] 9B.1 Add COMPLETED_DIRECT state to TransactionService
    - Update transaction status enum to include COMPLETED_DIRECT
    - Add completeDirectPayment() method to TransactionService
    - Validate transaction is in ACCEPTED state
    - Validate listing payment_method_preference allows direct payment (DIRECT_ONLY or BOTH)
    - Transition transaction from ACCEPTED to COMPLETED_DIRECT
    - Record completed_at timestamp
    - Skip PAYMENT_LOCKED, DISPATCHED, IN_TRANSIT, DELIVERED states
    - _Requirements: 20.1, 20.2, 20.3, 20.6, 20.7_
  
  - [x] 9B.2 Update StatusSynchronizer for COMPLETED_DIRECT
    - Add onTransactionCompletedDirect() method
    - Listen for transaction COMPLETED_DIRECT event
    - Validate listing is ACTIVE
    - Transition listing to SOLD with saleChannel='PLATFORM_DIRECT'
    - Record transaction_id and sold_at timestamp
    - Create audit trail entry
    - _Requirements: 20.4, 20.5, 5.1, 5.2, 5.3_
  
  - [ ]* 9B.3 Write property test for direct payment flow
    - **Property 11: COMPLETED_DIRECT always marks listing as SOLD**
    - **Validates: Requirements 20.4, 5.1, 5.2**
    - Test that COMPLETED_DIRECT transaction always transitions ACTIVE listing to SOLD
    - Test that saleChannel is always set to PLATFORM_DIRECT
  
  - [ ]* 9B.4 Write unit tests for direct payment flow
    - Test completeDirectPayment() with valid transaction
    - Test rejection when transaction not in ACCEPTED state
    - Test rejection when payment preference is PLATFORM_ONLY
    - Test StatusSynchronizer updates listing correctly
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [-] 10. Implement bulk status operations
  - [ ] 10.1 Add bulkUpdateStatus() to ListingStatusManager
    - Accept array of listing IDs and target status
    - Validate each transition independently
    - Return success/failure result for each listing
    - Continue processing on individual failures
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ]* 10.2 Write property test for bulk operations
    - **Property 8: Bulk operations process all listings independently**
    - **Validates: Requirements 14.2, 14.3, 14.5**
    - Test that failure of one listing doesn't stop processing of others
    - Test that results correctly report success/failure for each listing
  
  - [ ]* 10.3 Write unit tests for bulk operations
    - Test bulk update with all valid transitions
    - Test bulk update with mixed valid/invalid transitions
    - Test performance within 100ms per listing
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement sales analytics by channel
  - [ ] 12.1 Add getSalesByChannel() method to ListingStatusManager
    - Query SOLD listings grouped by sale_channel
    - Calculate count and percentage for each channel (PLATFORM_ESCROW, PLATFORM_DIRECT, EXTERNAL, UNKNOWN/NULL)
    - Calculate total revenue for PLATFORM_ESCROW sales (from transaction data)
    - Calculate reported revenue for EXTERNAL sales (from sale_price field)
    - Support date range filtering (startDate, endDate)
    - Support farmer filtering (optional farmerId parameter)
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_
  
  - [ ]* 12.2 Write property test for sales analytics
    - **Property 12: Channel percentages always sum to 100%**
    - **Validates: Requirements 21.2**
    - Test that sum of all channel percentages equals 100%
    - Test that counts sum to total sales
  
  - [ ]* 12.3 Write unit tests for sales analytics
    - Test sales count by channel
    - Test percentage calculations
    - Test revenue calculations for PLATFORM_ESCROW and EXTERNAL
    - Test date range filtering
    - Test handling of NULL sale_channel (legacy data)
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

- [ ] 13. Implement API endpoints for produce categories
  - [ ] 13.1 Create category routes and controller
    - POST /api/admin/produce-categories - Create category
    - GET /api/produce-categories - Get all categories
    - PATCH /api/admin/produce-categories/:id - Update category
    - DELETE /api/admin/produce-categories/:id - Delete category
    - Add admin authentication middleware for admin endpoints
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 13.2 Write integration tests for category endpoints
    - Test category CRUD operations
    - Test validation of expiry period range
    - Test prevention of deleting categories with listings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [ ] 14. Update listing API endpoints
  - [ ] 14.1 Update GET /api/marketplace/listings endpoint
    - Add status query parameter for filtering (single or comma-separated)
    - Update response to include: status, listing_type, produce_category_id, produce_category_name, expiry_date
    - Include status-specific fields: sold_at, transaction_id, expired_at, cancelled_at, cancelled_by
    - Default filter to status=ACTIVE if no status parameter provided
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  
  - [ ] 14.2 Create POST /api/marketplace/listings/:id/cancel endpoint
    - Validate user is the listing owner
    - Call MarketplaceService.cancelListing()
    - Return updated listing with CANCELLED status
    - Return error if listing has active transaction
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 14.3 Update POST /api/marketplace/listings endpoint
    - Add required fields: produce_category_id, listing_type, payment_method_preference
    - Validate produce_category_id exists
    - Validate listing_type is PRE_HARVEST or POST_HARVEST
    - Calculate and return expiry_date in response
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 16.1, 16.3, 16.6, 17.1, 17.2, 17.5, 18.1, 18.2, 18.3_
  
  - [ ] 14.4 Create POST /api/marketplace/listings/:id/mark-sold endpoint
    - Validate user is the listing owner
    - Accept saleChannel (PLATFORM_DIRECT or EXTERNAL)
    - Accept optional transactionId (required if PLATFORM_DIRECT)
    - Accept optional salePrice and saleNotes (for EXTERNAL)
    - Call ListingStatusManager.markAsSold()
    - Return updated listing with SOLD status and sale details
    - Return error if listing has active transaction with PAYMENT_LOCKED+
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9_
  
  - [ ] 14.5 Create PUT /api/transactions/:id/complete-direct endpoint
    - Validate user is the farmer for the transaction
    - Accept optional notes
    - Call TransactionService.completeDirectPayment()
    - Return updated transaction with COMPLETED_DIRECT status
    - Return updated listing with SOLD status
    - Return error if transaction not in ACCEPTED state or payment preference doesn't allow direct
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_
  
  - [ ]* 14.6 Write integration tests for listing endpoints
    - Test listing creation with category, listing type, and payment preference
    - Test filtering by status (single and multiple)
    - Test cancellation endpoint with valid and invalid scenarios
    - Test mark-sold endpoint with PLATFORM_DIRECT and EXTERNAL channels
    - Test complete-direct endpoint
    - Test response format includes all required fields
    - _Requirements: 9.1, 9.2, 13.1, 13.2, 13.3, 15.1, 16.1, 18.1, 19.1, 20.1_

- [ ] 15. Implement status history API endpoint
  - [ ] 15.1 Create GET /api/marketplace/listings/:id/history endpoint
    - Query listing_status_history table for listing_id
    - Order by changed_at DESC
    - Return array of status change records
    - _Requirements: 12.5_
  
  - [ ]* 15.2 Write integration tests for history endpoint
    - Test retrieval of status history
    - Test ordering by timestamp
    - Test history includes all required fields
    - _Requirements: 12.5_

- [ ] 16. Implement bulk status update API endpoint
  - [ ] 16.1 Create POST /api/admin/marketplace/listings/bulk-status endpoint
    - Accept array of listing IDs and target status
    - Add admin authentication middleware
    - Call ListingStatusManager.bulkUpdateStatus()
    - Return success/failure results for each listing
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ]* 16.2 Write integration tests for bulk status endpoint
    - Test bulk update with valid transitions
    - Test bulk update with mixed valid/invalid transitions
    - Test admin authentication requirement
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 17. Implement analytics API endpoints
  - [ ] 17.1 Create GET /api/marketplace/analytics/listings endpoint
    - Implement status counts grouped by status
    - Calculate average time from ACTIVE to SOLD
    - Count listings that expired without sale
    - Calculate cancellation rate
    - Support date range filtering (startDate, endDate query params)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 17.2 Create GET /api/marketplace/analytics/sales-by-channel endpoint
    - Implement using getSalesByChannel() from task 12.1
    - Support date range filtering (startDate, endDate query params)
    - Support farmer filtering (optional farmerId)
    - Return sales counts, percentages, and revenue by channel
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_
  
  - [ ]* 17.3 Write integration tests for analytics endpoints
    - Test status counts calculation
    - Test average time to sold calculation
    - Test sales by channel analytics
    - Test date range filtering
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 21.1, 21.2_

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Integrate StatusSynchronizer with TransactionService
  - [ ] 19.1 Wire StatusSynchronizer into transaction lifecycle
    - Call StatusSynchronizer.onTransactionCompleted() when transaction reaches COMPLETED state
    - Call StatusSynchronizer.onTransactionCompletedDirect() when transaction reaches COMPLETED_DIRECT state
    - Call StatusSynchronizer.onTransactionCancelled() when transaction reaches CANCELLED state
    - Call StatusSynchronizer.onTransactionRejected() when transaction reaches REJECTED state
    - Call StatusSynchronizer.onEscrowRefunded() when escrow reaches REFUNDED state
    - Add error handling and logging for synchronization failures
    - _Requirements: 5.1, 5.2, 5.3, 7.1, 7.2, 7.3, 20.4_
  
  - [ ]* 19.2 Write integration tests for transaction-listing synchronization
    - Test listing marked SOLD on transaction completion (escrow)
    - Test listing marked SOLD on direct payment completion
    - Test listing returned to ACTIVE on early cancellation
    - Test listing marked EXPIRED on late cancellation
    - Test escrow refund reactivation
    - _Requirements: 5.1, 5.2, 7.1, 7.2, 7.3, 20.4_

- [ ] 20. Initialize ExpirationService on application startup
  - [ ] 20.1 Start expiration scheduler in app initialization
    - Create ExpirationService instance in app.ts
    - Call scheduleExpirationCheck() on startup
    - Add graceful shutdown to stop scheduler
    - Add logging for scheduler start/stop
    - _Requirements: 4.2_
  
  - [ ]* 20.2 Write integration test for expiration scheduler
    - Test scheduler runs and expires listings
    - Test graceful shutdown stops scheduler
    - _Requirements: 4.2_

- [ ] 21. Update frontend UI components
  - [ ] 21.1 Update listing creation form
    - Add produce category dropdown (populated from /api/produce-categories)
    - Add listing type radio buttons (PRE_HARVEST / POST_HARVEST)
    - Add payment method preference selector (PLATFORM_ONLY / DIRECT_ONLY / BOTH)
    - Display calculated expiry date after category and harvest date selection
    - Show expiry information: "This listing will expire on [date] ([X] days after harvest)"
    - _Requirements: 15.1, 15.2, 16.3, 16.6, 18.1, 18.2_
  
  - [ ] 21.2 Update listing display components
    - Show status badge (ACTIVE, SOLD, EXPIRED, CANCELLED) with appropriate colors
    - Display expiry date for ACTIVE listings
    - Display payment method preference for ACTIVE listings
    - Show sold date and sale channel for SOLD listings
    - Show sale price and notes for EXTERNAL sales
    - Show cancellation date for CANCELLED listings
    - Filter out non-ACTIVE listings from buyer marketplace view
    - _Requirements: 9.1, 13.1, 13.5, 13.6, 13.7, 18.5, 19.7_
  
  - [ ] 21.3 Add listing cancellation button
    - Add "Cancel Listing" button for farmer's own ACTIVE listings
    - Show confirmation dialog before cancellation
    - Display error message if listing has active transaction
    - Update UI to show CANCELLED status after successful cancellation
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [ ] 21.4 Add manual sale confirmation modal
    - Add "Mark as Sold" button for farmer's own ACTIVE listings
    - Show modal with sale channel selection: "Via Bharat Mandi" or "Outside Bharat Mandi"
    - WHERE "Via Bharat Mandi" selected, show transaction dropdown (ACCEPTED transactions only)
    - WHERE "Outside Bharat Mandi" selected, show optional sale price and notes fields
    - Show confirmation dialog before marking as sold
    - Display error message if listing has active transaction with PAYMENT_LOCKED+
    - Update UI to show SOLD status with sale channel after successful confirmation
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.9_
  
  - [ ] 21.5 Add direct payment completion button
    - Add "Confirm Direct Payment" button in transaction detail view (for ACCEPTED transactions)
    - Show only when payment_method_preference allows direct payment
    - Show confirmation dialog before completing
    - Update UI to show COMPLETED_DIRECT status after successful completion
    - Update listing UI to show SOLD status
    - _Requirements: 20.1, 20.2, 20.3_
  
  - [ ] 21.6 Add sales analytics dashboard
    - Create sales by channel chart (pie or bar chart)
    - Show counts, percentages, and revenue for each channel
    - Add date range filter
    - Add farmer filter (for admin view)
    - Display PLATFORM_ESCROW, PLATFORM_DIRECT, EXTERNAL, and UNKNOWN categories
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [ ] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Development phase allows clean schema recreation without backward compatibility
- Both PostgreSQL and SQLite implementations required for all database changes
