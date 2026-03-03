# Database Schema Consolidation - Bugfix Requirements

## Introduction

This bugfix addresses a PostgreSQL foreign key constraint violation that prevents listing creation after user registration. The system is in a transitional state where user registration creates entries in the new `user_profiles` table (via Sequelize), but legacy tables (`listings`, `transactions`, `credibility_scores`, etc.) still reference the old `users` table via foreign key constraints. This architectural inconsistency causes listing creation to fail with foreign key violations, forcing fallback to SQLite and creating data inconsistency.

The fix consolidates the database schema by migrating all foreign key references from the legacy `users` table to the new `user_profiles` table, completing the PostgreSQL migration that was started but left incomplete.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user completes registration via `createInitialProfile()` THEN the system creates an entry only in the `user_profiles` table using Sequelize's `UserProfileModel.create()`

1.2 WHEN a registered user (with entry in `user_profiles` but not in `users`) attempts to create a listing THEN PostgreSQL rejects the insert with error "insert or update on table 'listings' violates foreign key constraint 'listings_farmer_id_fkey'"

1.3 WHEN the PostgreSQL listing creation fails THEN the system falls back to SQLite, causing data inconsistency between databases

1.4 WHEN other operations reference the `users` table (transactions, credibility_scores, storage_bookings, etc.) THEN they also fail with foreign key constraint violations

### Expected Behavior (Correct)

2.1 WHEN a user completes registration via `createInitialProfile()` THEN the system SHALL create an entry in the `user_profiles` table (via Sequelize) which serves as the single source of truth for user data

2.2 WHEN a registered user attempts to create a listing THEN PostgreSQL SHALL successfully insert the listing with `farmer_id` referencing `user_profiles(user_id)` without foreign key constraint violations

2.3 WHEN listing creation succeeds in PostgreSQL THEN the system SHALL NOT fall back to SQLite, maintaining data consistency

2.4 WHEN other operations reference user data THEN they SHALL reference `user_profiles(user_id)` instead of the legacy `users(id)` table

2.5 WHEN the migration is complete THEN the legacy `users` table SHALL be dropped as it is no longer needed

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user registers with valid mobile number, name, user type, and location data THEN the system SHALL CONTINUE TO create a complete `UserProfile` object with all mandatory and optional fields as currently implemented

3.2 WHEN a user profile is created THEN the system SHALL CONTINUE TO generate a unique UUID for `userId`, generate a referral code, set initial trust score, points, and membership tier

3.3 WHEN a user profile is saved THEN the system SHALL CONTINUE TO return the profile object with all fields including `mobileNumber`, `countryCode`, `location`, `privacySettings`, and gamification data

3.4 WHEN existing operations query user data THEN they SHALL CONTINUE TO work without breaking existing functionality after foreign key migration
