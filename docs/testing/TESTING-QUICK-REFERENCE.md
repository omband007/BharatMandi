# Testing Quick Reference Guide

Quick commands and patterns for testing Bharat Mandi application.

## Quick Commands

### Development
```bash
# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run specific test file
npm test -- path/to/file.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle"

# Debug tests
npm run test:debug
```

### Unit Tests
```bash
# All unit tests
npm run test:unit

# Specific feature
npm test -- src/features/i18n/__tests__/

# With coverage
npm run test:coverage
```

### Property-Based Tests
```bash
# All property tests
npm run test:pbt

# Specific property test
npm test -- src/features/i18n/__tests__/i18n.service.pbt.test.ts
```

### Integration Tests
```bash
# All integration tests
npm run test:integration

# Database tests only
npm run test:db

# AWS tests only
npm run test:aws
```

### E2E Tests
```bash
# All E2E tests
npm run test:e2e

# Critical paths only
npm run test:e2e:critical
```

### CI/CD
```bash
# Run CI test suite (fast)
npm run test:ci

# Run all tests
npm run test:all
```

## Test File Naming

| Test Type | Pattern | Example |
|-----------|---------|---------|
| Unit | `*.test.ts` | `i18n.service.test.ts` |
| Property-Based | `*.pbt.test.ts` | `i18n.service.pbt.test.ts` |
| Integration | `*.integration.test.ts` | `api.integration.test.ts` |
| Database | `*.db.test.ts` | `sync-engine.db.test.ts` |
| AWS | `*.aws.test.ts` | `translate.aws.test.ts` |
| E2E | `*.e2e.test.ts` | `farmer-workflow.e2e.test.ts` |

## Test Structure

### Unit Test Template
```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
  });

  describe('methodName', () => {
    it('should handle happy path', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = service.methodName(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      // Test edge case
    });

    it('should throw on invalid input', () => {
      expect(() => service.methodName(null)).toThrow();
    });
  });
});
```

### Property-Based Test Template
```typescript
import * as fc from 'fast-check';

describe('ServiceName - Properties', () => {
  it('should satisfy property', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const result = service.methodName(input);
          return result.length > 0; // Property to validate
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Common Assertions

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(4.2, 1);

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('error message');

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

## Mocking

### Mock Functions
```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(2);
```

### Mock Modules
```typescript
jest.mock('../module', () => ({
  functionName: jest.fn().mockReturnValue('mocked')
}));
```

### Mock Database
```typescript
const mockDb = {
  getUserById: jest.fn().mockResolvedValue({ id: '123' }),
  updateUser: jest.fn().mockResolvedValue(undefined)
};

(global as any).sharedDbManager = mockDb;
```

## Property-Based Testing Generators

```typescript
import * as fc from 'fast-check';

// Primitives
fc.boolean()
fc.integer()
fc.double()
fc.string()
fc.uuid()

// Constrained
fc.integer({ min: 0, max: 100 })
fc.double({ min: 0, max: 1, noNaN: true })
fc.string({ minLength: 1, maxLength: 50 })

// Collections
fc.array(fc.integer())
fc.set(fc.string())
fc.dictionary(fc.string(), fc.integer())

// Dates
fc.date()
fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })

// Custom
fc.constantFrom('en', 'hi', 'pa') // Pick from list
fc.oneof(fc.string(), fc.integer()) // Union type
```

## Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# Generate HTML report
npm run test:coverage:report

# View HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

## Debugging Tests

### VS Code Launch Config
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Single Test
```bash
# Add debugger statement in test
it('should debug', () => {
  debugger;
  expect(true).toBe(true);
});

# Run with debug
npm run test:debug -- path/to/test.ts
```

## Test Data Factories

```typescript
// factories/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  id: uuid(),
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  languagePreference: 'en',
  ...overrides
});

// Usage
const user = createTestUser({ name: 'John Doe' });
```

## Common Patterns

### Test Database Setup
```typescript
beforeAll(async () => {
  testDb = await createTestDatabase();
  await runMigrations(testDb);
});

afterAll(async () => {
  await testDb.close();
});

afterEach(async () => {
  await clearTestData(testDb);
});
```

### Test Async Code
```typescript
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBe('value');
});

it('should handle promises', () => {
  return asyncFunction().then(result => {
    expect(result).toBe('value');
  });
});
```

### Test Timers
```typescript
jest.useFakeTimers();

it('should handle timeout', () => {
  const callback = jest.fn();
  setTimeout(callback, 1000);
  
  jest.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
```

## Performance Tips

1. **Use `beforeEach` wisely** - Only set up what's needed
2. **Mock expensive operations** - Database, API calls, file I/O
3. **Run tests in parallel** - Jest does this by default
4. **Use `--maxWorkers`** - Limit parallel workers if needed
5. **Skip slow tests in watch mode** - Use `.skip` or `.only`

## Troubleshooting

### Tests Timing Out
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // test code
}, 30000); // 30 seconds

// Or globally in jest.config.js
testTimeout: 10000
```

### Flaky Tests
```typescript
// Add retry logic
jest.retryTimes(3);

// Or use test.concurrent for parallel execution
test.concurrent('test 1', async () => {});
test.concurrent('test 2', async () => {});
```

### Memory Leaks
```bash
# Run with memory leak detection
npm test -- --detectLeaks

# Run with heap snapshot
npm test -- --logHeapUsage
```

## CI/CD Integration

### Pre-commit Hook
```bash
# .husky/pre-commit
npm run test:unit
npm run test:pbt
```

### GitHub Actions
```yaml
- name: Run tests
  run: npm run test:ci
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [fast-check Documentation](https://fast-check.dev/)
- [Test Strategy Document](./TEST-STRATEGY.md)
- [I18n Test Coverage](./I18N-TEST-COVERAGE.md)
