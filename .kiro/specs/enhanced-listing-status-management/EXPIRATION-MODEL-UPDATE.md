# Listing Expiration Model - Updated Requirements

## Summary of Changes

The listing expiration model has been updated from a simple "harvest date + 24-hour grace period" approach to a more realistic **perishability-based expiration model** that supports both pre-harvest and post-harvest listings.

## New Expiration Model

### Core Concepts

1. **Listing Type**: PRE_HARVEST or POST_HARVEST
   - **PRE_HARVEST**: Listing created before harvest; harvest date is tentative/future
   - **POST_HARVEST**: Listing created after harvest; harvest date is actual/past

2. **Harvest Date**: Can be past or future
   - Represents the actual or expected date when produce was/will be harvested
   - For pre-harvest: tentative, can be updated
   - For post-harvest: actual, historical

3. **Produce Categories**: Admin-configurable categories with expiry periods
   - **Leafy Greens** (palak, methi, dhania): 24 hours
   - **Fruits** (tomato, apple): 2 days (48 hours)
   - **Root Vegetables** (potato, garlic): 7 days (168 hours)
   - **Grains** (wheat, rice): 4 weeks (672 hours)

4. **Expiry Calculation**: 
   ```
   Expiry Date = Harvest Date + Category Expiry Period
   ```
   - Same formula for both PRE_HARVEST and POST_HARVEST
   - No grace period needed

### Examples

#### Example 1: Pre-Harvest Tomatoes
```
Listing Created: March 1, 2024
Listing Type: PRE_HARVEST
Harvest Date: March 15, 2024 (future, tentative)
Produce: Tomato
Category: Fruits
Category Expiry: 48 hours (2 days)

Expiry Date = March 15 + 2 days = March 17, 2024
Status: ACTIVE until March 17
```

#### Example 2: Post-Harvest Palak
```
Listing Created: March 10, 2024 10:00 AM
Listing Type: POST_HARVEST
Harvest Date: March 10, 2024 (today, actual)
Produce: Palak
Category: Leafy Greens
Category Expiry: 24 hours

Expiry Date = March 10 + 24 hours = March 11, 2024 10:00 AM
Status: ACTIVE until March 11 10:00 AM
```

#### Example 3: Post-Harvest Grains
```
Listing Created: March 1, 2024
Listing Type: POST_HARVEST
Harvest Date: February 28, 2024 (past, actual)
Produce: Wheat
Category: Grains
Category Expiry: 672 hours (4 weeks)

Expiry Date = February 28 + 28 days = March 27, 2024
Status: ACTIVE until March 27
```

## Database Schema Changes

### New Fields in `listings` Table

```sql
-- Add listing type
listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('PRE_HARVEST', 'POST_HARVEST'))

-- Add produce category reference
produce_category_id UUID REFERENCES produce_categories(id)

-- Add computed expiry date (can be stored or computed)
expiry_date TIMESTAMP NOT NULL
```

### New Table: `produce_categories`

```sql
CREATE TABLE produce_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    expiry_period_hours INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default categories
INSERT INTO produce_categories (name, expiry_period_hours, description) VALUES
('Leafy Greens', 24, 'Palak, methi, dhania, lettuce'),
('Fruits', 48, 'Tomato, apple, mango, banana'),
('Root Vegetables', 168, 'Potato, onion, garlic, carrot'),
('Grains', 672, 'Wheat, rice, corn, millet');
```

## User Experience

### Farmer Creating Listing

1. Farmer selects produce type (e.g., "Tomato")
2. System automatically determines category (Fruits)
3. Farmer enters harvest date (past or future)
4. System calculates and displays expiry date:
   ```
   "This listing will expire on March 17, 2024 (2 days after harvest)"
   ```
5. Farmer cannot change expiry period (admin-controlled)
6. Farmer can see the expiry date is calculated automatically

### Admin Managing Categories

1. Admin can view all produce categories
2. Admin can update expiry period for a category
3. System shows how many active listings use each category
4. Admin cannot delete categories with active listings
5. Changes to expiry periods apply to new listings only (existing listings keep their calculated expiry date)

## Requirements to Update

### ✅ Already Updated
- Requirement 4: Automatic Listing Expiration (updated to use category expiry period)
- Requirement 6: Produce Category Management (new requirement added)

### ❌ Need to Remove
- **Requirement 14: Expiration Grace Period** - DELETE THIS ENTIRELY
  - Grace period concept is no longer needed
  - Expiry is based on produce perishability, not arbitrary grace period

### ✏️ Need to Add
- **Requirement 16: Listing Type Classification** (NEW)
  - Support PRE_HARVEST and POST_HARVEST listing types
  - Validate harvest date based on listing type
  - Display appropriate UI based on listing type

- **Requirement 17: Expiry Date Calculation** (NEW)
  - Calculate expiry date when listing is created
  - Recalculate when harvest date is updated
  - Display expiry date to farmer (read-only)

- **Requirement 18: Category-Based Expiration** (NEW)
  - Link listings to produce categories
  - Use category expiry period for expiration calculation
  - Handle category updates gracefully

### ✏️ Need to Update in Design Document

1. **State Transition Diagram**: Change "Harvest Date + Grace Period Passed" to "Expiry Date Passed"

2. **Data Flow Diagram**: Update expiration flow to:
   ```
   Query ACTIVE listings → Check if current_time > expiry_date → Expire listing
   ```

3. **ExpirationService.calculateExpirationTime()**: 
   - Remove grace period logic
   - Change to: `harvestDate + category.expiryPeriodHours`

4. **Database Schema**: Add produce_categories table and listing_type field

5. **API Responses**: Include listing_type, produce_category, and expiry_date in responses

## Migration Strategy

### For Existing Listings

When migrating existing listings:

1. Set `listing_type` = 'POST_HARVEST' (assume all existing listings are post-harvest)
2. Assign default category based on `produce_type`:
   - Map common produce types to categories
   - Use "Fruits" as default if mapping not found
3. Calculate `expiry_date` = `expected_harvest_date` + category expiry period
4. If `expected_harvest_date` is NULL, set expiry_date = created_at + 7 days (default)

## Implementation Priority

1. **Phase 1**: Database schema (produce_categories table, new fields)
2. **Phase 2**: Category management (admin CRUD operations)
3. **Phase 3**: Expiry calculation logic (update ExpirationService)
4. **Phase 4**: Listing creation/update (add listing_type, category selection)
5. **Phase 5**: UI updates (display expiry date, listing type)

## Questions Resolved

✅ **Q: Are listings created pre-harvest or post-harvest?**
A: Both. System supports PRE_HARVEST and POST_HARVEST types.

✅ **Q: What does harvest date mean?**
A: Actual or expected date of harvest (can be past or future).

✅ **Q: When should listings expire?**
A: Based on produce perishability (harvest date + category expiry period).

✅ **Q: Should there be a grace period?**
A: No. Expiry is based on produce characteristics, not arbitrary grace periods.

✅ **Q: Can farmers change expiry period?**
A: No. Expiry period is admin-controlled per category. Farmers see calculated expiry date but cannot change it.

## Next Steps

1. Review and approve this updated model
2. Update requirements.md (remove Req 14, add Req 16-18)
3. Update design.md (schema, diagrams, service methods)
4. Create tasks.md for implementation
5. Begin implementation starting with database schema
