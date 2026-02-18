# Code Organization & Best Practices

## Current Project Structure

```
bharat-mandi/
├── src/
│   ├── index.ts              # Application entry point
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # Shared types and interfaces
│   ├── database/             # Database layer
│   │   ├── pg-config.ts      # PostgreSQL connection
│   │   ├── mongodb-config.ts # MongoDB connection
│   │   ├── sqlite-config.ts  # SQLite connection
│   │   ├── migrations/       # Database migrations
│   │   └── schema.sql        # Database schema
│   ├── services/             # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── grading.service.ts
│   │   ├── marketplace.service.ts
│   │   └── transaction.service.ts
│   ├── routes/               # API routes layer
│   │   ├── index.ts          # Route aggregator
│   │   ├── auth.routes.ts
│   │   └── grading.routes.ts
│   └── __tests__/            # Integration tests
├── config/                   # Configuration files
│   └── jest.config.js
├── docs/                     # Documentation
├── public/                   # Static files (UI)
└── data/                     # SQLite database files
```

## Architecture Pattern: Layered Architecture

### 1. **Presentation Layer** (Routes)
**Location**: `src/routes/`

**Responsibility**: Handle HTTP requests/responses, validation, error handling

**Best Practices**:
- ✅ Keep routes thin - delegate business logic to services
- ✅ Handle request/response formatting
- ✅ Validate input parameters
- ✅ Return appropriate HTTP status codes
- ✅ Group related routes in separate files

**Example**:
```typescript
// src/routes/auth.routes.ts
router.post('/login', async (req, res) => {
  const { phoneNumber, pin } = req.body;
  
  // Validation
  if (!phoneNumber || !pin) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Delegate to service
  const result = await loginWithPIN(phoneNumber, pin);
  
  // Handle response
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  
  res.json({ token: result.token, user: result.user });
});
```

### 2. **Business Logic Layer** (Services)
**Location**: `src/services/`

**Responsibility**: Core business logic, data processing, orchestration

**Best Practices**:
- ✅ Pure business logic - no HTTP concerns
- ✅ Reusable across different routes
- ✅ Testable in isolation
- ✅ Single Responsibility Principle
- ✅ Return structured results (success/error objects)

**Example**:
```typescript
// src/services/auth.service.ts
export async function loginWithPIN(phoneNumber: string, pin: string) {
  // Business logic
  const user = await getUserByPhone(phoneNumber);
  const isValid = await bcrypt.compare(pin, user.pin_hash);
  
  if (!isValid) {
    return { success: false, message: 'Invalid PIN' };
  }
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  return { success: true, token, user };
}
```

### 3. **Data Access Layer** (Database)
**Location**: `src/database/`

**Responsibility**: Database connections, queries, migrations

**Best Practices**:
- ✅ Separate config files per database
- ✅ Use connection pooling
- ✅ Parameterized queries (prevent SQL injection)
- ✅ Migration scripts for schema changes
- ✅ Database-specific helpers

**Example**:
```typescript
// src/database/pg-config.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000
});
```

### 4. **Type Definitions Layer**
**Location**: `src/types/`

**Responsibility**: Shared TypeScript interfaces and types

**Best Practices**:
- ✅ Centralized type definitions
- ✅ Avoid duplication
- ✅ Use enums for fixed values
- ✅ Export from single index file

**Example**:
```typescript
// src/types/index.ts
export enum UserType {
  FARMER = 'FARMER',
  BUYER = 'BUYER',
  LOGISTICS_PROVIDER = 'LOGISTICS_PROVIDER'
}

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  userType: UserType;
}
```

## Current Implementation Analysis

### ✅ What's Done Well

1. **Clear Separation of Concerns**
   - Routes handle HTTP
   - Services handle business logic
   - Database layer handles data access

2. **Modular Structure**
   - Each feature has its own service file
   - Routes are grouped by domain (auth, grading)

3. **Type Safety**
   - TypeScript interfaces defined
   - Enums for fixed values

4. **Testing**
   - Unit tests for services
   - Property-based tests for critical logic
   - Integration tests for workflows

5. **Database Abstraction**
   - Multiple database support (PostgreSQL, MongoDB, SQLite)
   - Connection pooling
   - Migrations

### ⚠️ Areas for Improvement

1. **Mixed Concerns in Routes**
   ```typescript
   // ❌ Current: Business logic in routes
   router.post('/users', (req, res) => {
     const user = db.createUser({ id: uuidv4(), ...req.body });
     res.json(user);
   });
   
   // ✅ Better: Delegate to service
   router.post('/users', async (req, res) => {
     const result = await userService.createUser(req.body);
     res.status(201).json(result);
   });
   ```

2. **Missing Middleware Layer**
   - No authentication middleware
   - No request validation middleware
   - No error handling middleware

3. **Service Organization**
   - Some services are too large (auth.service.ts has 800+ lines)
   - Could be split into smaller modules

4. **Missing Repository Pattern**
   - Database queries scattered in services
   - Could benefit from repository layer

## Recommended Best Practices

### 1. **Feature-Based Organization** (Alternative)

