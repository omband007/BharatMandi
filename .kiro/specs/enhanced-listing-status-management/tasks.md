# Implementation Plan: Enhanced Listing Status Management

## Overview

This implementation plan converts the enhanced listing status management design into actionable coding tasks. The feature replaces the `isActive` boolean field with an explicit `status` enum (ACTIVE, SOLD, EXPIRED, CANCELLED), implements automatic expiration based on produce categories and harvest dates, and synchronizes listing status with transaction completion events.

**Development Phase Simplifications:**
- No backward compatibility required (clean schema recreation)
- No data migration logic (DROP TABLE IF EXISTS and CREATE TABLE)
- No offline sync tasks (Requirement 13 removed)
- Direct schema replacement instead of ALTER TABLE migrations

## Tasks

- [ ] 1. Set up produce categories infrastructure
  - [ ] 1.1 Create produce categories database schema
    - Create `produce_categories` table with fields: id, name, expiry_period_hours, description, created_at, updated_at
    - Add CHECK constraint for expiry_period_hours (1-8760 hours)
    - Create index on name column
    - Implement for both PostgreSQL and SQLite
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [ ] 1.2 Seed default produce categories
    - Insert four default categories: Leafy Greens (24h), Fruits (48h), Root Vegetables (168h), Grains (672h)
    - Include descriptions for each category
    - _Requirements: 6.5_
  
  - [ ] 1.3 Implement CategoryManager service
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

- [ ] 2. Update listings database schema
  - [ ] 2.1 Create new listings schema with status column
    - Drop existing listings table (DROP TABLE IF EXISTS listings)
    - Create listings table with new schema including: status enum, listing_type enum, produce_category_id FK, expiry_date, sold_at, transaction_id, expired_at, cancelled_at, cancelled_by
    - Add CHECK constraints for status-specific timestamps
    - Create indexes: idx_listings_status, idx_listings_expiry_date_status, idx_listings_category
    - Implement for both PostgreSQL (with ENUM types) and SQLite (with TEXT + CHECK)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 15.1, 15.2, 15.3, 15.4, 15.7_
  
  - [ ] 2.2 Create listing_status_history table
    - Create table with fields: id, listing_id FK, previous_status, new_status, changed_at, triggered_by, trigger_type, metadata (JSONB/TEXT)
    - Add indexes for listing_id and changed_at
    - Add CHECK constraint for trigger_type (USER, SYSTEM, TRANSACTION)
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 3. Implement core status management
  - [ ] 3.1 Create ListingStatusManager service
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

- [ ] 5. Implement automatic expiration service
  - [ ] 5.1 Create ExpirationService
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

- [ ] 6. Implement transaction-listing status synchronization
  - [ ] 6.1 Create StatusSynchronizer service
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

- [ ] 8. Update MarketplaceService for listing creation
  - [ ] 8.1 Modify createListing() to require produce_category_id and listing_type
    - Add validation for produce_category_id existence
    - Add validation for listing_type (PRE_HARVEST or POST_HARVEST)
    - Calculate expiry_date using CategoryManager and ListingStatusManager
    - Set initial status to ACTIVE
    - Record initial status change in audit trail
    - _Requirements: 1.2, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 16.1, 16.2, 16.5, 17.1, 17.2, 17.5_
  
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

- [ ] 9. Implement manual listing cancellation
  - [ ] 9.1 Add cancelListing() method to MarketplaceService
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

- [ ] 10. Implement bulk status operations
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

- [ ] 12. Implement API endpoints for produce categories
  - [ ] 12.1 Create category routes and controller
    - POST /api/admin/produce-categories - Create category
    - GET /api/produce-categories - Get all categories
    - PATCH /api/admin/produce-categories/:id - Update category
    - DELETE /api/admin/produce-categories/:id - Delete category
    - Add admin authentication middleware for admin endpoints
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 12.2 Write integration tests for category endpoints
    - Test category CRUD operations
    - Test validation of expiry period range
    - Test prevention of deleting categories with listings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [ ] 13. Update listing API endpoints
  - [ ] 13.1 Update GET /api/marketplace/listings endpoint
    - Add status query parameter for filtering (single or comma-separated)
    - Update response to include: status, listing_type, produce_category_id, produce_category_name, expiry_date
    - Include status-specific fields: sold_at, transaction_id, expired_at, cancelled_at, cancelled_by
    - Default filter to status=ACTIVE for backward compatibility
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  
  - [ ] 13.2 Create POST /api/marketplace/listings/:id/cancel endpoint
    - Validate user is the listing owner
    - Call MarketplaceService.cancelListing()
    - Return updated listing with CANCELLED status
    - Return error if listing has active transaction
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 13.3 Update POST /api/marketplace/listings endpoint
    - Add required fields: produce_category_id, listing_type
    - Validate produce_category_id exists
    - Validate listing_type is PRE_HARVEST or POST_HARVEST
    - Calculate and return expiry_date in response
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 16.1, 16.3, 16.6, 17.1, 17.2, 17.5_
  
  - [ ]* 13.4 Write integration tests for listing endpoints
    - Test listing creation with category and listing type
    - Test filtering by status (single and multiple)
    - Test cancellation endpoint with valid and invalid scenarios
    - Test response format includes all required fields
    - _Requirements: 9.1, 9.2, 13.1, 13.2, 13.3, 15.1, 16.1_

