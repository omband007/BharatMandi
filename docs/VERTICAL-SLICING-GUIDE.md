# Vertical Slicing (Feature-Based) Architecture

## Why Vertical Slicing is Better

### Current Problem: Horizontal Slicing (Layer-Based)

```
src/
├── routes/          # All routes together
├── services/        # All services together
├── database/        # All data access together
└── types/           # All types together
```

**Issues:**
- ❌ **High Coupling**: Changes to one feature touch multiple folders
- ❌ **Poor Cohesion**: Related code is scattered across layers
- ❌ **Hard to Navigate**: Need to jump between folders constantly
- ❌ **Difficult to Scale**: Adding features means touching many places
- ❌ **Team Conflicts**: Multiple developers editing same folders
- ❌ **Hard to Delete**: Removing a feature requires hunting across layers

### Solution: Vertical Slicing (Feature-Based)

```
src/
├── features/
│   ├── auth/           # Everything auth-related
│   ├── grading/        # Everything grading-related
│   ├── marketplace/    # Everything marketplace-related
│   └── transactions/   # Everything transaction-related
└── shared/             # Truly shared code
```

**Benefits:**
- ✅ **High Cohesion**: All related code in one place
- ✅ **Low Coupling**: Features are independent
- ✅ **Easy Navigation**: Everything for a feature is together
- ✅ **Scalable**: Add features without touching existing ones
- ✅ **Team Friendly**: Teams can own entire features
- ✅ **Easy to Delete**: Remove entire feature folder
- ✅ **Clear Boundaries**: Feature boundaries are explicit
- ✅ **Better Testing**: Test entire feature in isolation

## Recommended Structure for Bharat Mandi

```
src/
├── features/
│   ├── auth/
│   │   ├── auth.controller.ts      # HTTP handlers (routes)
│   │   ├── auth.service.ts         # Business logic
│   │   ├── auth.repository.ts      # Data access
│   │   ├── auth.types.ts           # Feature-specific types
│   │   ├── auth.validation.ts      # Input validation
│   │   ├── auth.middleware.ts      # Feature middleware
│   │   ├── auth.test.ts            # Unit tests
│   │   ├── auth.integration.test.ts # Integration tests
│   │   └── index.ts                # Public API exports
│   │
│   ├── grading/
│   │   ├── grading.controller.ts
│   │   ├── grading.service.ts
│   │   ├── grading.repository.ts
│   │   ├── grading.types.ts
│   │   ├── ai/                     # Sub-feature
│   │   │   ├── vision.service.ts
│   │   │   └── model-loader.ts
│   │   └── index.ts
│   │
│   ├── marketplace/
│   │   ├── listings/               # Sub-feature
│   │   │   ├── listing.controller.ts
│   │   │   ├── listing.service.ts
│   │   │   └── listing.repository.ts
│   │   ├── search/                 # Sub-feature
│   │   │   ├── search.controller.ts
│   │   │   └── search.service.ts
│   │   └── index.ts
│   │
│   ├── transactions/
│   │   ├── transaction.controller.ts
│   │   ├── transaction.service.ts
│   │   ├── transaction.repository.ts
│   │   ├── escrow/                 # Sub-feature
│   │   │   ├── escrow.service.ts
│   │   │   └── escrow.repository.ts
│   │   └── index.ts
│   │
│   ├── profile/
│   │   ├── profile.controller.ts
│   │   ├── profile.service.ts
│   │   ├── profile.repository.ts
│   │   └── index.ts
│   │
│   └── users/
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.repository.ts
│       └── index.ts
│
├── shared/                         # Truly shared code
│   ├── database/
│   │   ├── pg-config.ts
│   │   ├── mongodb-config.ts
│   │   └── migrations/
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Used by multiple features
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── utils/
│   │   ├── encryption.ts
│   │   ├── jwt.ts
│   │   └── logger.ts
│   ├── types/
│   │   └── common.types.ts         # Shared across features
│   └── config/
│       └── index.ts
│
├── app.ts                          # Express app setup
└── server.ts                       # Server entry point
```

## Feature Structure Pattern

Each feature follows this pattern:

```typescript
// features/auth/index.ts
// Public API - only export what other features need
export { authController } from './auth.controller';
export { requireAuth } from './auth.middleware';
export type { User, AuthToken } from './auth.types';

// features/auth/auth.controller.ts
import { Router } from 'express';
import { authService } from './auth.service';
import { loginSchema, registerSchema } from './auth.validation';
import { validate } from '../../shared/middleware/validation.middleware';

const router = Router();

router.post('/login', validate(loginSchema), async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

export const authController = router;

// features/auth/auth.service.ts
import { authRepository } from './auth.repository';
import { hashPassword, comparePassword } from '../../shared/utils/encryption';
import { generateToken } from '../../shared/utils/jwt';

class AuthService {
  async login(credentials: LoginDTO) {
    const user = await authRepository.findByPhone(credentials.phoneNumber);
    const isValid = await comparePassword(credentials.pin, user.pinHash);
    
    if (!isValid) {
      throw new AuthError('Invalid credentials');
    }
    
    const token = generateToken({ userId: user.id });
    return { token, user };
  }
}

export const authService = new AuthService();

// features/auth/auth.repository.ts
import { pool } from '../../shared/database/pg-config';

class AuthRepository {
  async findByPhone(phoneNumber: string) {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phoneNumber]
    );
    return result.rows[0];
  }
  
  async create(user: CreateUserDTO) {
    // ... implementation
  }
}

export const authRepository = new AuthRepository();

// features/auth/auth.types.ts
export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  userType: UserType;
}

export interface LoginDTO {
  phoneNumber: string;
  pin: string;
}

// features/auth/auth.validation.ts
import Joi from 'joi';

export const loginSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  pin: Joi.string().length(4).required()
});
```

