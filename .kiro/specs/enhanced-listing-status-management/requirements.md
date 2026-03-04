# Requirements Document

## Introduction

This document specifies requirements for enhanced listing status management in the Bharat Mandi marketplace. Currently, the system uses a simple boolean `isActive` flag that cannot distinguish between different inactive states (SOLD, CANCELLED, EXPIRED). This enhancement replaces the `isActive` field with explicit status tracking using four states (ACTIVE, SOLD, EXPIRED, CANCELLED) to accurately track listing lifecycle, improve analytics, and provide better user experience.

The feature will replace the `isActive` column with a `status` column in the listings table, implement automatic expiration based on harvest dates and produce categories, and synchronize listing status with transaction completion events.

**Note**: This project is in development phase with test data only. No backward compatibility or data migration is required.

> **Related Documentation**: See [State Diagrams](../../shared/state-diagrams.md) for visual state machine diagrams showing how Listing, Transaction, and Escrow states interact.

## Glossary

- **Listing**: A marketplace entry created by a farmer offering agricultural produce for sale
- **Listing_Status_Manager**: The system component responsible for managing listing state transitions
- **Transaction_Processor**: The system component that handles buyer-farmer transactions
- **Expiration_Service**: The automated service that monitors and expires listings based on harvest date plus produce category expiry period
- **Status_Synchronizer**: The component that synchronizes listing status with transaction state changes
- **Database_Schema**: The PostgreSQL and SQLite database structure for listings and related tables
- **Harvest_Date**: The `expected_harvest_date` field indicating when produce was or will be harvested (can be past or future)
- **Transaction_State**: The current state of a transaction (PENDING, ACCEPTED, PAYMENT_LOCKED, DISPATCHED, IN_TRANSIT, DELIVERED, COMPLETED, CANCELLED, DISPUTED, REJECTED)
- **Escrow_State**: The current state of escrow funds (CREATED, FUNDED, LOCKED, RELEASED, REFUNDED, DISPUTED)
- **Listing_Type**: Classification indicating whether a listing is PRE_HARVEST (created before harvest) or POST_HARVEST (created after harvest)
- **Produce_Category**: A classification of agricultural produce with an associated expiry period (e.g., Leafy Greens, Fruits, Root Vegetables, Grains)
- **Category_Expiry_Period**: The duration in hours that produce remains fresh after harvest, configured per Produce_Category
- **Expiry_Date**: The calculated date when a listing expires, computed as Harvest_Date plus Category_Expiry_Period
- **Category_Manager**: The system component that manages produce categories and their expiry periods

## Requirements

### Requirement 1: Listing Status Enumeration

**User Story:** As a system administrator, I want listings to have explicit status values, so that the system can accurately track and report on listing lifecycle states.

#### Acceptance Criteria

1. THE Listing_Status_Manager SHALL support four status values: ACTIVE, SOLD, EXPIRED, CANCELLED
2. WHEN a farmer creates a listing, THE Listing_Status_Manager SHALL set the status to ACTIVE
3. THE Listing_Status_Manager SHALL store the status value in the database status column
4. THE Listing_Status_Manager SHALL reject any status value not in the enumeration

### Requirement 2: Database Schema Changes

**User Story:** As a database administrator, I want to replace the isActive column with a status column in the listings table, so that explicit status tracking is persisted in both PostgreSQL and SQLite databases.

#### Acceptance Criteria

1. THE Database_Schema SHALL replace the isActive boolean column with a status column of type enum(ACTIVE, SOLD, EXPIRED, CANCELLED)
2. THE Database_Schema SHALL set the default value for the status column to ACTIVE
3. THE Database_Schema SHALL apply the schema changes to both PostgreSQL and SQLite databases
4. THE Database_Schema SHALL use DROP TABLE IF EXISTS and CREATE TABLE for clean schema recreation

### Requirement 4: Automatic Listing Expiration

**User Story:** As a marketplace operator, I want listings to automatically expire based on produce perishability, so that outdated listings are removed from the marketplace without manual intervention.

#### Acceptance Criteria

1. WHEN the current date exceeds the Expiry_Date (Harvest_Date plus Category_Expiry_Period), THE Expiration_Service SHALL transition the listing status from ACTIVE to EXPIRED
2. THE Expiration_Service SHALL check for expired listings at least once per hour
3. THE Expiration_Service SHALL only expire listings with status ACTIVE
4. THE Expiration_Service SHALL record the expiration timestamp in the listing record
5. WHEN a listing is expired, THE Expiration_Service SHALL log the listing ID and expiration time
6. THE Expiration_Service SHALL calculate Expiry_Date for both PRE_HARVEST and POST_HARVEST listings using the same formula: Harvest_Date plus Category_Expiry_Period

### Requirement 5: Transaction Completion Synchronization

**User Story:** As a farmer, I want my listing to be marked as SOLD when a transaction completes, so that buyers know the produce has been sold and I can track my sales accurately.

#### Acceptance Criteria

