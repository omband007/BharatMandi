# Test Strategy & Automation Framework
## Bharat Mandi Application

**Version:** 1.0  
**Date:** February 25, 2026  
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Principles](#testing-principles)
3. [Test Types & Pyramid](#test-types--pyramid)
4. [Test Automation Strategy](#test-automation-strategy)
5. [Test Execution Schedule](#test-execution-schedule)
6. [CI/CD Integration](#cicd-integration)
7. [Test Environment Strategy](#test-environment-strategy)
8. [Coverage Goals](#coverage-goals)
9. [Tools & Frameworks](#tools--frameworks)
10. [Test Data Management](#test-data-management)
11. [Quality Gates](#quality-gates)

---

## Overview

This document defines the comprehensive testing strategy for Bharat Mandi, a multi-language agricultural marketplace platform with offline-first capabilities, dual-database architecture, and AWS cloud integration.

### Application Characteristics

- **Architecture:** Dual-database (PostgreSQL + SQLite) with sync engine
- **Languages:** 11 Indian languages with i18n support
- **Cloud Services:** AWS (Translate, Transcribe, Polly, Lex, S3, ElastiCache)
- **Offline Support:** SQLite with background sync
- **Critical Features:** Marketplace, Transactions, Grading, Multi-language, Voice interface

### Testing Objectives

1. Ensure correctness of business logic across all features
2. Validate data integrity in dual-database architecture
3. Verify multi-language functionality for all 11 languages
4. Ensure offline-first capabilities work reliably
5. Validate AWS service integrations
6. Maintain 90%+ code coverage
7. Catch regressions early through automated testing
8. Ensure performance meets SLA requirements

---

## Testing Principles

### 1. Test-Driven Development (TDD)
- Write tests before implementation for critical features
- Use property-based testing for universal correctness properties
- Maintain test-first mindset for new features

### 2. Testing Pyramid
```
           /\
          /  \    E2E Tests (5%)
         /____\   - Critical user journeys
        /      \  - Cross-feature workflows
       /________\ Integration Tests (25%)
      /          \ - API endpoints
     /            \ - Database operations
    /______________\ - AWS service calls
   /                \
  /                  \ Unit Tests (70%)
 /____________________\ - Business logic
                        - Utilities
                        - Services
```

### 3. Shift-Left Testing
- Run fast tests (unit, property-based) on every commit
- Run integration tests on every PR
- Run E2E tests before deployment
- Catch issues early in development cycle

### 4. Test Isolation
- Each test should be independent
- Use mocks/stubs for external dependencies
- Clean up test data after each test
- Avoid test interdependencies

### 5. Continuous Testing
- Automated test execution in CI/CD pipeline
- Fast feedback loops (< 5 minutes for unit tests)
- Parallel test execution where possible
- Fail fast on critical test failures

---

## Test Types & Pyramid

### 1. Unit Tests (70% of tests)

**Purpose:** Test individual functions, classes, and modules in isolation

**Characteristics:**
- Fast execution (< 1ms per test)
- No external dependencies (mocked)
- High coverage (90%+ target)
- Run on every file save (watch mode)

**What to Test:**
- Business logic in services
- Utility functions
- Data transformations
- Validation logic
- Error handling
- Edge cases

**Example Files:**
- `src/features/i18n/__tests__/i18n.service.test.ts`
- `src/features/marketplace/__tests__/validation.service.test.ts`
- `src/shared/database/__tests__/db-abstraction.test.ts`

**Naming Convention:** `*.test.ts`

**Run Command:**
```bash
npm test                          # All unit tests
npm test -- --watch              # Watch mode
npm test -- path/to/file.test.ts # Specific file
```

**When to Run:**
- ✅ On every file save (watch mode during development)
- ✅ On every commit (pre-commit hook)
- ✅ In CI/CD pipeline (every push)
- ✅ Before PR merge

---

### 2. Property-Based Tests (5% of tests)

**Purpose:** Validate universal correctness properties using generative testing

**Characteristics:**
- Generate hundreds of test cases automatically
- Find edge cases developers might miss
- Validate mathematical properties
- Shrink failing cases to minimal examples

**What to Test:**
- Idempotence (f(f(x)) = f(x))
- Commutativity (f(a,b) = f(b,a))
- Round-trip properties (encode/decode, format/parse)
- Invariants (properties that always hold)
- Consistency across inputs

**Example Files:**
- `src/features/i18n/__tests__/i18n.service.pbt.test.ts`
- `src/features/marketplace/__tests__/media.service.pbt.test.ts`

**Naming Convention:** `*.pbt.test.ts`

**Run Command:**
```bash
npm test -- *.pbt.test.ts        # All property tests
npm test -- --testNamePattern="Property" # By name
```

**When to Run:**
- ✅ On every commit (pre-commit hook)
- ✅ In CI/CD pipeline (every push)
- ✅ Before PR merge
- ⚠️ Can be slower (100-1000 runs per property)

---

### 3. Integration Tests (25% of tests)

**Purpose:** Test interactions between components and external systems

**Characteristics:**
- Medium execution time (100ms - 1s per test)
- Real database connections (test databases)
- Real AWS SDK calls (mocked or test accounts)
- Test component interactions

**What to Test:**
- API endpoint responses
- Database CRUD operations
- Database sync engine
- AWS service integrations
- File system operations
- Cache operations (Redis/ElastiCache)

**Test Categories:**

#### 3a. API Integration Tests
```typescript
// Test HTTP endpoints with supertest
describe('POST /api/listings', () => {
  it('should create listing and return 201', async () => {
    const response = await request(app)
      .post('/api/listings')
      .send(validListingData)
      .expect(201);
    
    expect(response.body.id).toBeDefined();
  });
});
```

**Naming Convention:** `*.integration.test.ts`

#### 3b. Database Integration Tests
```typescript
// Test with real database connections
describe('DatabaseManager Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  it('should sync data between PostgreSQL and SQLite', async () => {
    // Test actual database operations
  });
});
```

**Naming Convention:** `*.db.test.ts`

#### 3c. AWS Integration Tests
```typescript
// Test with AWS SDK (mocked or test account)
describe('TranslationService AWS Integration', () => {
  it('should translate text using AWS Translate', async () => {
    // Test with real AWS SDK calls
  });
});
```

**Naming Convention:** `*.aws.test.ts`

**Run Command:**
```bash
npm run test:integration         # All integration tests
npm run test:db                  # Database tests only
npm run test:aws                 # AWS tests only
```

**When to Run:**
- ✅ On every PR (before merge)
- ✅ In CI/CD pipeline (staging deployment)
- ✅ Nightly builds
- ❌ Not on every commit (too slow)

---

### 4. End-to-End (E2E) Tests (5% of tests)

**Purpose:** Test complete user workflows from UI to database

**Characteristics:**
- Slow execution (5-30s per test)
- Full application stack running
- Real browser interactions (if web UI exists)
- Test critical user journeys

**What to Test:**
- Complete user workflows
- Multi-step processes
- Cross-feature interactions
- Critical business scenarios

**Critical User Journeys:**

1. **Farmer Creates Listing**
   - Login → Create Listing → Upload Photos → Submit → Verify in DB

2. **Buyer Searches and Purchases**
   - Login → Search → View Listing → Initiate Transaction → Payment

3. **Multi-Language Workflow**
   - Change Language → Create Listing → Verify Translation → Switch Language

4. **Offline-to-Online Sync**
   - Go Offline → Create Listing → Go Online → Verify Sync

5. **Voice Interface**
   - Voice Input → Transcription → Action → Voice Output

**Naming Convention:** `*.e2e.test.ts`

**Run Command:**
```bash
npm run test:e2e                 # All E2E tests
npm run test:e2e:critical        # Critical paths only
```

**When to Run:**
- ✅ Before production deployment
- ✅ In CI/CD pipeline (pre-production)
- ✅ Nightly builds
- ✅ Weekly regression suite
- ❌ Not on every commit
- ❌ Not on every PR (too slow)

---

### 5. Performance Tests

**Purpose:** Validate performance requirements and SLAs

**Characteristics:**
- Load testing
- Stress testing
- Endurance testing
- Spike testing

**What to Test:**
- API response times (< 200ms for 95th percentile)
- Database query performance
- Translation cache hit rate (> 90%)
- Language switching speed (< 100ms)
- Concurrent user load (1000+ users)
- Memory usage under load
- Database sync performance

**Tools:**
- Artillery (load testing)
- k6 (performance testing)
- Apache JMeter (stress testing)

**Naming Convention:** `*.perf.test.ts`

**Run Command:**
```bash
npm run test:perf                # All performance tests
npm run test:load                # Load tests
npm run test:stress              # Stress tests
```

**When to Run:**
- ✅ Weekly performance regression tests
- ✅ Before major releases
- ✅ After performance-critical changes
- ❌ Not in regular CI/CD pipeline

---

### 6. Security Tests

**Purpose:** Identify security vulnerabilities

**What to Test:**
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization
- Data encryption
- API rate limiting
- Input validation
- Dependency vulnerabilities

**Tools:**
- npm audit (dependency scanning)
- OWASP ZAP (penetration testing)
- Snyk (vulnerability scanning)

**Run Command:**
```bash
npm audit                        # Dependency vulnerabilities
npm run test:security            # Security test suite
```

**When to Run:**
- ✅ Weekly security scans
- ✅ Before production deployment
- ✅ After dependency updates
- ✅ Quarterly penetration testing

---

### 7. Accessibility Tests

**Purpose:** Ensure application is accessible to all users

**What to Test:**
- Screen reader compatibility
- Keyboard navigation
- ARIA labels
- Color contrast
- Font scaling
- Multi-language text rendering

**Tools:**
- axe-core (automated accessibility testing)
- WAVE (web accessibility evaluation)
- Manual testing with screen readers

**Run Command:**
```bash
npm run test:a11y                # Accessibility tests
```

**When to Run:**
- ✅ On UI changes
- ✅ Before major releases
- ✅ Monthly accessibility audits

---

## Test Automation Strategy

### Test Organization

```
src/
├── features/
│   ├── i18n/
│   │   ├── __tests__/
│   │   │   ├── i18n.service.test.ts          # Unit tests
│   │   │   ├── i18n.service.pbt.test.ts      # Property-based tests
│   │   │   ├── i18n.integration.test.ts      # Integration tests
│   │   │   └── i18n.e2e.test.ts              # E2E tests
│   │   ├── i18n.service.ts
│   │   └── i18n.controller.ts
│   ├── marketplace/
│   │   ├── __tests__/
│   │   │   ├── media.service.test.ts
│   │   │   ├── media.service.pbt.test.ts
│   │   │   └── media.integration.test.ts
│   │   └── ...
│   └── ...
├── shared/
│   ├── database/
│   │   ├── __tests__/
│   │   │   ├── db-abstraction.test.ts
│   │   │   ├── sync-engine.test.ts
│   │   │   └── db.integration.test.ts
│   │   └── ...
│   └── ...
└── __tests__/
    ├── e2e/                                   # E2E test suites
    │   ├── farmer-workflow.e2e.test.ts
    │   ├── buyer-workflow.e2e.test.ts
    │   └── multilang-workflow.e2e.test.ts
    ├── integration/                           # Cross-feature integration
    │   └── marketplace-transaction.integration.test.ts
    └── performance/                           # Performance tests
        ├── api-load.perf.test.ts
        └── database-stress.perf.test.ts
```

### Test Naming Conventions

| Test Type | File Pattern | Example |
|-----------|-------------|---------|
| Unit | `*.test.ts` | `i18n.service.test.ts` |
| Property-Based | `*.pbt.test.ts` | `i18n.service.pbt.test.ts` |
| Integration | `*.integration.test.ts` | `api.integration.test.ts` |
| Database | `*.db.test.ts` | `sync-engine.db.test.ts` |
| AWS | `*.aws.test.ts` | `translate.aws.test.ts` |
| E2E | `*.e2e.test.ts` | `farmer-workflow.e2e.test.ts` |
| Performance | `*.perf.test.ts` | `api-load.perf.test.ts` |

---

## Test Execution Schedule

### Developer Workflow

```
┌─────────────────┐
│  Code Change    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Watch Mode     │ ← Unit tests run automatically
│  (< 1 second)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Pre-commit     │ ← Unit + Property tests
│  Hook           │   (< 30 seconds)
│  (Husky)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Push to        │
│  Remote         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CI Pipeline    │ ← All automated tests
│  Triggered      │
└─────────────────┘
```

### CI/CD Pipeline Stages

#### Stage 1: Fast Feedback (< 5 minutes)
```yaml
- Lint code (ESLint, Prettier)
- Type check (TypeScript)
- Unit tests (all)
- Property-based tests (all)
- Code coverage check (> 90%)
```

**Trigger:** Every push to any branch  
**Fail Fast:** Yes  
**Parallel:** Yes

#### Stage 2: Integration (< 15 minutes)
```yaml
- Setup test databases (PostgreSQL, SQLite, MongoDB)
- Database integration tests
- API integration tests
- AWS integration tests (mocked)
- Teardown test databases
```

**Trigger:** Every PR, main branch push  
**Fail Fast:** Yes  
**Parallel:** By category

#### Stage 3: E2E & Performance (< 30 minutes)
```yaml
- Deploy to test environment
- Run critical E2E tests
- Run smoke tests
- Basic performance checks
- Teardown test environment
```

**Trigger:** PR to main, scheduled (nightly)  
**Fail Fast:** No (collect all results)  
**Parallel:** By workflow

#### Stage 4: Extended Testing (< 2 hours)
```yaml
- Full E2E test suite
- Performance regression tests
- Load testing
- Security scans
- Accessibility tests
```

**Trigger:** Scheduled (nightly, weekly)  
**Fail Fast:** No  
**Parallel:** Yes

### Scheduled Test Runs

| Schedule | Tests | Duration | Purpose |
|----------|-------|----------|---------|
| **On Save** | Unit (watch mode) | < 1s | Immediate feedback |
| **On Commit** | Unit + Property | < 30s | Pre-commit validation |
| **On Push** | Unit + Property + Lint | < 5min | Fast CI feedback |
| **On PR** | + Integration | < 15min | PR validation |
| **Nightly** | + E2E + Performance | < 2hr | Regression detection |
| **Weekly** | + Security + Load | < 4hr | Comprehensive validation |
| **Pre-Release** | Full suite + Manual | < 8hr | Release readiness |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:e2e
```

### Quality Gates

Tests must pass before:
- ✅ Merging PR to main
- ✅ Deploying to staging
- ✅ Deploying to production
- ✅ Creating release tag

---

## Test Environment Strategy

### Environment Matrix

| Environment | Purpose | Database | AWS | Duration |
|-------------|---------|----------|-----|----------|
| **Local Dev** | Development | SQLite | Mocked | Permanent |
| **Test** | Automated tests | In-memory | Mocked | Per test run |
| **Integration** | Integration tests | Docker containers | Test account | Per test run |
| **Staging** | Pre-production | AWS RDS | Real services | Persistent |
| **Production** | Live | AWS RDS | Real services | Persistent |

### Test Database Strategy

#### Unit Tests
- Use mocked database manager
- No real database connections
- Fast, isolated tests

#### Integration Tests
```typescript
// Setup test database before tests
beforeAll(async () => {
  testDb = await createTestDatabase();
  await runMigrations(testDb);
  await seedTestData(testDb);
});

// Clean up after tests
afterAll(async () => {
  await testDb.close();
  await dropTestDatabase();
});

// Clean between tests
afterEach(async () => {
  await clearTestData(testDb);
});
```

#### E2E Tests
- Use dedicated test environment
- Reset database before each test suite
- Seed with realistic test data

### Test Data Management

#### Test Data Principles
1. **Isolation:** Each test creates its own data
2. **Cleanup:** Always clean up after tests
3. **Realistic:** Use production-like data
4. **Minimal:** Only create necessary data
5. **Deterministic:** Same data every run

#### Test Data Factories
```typescript
// factories/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  id: uuid(),
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  languagePreference: 'en',
  ...overrides
});

// factories/listing.factory.ts
export const createTestListing = (overrides = {}) => ({
  id: uuid(),
  title: 'Test Listing',
  price: 100,
  quantity: 10,
  ...overrides
});
```

---

## Coverage Goals

### Code Coverage Targets

| Metric | Target | Minimum | Current |
|--------|--------|---------|---------|
| **Overall** | 90% | 80% | TBD |
| **Statements** | 90% | 80% | TBD |
| **Branches** | 85% | 75% | TBD |
| **Functions** | 90% | 80% | TBD |
| **Lines** | 90% | 80% | TBD |

### Coverage by Component

| Component | Target | Priority |
|-----------|--------|----------|
| **Business Logic** | 95% | Critical |
| **Services** | 90% | High |
| **Controllers** | 85% | High |
| **Utilities** | 95% | High |
| **Database Layer** | 90% | Critical |
| **API Routes** | 85% | High |
| **UI Components** | 80% | Medium |

### Coverage Enforcement

```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    },
    "src/features/*/": {
      "statements": 90,
      "branches": 85,
      "functions": 90,
      "lines": 90
    }
  }
}
```

### Coverage Reports

- Generate on every CI run
- Publish to coverage service (Codecov, Coveralls)
- Track trends over time
- Block PRs that decrease coverage

---

## Tools & Frameworks

### Testing Stack

| Category | Tool | Purpose |
|----------|------|---------|
| **Test Runner** | Jest | Unit, integration, E2E tests |
| **Assertions** | Jest (built-in) | Test assertions |
| **Mocking** | Jest (built-in) | Mocks, spies, stubs |
| **Property Testing** | fast-check | Property-based tests |
| **API Testing** | Supertest | HTTP endpoint testing |
| **E2E Testing** | Playwright | Browser automation |
| **Load Testing** | Artillery | Performance testing |
| **Coverage** | Jest (built-in) | Code coverage |
| **Linting** | ESLint | Code quality |
| **Formatting** | Prettier | Code formatting |

### NPM Scripts

```json
{
  "scripts": {
    // Development
    "test": "jest --config config/jest.config.js",
    "test:watch": "jest --watch --config config/jest.config.js",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    
    // Unit & Property Tests
    "test:unit": "jest --testPathPattern='\\.test\\.ts$'",
    "test:pbt": "jest --testPathPattern='\\.pbt\\.test\\.ts$'",
    
    // Integration Tests
    "test:integration": "jest --testPathPattern='\\.integration\\.test\\.ts$'",
    "test:db": "jest --testPathPattern='\\.db\\.test\\.ts$'",
    "test:aws": "jest --testPathPattern='\\.aws\\.test\\.ts$'",
    
    // E2E Tests
    "test:e2e": "jest --testPathPattern='\\.e2e\\.test\\.ts$'",
    "test:e2e:critical": "jest --testPathPattern='\\.e2e\\.test\\.ts$' --testNamePattern='Critical'",
    
    // Performance Tests
    "test:perf": "artillery run tests/performance/load-test.yml",
    "test:load": "artillery run tests/performance/load-test.yml",
    "test:stress": "artillery run tests/performance/stress-test.yml",
    
    // Coverage
    "test:coverage": "jest --coverage --config config/jest.config.js",
    "test:coverage:report": "jest --coverage --coverageReporters=html",
    
    // Quality
    "test:security": "npm audit && snyk test",
    "test:a11y": "jest --testPathPattern='\\.a11y\\.test\\.ts$'",
    
    // CI/CD
    "test:ci": "npm run test:unit && npm run test:pbt && npm run test:integration",
    "test:all": "npm run test:ci && npm run test:e2e"
  }
}
```

---

## Quality Gates

### Pre-Commit Checks (Husky)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting
npm run lint

# Run unit tests
npm run test:unit

# Run property-based tests
npm run test:pbt

# Check coverage
npm run test:coverage
```

### PR Merge Requirements

- ✅ All unit tests pass
- ✅ All property-based tests pass
- ✅ All integration tests pass
- ✅ Code coverage ≥ 80%
- ✅ No linting errors
- ✅ No TypeScript errors
- ✅ Code review approved
- ✅ No security vulnerabilities

### Deployment Gates

#### Staging Deployment
- ✅ All automated tests pass
- ✅ Integration tests pass
- ✅ Basic E2E tests pass
- ✅ No critical bugs

#### Production Deployment
- ✅ All tests pass (including full E2E suite)
- ✅ Performance tests pass
- ✅ Security scan clean
- ✅ Staging validation complete
- ✅ Manual QA sign-off
- ✅ Product owner approval

---

## Test Maintenance

### Regular Activities

#### Daily
- Monitor test failures in CI
- Fix flaky tests immediately
- Review test coverage reports

#### Weekly
- Review and update test data
- Refactor slow tests
- Update test documentation
- Run full security scan

#### Monthly
- Review test strategy effectiveness
- Update test coverage goals
- Conduct test retrospective
- Archive obsolete tests

#### Quarterly
- Comprehensive test suite audit
- Performance test baseline update
- Security penetration testing
- Accessibility audit

---

## Metrics & Monitoring

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Test Pass Rate** | 100% | < 95% |
| **Test Execution Time** | < 5min (unit) | > 10min |
| **Code Coverage** | > 90% | < 80% |
| **Flaky Test Rate** | < 1% | > 5% |
| **Test Maintenance Time** | < 10% dev time | > 20% |
| **Bug Escape Rate** | < 5% | > 10% |

### Dashboards

1. **Test Health Dashboard**
   - Pass/fail trends
   - Execution time trends
   - Coverage trends
   - Flaky test tracking

2. **Quality Dashboard**
   - Bug density
   - Defect escape rate
   - Test effectiveness
   - Technical debt

---

## Appendix

### Test Template Examples

#### Unit Test Template
```typescript
// src/features/example/__tests__/example.service.test.ts
import { ExampleService } from '../example.service';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
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

    it('should throw error on invalid input', () => {
      expect(() => service.methodName(null)).toThrow();
    });
  });
});
```

#### Property-Based Test Template
```typescript
// src/features/example/__tests__/example.service.pbt.test.ts
import * as fc from 'fast-check';
import { ExampleService } from '../example.service';

describe('ExampleService - Property Tests', () => {
  const service = new ExampleService();

  describe('Property: Idempotence', () => {
    it('should return same result when called twice', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result1 = service.methodName(input);
            const result2 = service.methodName(input);
            return result1 === result2;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
```

### References

- [Jest Documentation](https://jestjs.io/)
- [fast-check Documentation](https://fast-check.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)

---

**Document Owner:** Engineering Team  
**Last Updated:** February 25, 2026  
**Next Review:** May 25, 2026