- [ ] 14. Implement status history API endpoint
  - [ ] 14.1 Create GET /api/marketplace/listings/:id/history endpoint
    - Query listing_status_history table for listing_id
    - Order by changed_at DESC
    - Return array of status change records
    - _Requirements: 12.5_
  
  - [ ]* 14.2 Write integration tests for history endpoint
    - Test retrieval of status history
    - Test ordering by timestamp
    - Test history includes all required fields
    - _Requirements: 12.5_

- [ ] 15. Implement bulk status update API endpoint
  - [ ] 15.1 Create POST /api/admin/marketplace/listings/bulk-status endpoint
    - Accept array of listing IDs and target status
    - Add admin authentication middleware
    - Call ListingStatusManager.bulkUpdateStatus()
    - Return success/failure results for each listing
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ]* 15.2 Write integration tests for bulk status endpoint
    - Test bulk update with valid transitions
    - Test bulk update with mixed valid/invalid transitions
    - Test admin authentication requirement
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 16. Implement analytics API endpoint
  - [ ] 16.1 Create GET /api/marketplace/analytics/listings endpoint
    - Implement status counts grouped by status
    - Calculate average time from ACTIVE to SOLD
    - Count listings that expired without sale
    - Calculate cancellation rate
    - Support date range filtering (startDate, endDate query params)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 16.2 Write integration tests for analytics endpoint
    - Test status counts calculation
    - Test average time to sold calculation
    - Test date range filtering
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Integrate StatusSynchronizer with TransactionService
  - [ ] 18.1 Wire StatusSynchronizer into transaction lifecycle
    - Call StatusSynchronizer.onTransactionCompleted() when transaction reaches COMPLETED state
    - Call StatusSynchronizer.onTransactionCancelled() when transaction reaches CANCELLED state
    - Call StatusSynchronizer.onTransactionRejected() when transaction reaches REJECTED state
    - Call StatusSynchronizer.onEscrowRefunded() when escrow reaches REFUNDED state
    - Add error handling and logging for synchronization failures
    - _Requirements: 5.1, 5.2, 7.1, 7.2, 7.3_
  
  - [ ]* 18.2 Write integration tests for transaction-listing synchronization
    - Test listing marked SOLD on transaction completion
    - Test listing returned to ACTIVE on early cancellation
    - Test listing marked EXPIRED on late cancellation
    - Test escrow refund reactivation
    - _Requirements: 5.1, 5.2, 7.1, 7.2, 7.3_

- [ ] 19. Initialize ExpirationService on application startup
  - [ ] 19.1 Start expiration scheduler in app initialization
    - Create ExpirationService instance in app.ts
    - Call scheduleExpirationCheck() on startup
    - Add graceful shutdown to stop scheduler
    - Add logging for scheduler start/stop
    - _Requirements: 4.2_
  
  - [ ]* 19.2 Write integration test for expiration scheduler
    - Test scheduler runs and expires listings
    - Test graceful shutdown stops scheduler
    - _Requirements: 4.2_

- [ ] 20. Update frontend UI components
  - [ ] 20.1 Update listing creation form
    - Add produce category dropdown (populated from /api/produce-categories)
    - Add listing type radio buttons (PRE_HARVEST / POST_HARVEST)
    - Display calculated expiry date after category and harvest date selection
    - Show expiry information: "This listing will expire on [date] ([X] days after harvest)"
    - _Requirements: 15.1, 15.2, 16.3, 16.6_
  
  - [ ] 20.2 Update listing display components
    - Show status badge (ACTIVE, SOLD, EXPIRED, CANCELLED) with appropriate colors
    - Display expiry date for ACTIVE listings
    - Show sold date for SOLD listings
    - Show cancellation date for CANCELLED listings
    - Filter out non-ACTIVE listings from buyer marketplace view
    - _Requirements: 9.1, 13.1, 13.5, 13.6, 13.7_
  
  - [ ] 20.3 Add listing cancellation button
    - Add "Cancel Listing" button for farmer's own ACTIVE listings
    - Show confirmation dialog before cancellation
    - Display error message if listing has active transaction
    - Update UI to show CANCELLED status after successful cancellation
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Development phase allows clean schema recreation without backward compatibility
- Both PostgreSQL and SQLite implementations required for all database changes