1. WHEN a Transaction_State transitions to COMPLETED, THE Status_Synchronizer SHALL transition the associated listing status from ACTIVE to SOLD
2. THE Status_Synchronizer SHALL update the listing status within 5 seconds of transaction completion
3. THE Status_Synchronizer SHALL record the transaction ID in the listing record
4. THE Status_Synchronizer SHALL record the sold timestamp in the listing record
5. IF the listing status is not ACTIVE when the transaction completes, THEN THE Status_Synchronizer SHALL log a warning and not change the status

### Requirement 6: Produce Category Management

**User Story:** As a marketplace administrator, I want to configure produce categories with expiry periods, so that listings automatically expire based on produce perishability characteristics.

#### Acceptance Criteria

1. THE Category_Manager SHALL support creating produce categories with a name and expiry period in hours
2. THE Category_Manager SHALL store category definitions in the database with fields: category_id, name, expiry_period_hours
3. THE Category_Manager SHALL allow administrators to update the expiry period for existing categories
4. THE Category_Manager SHALL prevent deletion of categories that are referenced by existing listings
5. THE Category_Manager SHALL provide default categories: Leafy Greens (24 hours), Fruits (48 hours), Root Vegetables (168 hours), Grains (672 hours)
6. THE Category_Manager SHALL validate that expiry periods are positive integers between 1 and 8760 hours (1 year)

### Requirement 7: Transaction Cancellation Handling

**User Story:** As a farmer, I want my listing to return to ACTIVE status when a transaction is cancelled before payment, so that other buyers can purchase the produce.

#### Acceptance Criteria

1. WHEN a Transaction_State transitions to CANCELLED and the previous state was PENDING or ACCEPTED, THE Status_Synchronizer SHALL transition the listing status back to ACTIVE
2. WHEN a Transaction_State transitions to REJECTED, THE Status_Synchronizer SHALL transition the listing status back to ACTIVE
3. WHEN an Escrow_State transitions to REFUNDED after a dispute, THE Status_Synchronizer SHALL transition the listing status back to ACTIVE
4. THE Status_Synchronizer SHALL clear the transaction ID from the listing record when returning to ACTIVE
5. IF the listing Expiry_Date has passed when returning to ACTIVE, THEN THE Status_Synchronizer SHALL transition the listing to EXPIRED instead

### Requirement 8: Manual Listing Cancellation

**User Story:** As a farmer, I want to cancel my active listing, so that I can remove produce that is no longer available for sale.

#### Acceptance Criteria

1. WHEN a farmer requests to cancel a listing with status ACTIVE, THE Listing_Status_Manager SHALL transition the status to CANCELLED
2. THE Listing_Status_Manager SHALL record the cancellation timestamp in the listing record
3. THE Listing_Status_Manager SHALL record the farmer ID who cancelled the listing
4. IF the listing has an active transaction with Transaction_State of PAYMENT_LOCKED or later, THEN THE Listing_Status_Manager SHALL reject the cancellation request with an error message
5. WHEN a listing is cancelled, THE Listing_Status_Manager SHALL log the listing ID and cancellation reason

### Requirement 9: Status-Based Filtering

**User Story:** As a buyer, I want to see only active listings in the marketplace, so that I can purchase available produce without seeing sold or expired items.

#### Acceptance Criteria

1. WHEN a buyer views the marketplace, THE Listing_Status_Manager SHALL return only listings with status ACTIVE
2. THE Listing_Status_Manager SHALL provide a filter parameter to query listings by status
3. THE Listing_Status_Manager SHALL support filtering by multiple status values simultaneously
4. THE Listing_Status_Manager SHALL return results within 500ms for status-based queries
5. THE Listing_Status_Manager SHALL create a database index on the status column for query performance

### Requirement 10: Analytics and Reporting

**User Story:** As a marketplace analyst, I want to generate reports on listing outcomes, so that I can understand marketplace performance and farmer success rates.

#### Acceptance Criteria

1. THE Listing_Status_Manager SHALL provide a count of listings grouped by status
2. THE Listing_Status_Manager SHALL provide the average time from ACTIVE to SOLD for completed listings
3. THE Listing_Status_Manager SHALL provide the count of listings that expired without being sold
4. THE Listing_Status_Manager SHALL provide the cancellation rate (CANCELLED / total listings)
5. THE Listing_Status_Manager SHALL calculate these metrics for a specified date range

### Requirement 11: Status Transition Validation

**User Story:** As a system architect, I want to enforce valid status transitions, so that listings cannot enter invalid states.

#### Acceptance Criteria

1. THE Listing_Status_Manager SHALL allow transitions from ACTIVE to SOLD, EXPIRED, or CANCELLED
2. THE Listing_Status_Manager SHALL allow transitions from CANCELLED to ACTIVE (when transaction is rejected)
3. THE Listing_Status_Manager SHALL reject transitions from SOLD to any other status
4. THE Listing_Status_Manager SHALL reject transitions from EXPIRED to any other status
5. IF an invalid transition is attempted, THEN THE Listing_Status_Manager SHALL return an error with the current status, attempted status, and reason for rejection

### Requirement 12: Status Change Audit Trail

**User Story:** As a compliance officer, I want to track all status changes for listings, so that I can audit marketplace operations and investigate disputes.