For larger applications, consider organizing by feature:

```
src/
├── features/
│   ├── auth/
│   │   ├── auth.controller.ts    # Routes
│   │   ├── auth.service.ts       # Business logic
│   │   ├── auth.repository.ts    # Data access
│   │   ├── auth.types.ts         # Types
│   │   └── auth.test.ts          # Tests
│   ├── grading/
│   │   ├── grading.controller.ts
│   │   ├── grading.service.ts
│   │   └── grading.test.ts
│   └── marketplace/
│       └── ...
├── shared/
│   ├── middleware/
│   ├── utils/
│   └── types/
└── database/
```

### 2. **Add Middleware Layer**

```typescript
// src/middleware/auth.middleware.ts
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded.valid) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = decoded;
  next();
}

// Usage
router.get('/profile', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.userId);
  res.json(profile);
});
```

### 3. **Add Repository Pattern**

```typescript
// src/repositories/user.repository.ts
export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
  
  async create(user: CreateUserDTO): Promise<User> {
    const result = await pool.query(
      'INSERT INTO users (...) VALUES (...) RETURNING *',
      [...]
    );
    return result.rows[0];
  }
}

// src/services/user.service.ts
export class UserService {
  constructor(private userRepo: UserRepository) {}
  
  async getUser(id: string) {
    return await this.userRepo.findById(id);
  }
}
```

### 4. **Add Validation Layer**

```typescript
// src/validators/auth.validator.ts
import Joi from 'joi';

export const loginSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  pin: Joi.string().length(4).pattern(/^\d+$/).required()
});

// Middleware
export function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
}

// Usage
router.post('/login', validate(loginSchema), loginHandler);
```

### 5. **Error Handling**

```typescript
// src/middleware/error.middleware.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
  }
}

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }
  
  // Unexpected errors
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

// Usage in service
if (!user) {
  throw new AppError(404, 'User not found');
}
```

### 6. **Dependency Injection**

```typescript
// src/services/auth.service.ts
export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private tokenService: TokenService,
    private otpService: OTPService
  ) {}
  
  async login(phoneNumber: string, pin: string) {
    const user = await this.userRepo.findByPhone(phoneNumber);
    // ... logic
  }
}

// src/index.ts - Setup DI container
const userRepo = new UserRepository(pool);
const tokenService = new TokenService();
const otpService = new OTPService();
const authService = new AuthService(userRepo, tokenService, otpService);
```

## Module Organization Principles

### SOLID Principles

1. **Single Responsibility**: Each module does one thing
2. **Open/Closed**: Open for extension, closed for modification
3. **Liskov Substitution**: Subtypes must be substitutable
4. **Interface Segregation**: Many specific interfaces > one general
5. **Dependency Inversion**: Depend on abstractions, not concretions

### DRY (Don't Repeat Yourself)
- Extract common logic into utilities
- Reuse types and interfaces
- Share validation schemas

### KISS (Keep It Simple, Stupid)
- Avoid over-engineering
- Start simple, refactor when needed
- Clear naming conventions

### Separation of Concerns
- Each layer has a specific purpose
- No business logic in routes
- No HTTP concerns in services
- No database queries in routes

## Testing Strategy

```
src/
├── services/
│   ├── auth.service.ts
│   ├── auth.service.test.ts        # Unit tests
│   └── auth.service.pbt.test.ts    # Property-based tests
└── __tests__/
    └── workflow.integration.test.ts # Integration tests
```

**Test Types**:
1. **Unit Tests**: Test individual functions in isolation
2. **Property-Based Tests**: Test properties across many inputs
3. **Integration Tests**: Test complete workflows
4. **E2E Tests**: Test through UI (future)

## Documentation

- **API Documentation**: `docs/AUTH-API-GUIDE.md`
- **Database Schema**: `src/database/schema.sql`
- **Setup Guides**: `docs/DATABASE-SETUP.md`
- **Code Comments**: Inline for complex logic

## Next Steps for Better Organization

1. ✅ **Add Middleware Layer**
   - Authentication middleware
   - Validation middleware
   - Error handling middleware

2. ✅ **Implement Repository Pattern**
   - Separate data access from business logic
   - Easier to test and mock

3. ✅ **Add Validation Layer**
   - Use Joi or Zod for schema validation
   - Centralized validation rules

4. ✅ **Split Large Services**
   - auth.service.ts → auth/, profile/, otp/
   - Keep files under 300 lines

5. ✅ **Add Configuration Management**
   - Centralized config file
   - Environment-specific configs
   - Type-safe configuration

6. ✅ **Improve Error Handling**
   - Custom error classes
   - Consistent error responses
   - Error logging

## Conclusion

The current code organization follows a **layered architecture** with clear separation between routes, services, and database layers. This is a solid foundation for a Node.js/Express application.

For continued growth, consider:
- Adding middleware for cross-cutting concerns
- Implementing repository pattern for data access
- Using dependency injection for better testability
- Splitting large services into smaller modules
- Adding comprehensive validation

The key is to **balance simplicity with scalability** - don't over-engineer early, but refactor as the application grows.
