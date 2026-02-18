# Bharat Mandi - Source Code Structure

This project uses **vertical slicing (feature-based)** architecture for better maintainability and scalability.

## Directory Structure

```
src/
├── features/           # Feature modules (vertical slices)
│   ├── auth/          # Authentication & user management
│   ├── grading/       # AI-powered produce grading
│   ├── marketplace/   # Marketplace listings
│   ├── transactions/  # Transaction management
│   └── users/         # User CRUD operations
├── shared/            # Shared code across features
│   ├── database/      # Database connections & migrations
│   ├── types/         # Common type definitions
│   └── __tests__/     # Integration tests
├── app.ts             # Express app setup
└── index.ts           # Server entry point
```

## Feature Structure

Each feature follows this pattern:

```
features/auth/
├── auth.controller.ts      # HTTP handlers (routes)
├── auth.service.ts         # Business logic
├── auth.service.test.ts    # Unit tests
├── auth.service.pbt.test.ts # Property-based tests
├── auth.types.ts           # Feature-specific types
└── index.ts                # Public API exports
```

## Feature Independence Rules

### ✅ DO:
- Keep all feature code in its folder
- Export only what's needed via `index.ts`
- Use shared utilities from `shared/`
- Communicate between features via public APIs
- Test features in isolation

### ❌ DON'T:
- Import directly from another feature's internals
- Share types between features (duplicate if needed)
- Create circular dependencies
- Put feature-specific code in `shared/`

## Example: Feature Communication

```typescript
// ❌ BAD: Direct import from another feature's internals
import { getUserById } from '../auth/auth.service';

// ✅ GOOD: Use public API
import { getUserByPhone } from '../auth';
```

## Adding a New Feature

1. Create feature folder: `src/features/my-feature/`
2. Add required files:
   - `my-feature.controller.ts` - HTTP routes
   - `my-feature.service.ts` - Business logic
   - `my-feature.types.ts` - Type definitions
   - `my-feature.service.test.ts` - Tests
   - `index.ts` - Public API
3. Register routes in `src/app.ts`:
   ```typescript
   import { myFeatureController } from './features/my-feature';
   app.use('/api/my-feature', myFeatureController);
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run specific feature tests
npm test -- auth.service.test
npm test -- grading.service.test

# Run integration tests
npm test -- workflow.integration.test
```

## Benefits

- **High Cohesion**: All related code in one place
- **Low Coupling**: Features are independent
- **Easy Navigation**: Everything for a feature is together
- **Scalable**: Add features without touching existing ones
- **Team Friendly**: Teams can own entire features
- **Easy to Delete**: Remove entire feature folder
- **Clear Boundaries**: Feature boundaries are explicit
- **Better Testing**: Test entire feature in isolation

## Documentation

- [Vertical Slicing Guide](../docs/VERTICAL-SLICING-GUIDE.md)
- [Migration Documentation](../docs/VERTICAL-SLICING-MIGRATION.md)
- [Code Organization](../docs/CODE-ORGANIZATION.md)
