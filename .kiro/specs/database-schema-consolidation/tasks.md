# Implementation Plan

- [x] 1. Create database migration script
  - Create file: `src/shared/database/migrations/005_consolidate_user_tables.sql`
  - Drop all foreign key constraints that reference `users(id)`
  - Add new foreign key constraints that reference `user_profiles(user_id)`
  - Drop the legacy `users` table
  - Wrap all operations in a transaction for atomicity
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Update schema.sql file
  - Remove the `users` table definition from `src/shared/database/schema.sql`
  - Update all foreign key constraints to reference `user_profiles(user_id)` instead of `users(id)`
  - Update comments to reflect the consolidated schema
  - _Requirements: 2.4, 2.5_

- [x] 3. Test migration on development database
  - Back up current database state
  - Run migration script: `005_consolidate_user_tables.sql`
  - Verify `users` table no longer exists
  - Verify all foreign key constraints reference `user_profiles(user_id)`
  - Query `information_schema.table_constraints` to confirm constraint updates
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Test user registration after migration
  - Register a new user via `/api/v1/profiles/register` and `/api/v1/profiles/verify-otp`
  - Verify entry created in `user_profiles` table
  - Verify no attempt to create entry in `users` table (table should not exist)
  - Verify profile completeness is 40%
  - Verify all profile fields are correctly populated
  - _Requirements: 2.1, 3.1, 3.2, 3.3_

- [ ] 5. Test listing creation after migration
  - Create a listing for the newly registered user
  - Verify listing creation succeeds without foreign key errors
  - Verify `farmer_id` in `listings` table matches `user_id` in `user_profiles`
  - Verify listing is stored in PostgreSQL (not falling back to SQLite)
  - Query the listing to confirm it's retrievable
  - _Requirements: 2.2, 2.3_

- [ ] 6. Test other operations with foreign key references
  - Create a transaction with the registered user as farmer and buyer
  - Verify transaction creation succeeds
  - Verify `farmer_id` and `buyer_id` reference `user_profiles(user_id)`
  - Test credibility score creation (if applicable)
  - Test storage booking creation (if applicable)
  - _Requirements: 2.4_

- [ ] 7. Test foreign key constraint enforcement
  - Attempt to create a listing with an invalid `farmer_id` (non-existent UUID)
  - Verify PostgreSQL rejects the insert with foreign key constraint error
  - Verify error message references `user_profiles` table
  - Confirm referential integrity is enforced
  - _Requirements: 2.2, 2.4_

- [ ] 8. Test preservation of existing functionality
  - Test profile retrieval via `/api/v1/profiles/{userId}`
  - Test profile updates via `/api/v1/profiles/{userId}/fields`
  - Test PIN setup via `/api/v1/profiles/auth/setup-pin`
  - Test PIN login via `/api/v1/profiles/auth/login/pin`
  - Test OTP login via `/api/v1/profiles/auth/login/otp`
  - Verify all operations work exactly as before
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 9. Update documentation
  - Update database schema documentation to reflect consolidated design
  - Update API documentation if any endpoints reference the old `users` table
  - Update README or architecture docs to explain the single-table design
  - Remove any references to dual-table architecture
  - _Requirements: 2.5_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Verify migration script runs successfully
  - Verify all foreign key constraints are updated
  - Verify user registration and listing creation work end-to-end
  - Verify no regressions in existing functionality
  - Ask the user if questions arise