## Migration Strategy

### Phase 1: Create Feature Folders (No Breaking Changes)

```bash
# Create new structure alongside old
mkdir -p src/features/auth
mkdir -p src/features/grading
mkdir -p src/features/marketplace
mkdir -p src/features/transactions
mkdir -p src/shared/middleware
mkdir -p src/shared/utils
```

### Phase 2: Move Files Feature by Feature

**Start with Auth (smallest, most isolated):**

```bash
# Move auth files
mv src/services/auth.service.ts src/features/auth/
mv src/routes/auth.routes.ts src/features/auth/auth.controller.ts
mv src/services/auth.service.test.ts src/features/auth/auth.test.ts

# Create new files
touch src/features/auth/auth.repository.ts
touch src/features/auth/auth.types.ts
touch src/features/auth/index.ts
```

**Update imports:**
```typescript
// Old
import { loginWithPIN } from '../services/auth.service';

// New
import { authService } from '../features/auth';
```

### Phase 3: Extract Shared Code

```bash
# Move shared utilities
mv src/database/ src/shared/database/

# Create shared middleware
touch src/shared/middleware/auth.middleware.ts
touch src/shared/middleware/error.middleware.ts
```

### Phase 4: Update Main App

```typescript
// src/app.ts
import express from 'express';
import { authController } from './features/auth';
import { gradingController } from './features/grading';
import { marketplaceController } from './features/marketplace';
import { transactionController } from './features/transactions';
import { errorHandler } from './shared/middleware/error.middleware';

const app = express();

// Middleware
app.use(express.json());

// Feature routes
app.use('/api/auth', authController);
app.use('/api/grading', gradingController);
app.use('/api/marketplace', marketplaceController);
app.use('/api/transactions', transactionController);

// Error handling
app.use(errorHandler);

export default app;
```

## Feature Independence Rules

### ✅ DO:
- Keep all feature code in its folder
- Export only what's needed via index.ts
- Use shared utilities from shared/
- Communicate between features via public APIs
- Test features in isolation

### ❌ DON'T:
- Import directly from another feature's internals
- Share types between features (duplicate if needed)
- Create circular dependencies
- Put feature-specific code in shared/

## Example: Feature Communication

```typescript
// ❌ BAD: Direct import from another feature
import { getUserById } from '../users/user.service';

// ✅ GOOD: Use public API
import { userService } from '../users';
const user = await userService.getById(userId);

// ✅ BETTER: Dependency injection
class TransactionService {
  constructor(private userService: UserService) {}
  
  async createTransaction(userId: string) {
    const user = await this.userService.getById(userId);
    // ...
  }
}
```

## Benefits for Bharat Mandi

### 1. **Clear Feature Boundaries**
```
auth/          → User authentication, OTP, PIN, tokens
grading/       → AI grading, certificates, quality analysis
marketplace/   → Listings, search, filtering
transactions/  → Orders, escrow, payments
profile/       → User profile management
```

### 2. **Parallel Development**
- Team A works on `features/grading/`
- Team B works on `features/marketplace/`
- No merge conflicts!

### 3. **Easy Feature Flags**
```typescript
// Disable entire feature
if (!config.features.auctions) {
  // Don't register auction routes
}
```

### 4. **Microservices Ready**
Each feature can become a microservice:
```
features/auth/        → auth-service
features/grading/     → grading-service
features/marketplace/ → marketplace-service
```

### 5. **Better Testing**
```typescript
// Test entire auth feature
describe('Auth Feature', () => {
  // All auth tests in one place
  describe('Registration', () => { });
  describe('Login', () => { });
  describe('Profile', () => { });
});
```

## Comparison: Before vs After

### Before (Horizontal Slicing)
```
To add "Profile Management":
1. Create src/services/profile.service.ts
2. Create src/routes/profile.routes.ts
3. Update src/routes/index.ts
4. Create src/types/profile.types.ts
5. Files scattered across 4 folders
```

### After (Vertical Slicing)
```
To add "Profile Management":
1. Create src/features/profile/ folder
2. Add all profile files in one place
3. Export from features/profile/index.ts
4. Register in app.ts
5. Everything in one folder!
```

## When to Use Each Approach

### Use Horizontal Slicing (Layers) When:
- Very small applications (< 5 features)
- Simple CRUD operations
- Team < 3 developers
- No plans to scale

### Use Vertical Slicing (Features) When:
- Medium to large applications (5+ features)
- Complex business logic
- Multiple teams
- Planning to scale
- **Domain-driven design** ← Bharat Mandi fits here!

## Recommended: Hybrid Approach

For Bharat Mandi, use **vertical slicing with thin horizontal layers**:

```
src/
├── features/              # Vertical slices
│   ├── auth/
│   ├── grading/
│   └── marketplace/
├── shared/                # Thin horizontal layer
│   ├── database/         # Database connections
│   ├── middleware/       # Cross-cutting concerns
│   └── utils/            # Common utilities
└── app.ts
```

## Conclusion

**Vertical slicing is the right choice for Bharat Mandi because:**

1. ✅ You have distinct business domains (auth, grading, marketplace, transactions)
2. ✅ Features have different complexity levels
3. ✅ You're building for scale (30+ requirements)
4. ✅ Features can evolve independently
5. ✅ Easier to understand and maintain
6. ✅ Better for team collaboration
7. ✅ Aligns with domain-driven design

**Start migrating gradually:**
- Phase 1: Create feature folders
- Phase 2: Move one feature at a time (start with auth)
- Phase 3: Extract shared code
- Phase 4: Update imports and tests

The migration can be done incrementally without breaking existing functionality!
