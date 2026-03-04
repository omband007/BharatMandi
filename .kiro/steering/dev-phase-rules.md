---
inclusion: auto
---

# Development Phase Rules

## Project Status

This project is currently in the **development phase** with test data only. Production deployment has not occurred.

## Backward Compatibility

**RULE**: Backward compatibility is NOT required for any feature implementation.

- Existing APIs can be modified without maintaining old behavior
- Database schemas can be changed without migration scripts for existing data
- Breaking changes are acceptable
- Test data can be completely deleted and recreated

## Data Migration

**RULE**: Data migration scripts are NOT required.

- Existing test data can be dropped and recreated
- No need to preserve or transform existing records
- Fresh schema creation is preferred over ALTER TABLE migrations
- Use DROP TABLE IF EXISTS and CREATE TABLE for simplicity

## Implementation Approach

When implementing features:

1. **Database Changes**: Use DROP and CREATE instead of ALTER
2. **API Changes**: Modify endpoints directly without versioning
3. **Schema Changes**: Recreate tables with new structure
4. **Test Data**: Delete and regenerate as needed
5. **Code Refactoring**: Make breaking changes freely

## When This Changes

Once the project moves to production:
- Remove or update this steering file
- Implement proper migration strategies
- Add backward compatibility layers
- Version APIs appropriately
- Preserve production data

## Applies To

- All database schema changes
- All API endpoint modifications
- All service interface changes
- All data structure updates
- All feature implementations

---

**Last Updated**: March 4, 2026
**Status**: Active - Development Phase