#### Acceptance Criteria

1. WHEN a listing status changes, THE Listing_Status_Manager SHALL record the previous status, new status, timestamp, and triggering event
2. THE Listing_Status_Manager SHALL record the user ID or system component that triggered the change
3. THE Listing_Status_Manager SHALL store audit records in a separate status_history table
4. THE Listing_Status_Manager SHALL retain audit records for at least 2 years
5. THE Listing_Status_Manager SHALL provide a query interface to retrieve status history for a specific listing

### Requirement 13: API Response Format

**User Story:** As a frontend developer, I want listing API responses to include the status field, so that I can display appropriate UI based on listing state.

#### Acceptance Criteria

1. WHEN the API returns a listing object, THE Listing_Status_Manager SHALL include the status field with value ACTIVE, SOLD, EXPIRED, or CANCELLED
2. THE Listing_Status_Manager SHALL include the listing_type field with value PRE_HARVEST or POST_HARVEST
3. THE Listing_Status_Manager SHALL include the produce_category_id and produce_category_name fields
4. THE Listing_Status_Manager SHALL include the expiry_date field showing when the listing will expire
5. WHERE the status is SOLD, THE Listing_Status_Manager SHALL include the sold_at timestamp and transaction_id
6. WHERE the status is EXPIRED, THE Listing_Status_Manager SHALL include the expired_at timestamp
7. WHERE the status is CANCELLED, THE Listing_Status_Manager SHALL include the cancelled_at timestamp and cancelled_by user ID

### Requirement 14: Bulk Status Operations

**User Story:** As a marketplace administrator, I want to perform bulk status updates, so that I can efficiently manage multiple listings during maintenance or emergency situations.

#### Acceptance Criteria

1. THE Listing_Status_Manager SHALL support updating status for multiple listings in a single operation
2. THE Listing_Status_Manager SHALL validate each listing status transition independently
3. THE Listing_Status_Manager SHALL return a result indicating success or failure for each listing in the bulk operation
4. THE Listing_Status_Manager SHALL complete bulk operations within 100ms per listing
5. IF any listing in the bulk operation fails validation, THEN THE Listing_Status_Manager SHALL continue processing remaining listings and report all failures

### Requirement 15: Listing Type Classification

**User Story:** As a farmer, I want to indicate whether my listing is for pre-harvest or post-harvest produce, so that the system correctly interprets my harvest date.

#### Acceptance Criteria

1. THE Listing_Status_Manager SHALL support two listing types: PRE_HARVEST and POST_HARVEST
2. WHEN a farmer creates a listing, THE Listing_Status_Manager SHALL require selection of a Listing_Type
3. THE Listing_Status_Manager SHALL validate that Listing_Type is one of the two allowed values
4. THE Listing_Status_Manager SHALL store the Listing_Type in the database
5. THE Listing_Status_Manager SHALL display the Listing_Type in the user interface
6. WHERE Listing_Type is PRE_HARVEST, THE Listing_Status_Manager SHALL allow Harvest_Date to be in the future or near-present
7. WHERE Listing_Type is POST_HARVEST, THE Listing_Status_Manager SHALL allow Harvest_Date to be in the past or present

### Requirement 16: Expiry Date Calculation and Display

**User Story:** As a farmer, I want to see when my listing will expire based on the produce category, so that I understand how long my listing will remain active, but I cannot change the expiry period.

#### Acceptance Criteria

1. WHEN a farmer selects a Produce_Category during listing creation, THE Listing_Status_Manager SHALL calculate Expiry_Date as Harvest_Date plus Category_Expiry_Period
2. WHEN the farmer changes the Harvest_Date, THE Listing_Status_Manager SHALL recalculate the Expiry_Date
3. THE Listing_Status_Manager SHALL display the expiry information in a human-readable format: "This listing will expire on [date] ([X] days after harvest)"
4. THE Listing_Status_Manager SHALL prevent farmers from manually editing the Category_Expiry_Period
5. THE Listing_Status_Manager SHALL store the calculated Expiry_Date in the database
6. WHEN displaying a listing, THE Listing_Status_Manager SHALL show the Expiry_Date to the farmer

### Requirement 17: Category-Based Expiration

**User Story:** As a marketplace operator, I want listings to expire based on produce perishability characteristics, so that the expiration time reflects how long the produce stays fresh.

#### Acceptance Criteria

1. WHEN a farmer creates a listing, THE Listing_Status_Manager SHALL require linking the listing to a Produce_Category
2. THE Listing_Status_Manager SHALL use the category's expiry_period_hours for calculating the listing's Expiry_Date
3. WHEN a category's expiry period is updated by an administrator, THE Listing_Status_Manager SHALL apply the new period only to new listings
4. THE Listing_Status_Manager SHALL preserve the originally calculated Expiry_Date for existing listings when their category's expiry period changes
5. THE Listing_Status_Manager SHALL validate that the Produce_Category exists before creating a listing
6. IF a farmer attempts to create a listing with an invalid Produce_Category, THEN THE Listing_Status_Manager SHALL reject the request with an error message
