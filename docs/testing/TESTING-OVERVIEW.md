# Testing Strategy Overview
## Bharat Mandi Application

**Quick Overview:** Comprehensive test automation strategy with 5 test types, CI/CD integration, and 90% coverage target.

---

## Test Pyramid

```
                    E2E Tests (5%)
                   ┌──────────────┐
                   │ 🎭 User      │
                   │ Workflows    │
                   └──────────────┘
                  
            Integration Tests (25%)
           ┌────────────────────────┐
           │ 🔗 API, Database,     │
           │ AWS Services          │
           └────────────────────────┘
          
              Unit Tests (70%)
         ┌──────────────────────────────┐
         │ ⚡ Business Logic,           │
         │ Services, Utilities          │
         └──────────────────────────────┘
```

---

## Test Types at a Glance

| Type | % | Speed | When to Run | Purpose |
|------|---|-------|-------------|---------|
| **Unit** | 70% | < 1ms | Every save | Test individual functions |
| **Property-Based** | 5% | ~100ms | Every commit | Validate universal properties |
| **Integration** | 25% | ~1s | Every PR | Test component interactions |
| **E2E** | 5% | ~30s | Nightly | Test user workflows |
| **Performance** | - | ~5min | Weekly | Validate SLAs |

---

## Quick Commands

### Development
```bash
npm run test:watch          # Auto-run on file changes
npm test -- path/to/file    # Run specific file
npm run test:debug          # Debug tests
```

### By Test Type
```bash
npm run test:unit           # Unit tests only
npm run test:pbt            # Property-based tests
npm run test:integration    # Integration tests
npm run test:e2e            # End-to-end tests
```

### Coverage & CI
```bash
npm run test:coverage       # Generate coverage report
npm run test:ci             # Fast CI suite
npm run test:all            # Complete test suite
```

---

## Test Execution Schedule

### Developer Workflow
```
Code Change
    ↓
Watch Mode (< 1s)
    ↓
Pre-commit Hook (< 30s)
    ↓
Push to Remote
    ↓
CI Pipeline
```

### CI/CD Pipeline

| Stage | Tests | Duration | Trigger |
|-------|-------|----------|---------|
| **Fast Feedback** | Unit + Property | < 5min | Every push |
| **Integration** | API + DB + AWS | < 15min | Every PR |
| **E2E** | Critical paths | < 30min | Nightly |
| **Extended** | Full suite | < 2hr | Weekly |

---

## Coverage Goals

| Metric | Target | Minimum | Enforced |
|--------|--------|---------|----------|
| Overall | 90% | 80% | ✅ Yes |
| Business Logic | 95% | 90% | ✅ Yes |
| Services | 90% | 85% | ✅ Yes |
| Controllers | 85% | 80% | ⚠️ Warning |

---

## Test File Naming

```
src/features/i18n/
├── __tests__/
│   ├── i18n.service.test.ts          ← Unit tests
│   ├── i18n.service.pbt.test.ts      ← Property-based tests
│   ├── i18n.integration.test.ts      ← Integration tests
│   └── i18n.e2e.test.ts              ← E2E tests
├── i18n.service.ts
└── i18n.controller.ts
```

---

## Quality Gates

### Pre-Commit ✅
- Unit tests pass
- Property tests pass
- Linting passes
- Type checking passes

### PR Merge ✅
- All automated tests pass
- Coverage ≥ 80%
- Code review approved
- No security vulnerabilities

### Production Deploy ✅
- Full test suite passes
- Performance tests pass
- Security scan clean
- Manual QA sign-off

---

## Current Status

### Implemented ✅
- [x] Unit test framework (Jest)
- [x] Property-based testing (fast-check)
- [x] Test scripts in package.json
- [x] GitHub Actions workflow
- [x] Coverage thresholds
- [x] I18n service tests (71 tests)
- [x] Marketplace validation tests
- [x] Database abstraction tests

### In Progress 🚧
- [ ] Integration test suite
- [ ] E2E test framework
- [ ] Performance test suite
- [ ] Security test automation

### Planned 📋
- [ ] Visual regression testing
- [ ] Accessibility testing automation
- [ ] Load testing with Artillery
- [ ] Contract testing for APIs

---

## Test Metrics Dashboard

### Current Coverage
```
┌─────────────┬─────────┬──────────┬──────────┬─────────┐
│ Component   │ Stmts   │ Branch   │ Funcs    │ Lines   │
├─────────────┼─────────┼──────────┼──────────┼─────────┤
│ I18n        │ 95%     │ 90%      │ 95%      │ 95%     │
│ Marketplace │ 85%     │ 80%      │ 85%      │ 85%     │
│ Database    │ 90%     │ 85%      │ 90%      │ 90%     │
│ Overall     │ TBD     │ TBD      │ TBD      │ TBD     │
└─────────────┴─────────┴──────────┴──────────┴─────────┘
```

### Test Count by Type
```
Unit Tests:              51 (I18n) + 30 (Marketplace) + 25 (Database) = 106
Property-Based Tests:    20 (I18n) + 10 (Marketplace) = 30
Integration Tests:       TBD
E2E Tests:              TBD
Total:                  136+ tests
```

---

## Tools & Frameworks

| Category | Tool | Purpose |
|----------|------|---------|
| Test Runner | Jest | All test types |
| Property Testing | fast-check | Generative testing |
| API Testing | Supertest | HTTP endpoints |
| Mocking | Jest | Mocks & spies |
| Coverage | Jest | Code coverage |
| CI/CD | GitHub Actions | Automation |

---

## Key Features

### 1. Fast Feedback Loop
- Tests run in < 1 second during development
- Immediate feedback on code changes
- Watch mode for continuous testing

### 2. Property-Based Testing
- Generates 100-1000 test cases automatically
- Finds edge cases developers miss
- Validates universal correctness properties

### 3. Comprehensive Coverage
- 90% code coverage target
- All critical paths tested
- Edge cases and error handling covered

### 4. CI/CD Integration
- Automated testing on every push
- Quality gates before merge
- Nightly regression testing

### 5. Multi-Environment Testing
- Local development (SQLite)
- CI/CD (Docker containers)
- Staging (AWS services)
- Production (monitored)

---

## Best Practices

### ✅ Do
- Write tests before code (TDD)
- Test one thing per test
- Use descriptive test names
- Mock external dependencies
- Clean up after tests
- Run tests frequently

### ❌ Don't
- Test implementation details
- Write flaky tests
- Skip test cleanup
- Ignore failing tests
- Test third-party code
- Write slow tests

---

## Resources

📚 **Documentation**
- [Complete Test Strategy](./TEST-STRATEGY.md) - Full strategy document
- [Quick Reference](./TESTING-QUICK-REFERENCE.md) - Commands and patterns
- [I18n Test Coverage](./I18N-TEST-COVERAGE.md) - I18n test details

🔗 **External Resources**
- [Jest Documentation](https://jestjs.io/)
- [fast-check Guide](https://fast-check.dev/)
- [Testing Best Practices](https://testingjavascript.com/)

---

## Next Steps

1. ✅ **Completed:** Unit and property-based tests for I18n
2. 🚧 **In Progress:** Integration tests for database operations
3. 📋 **Next:** E2E tests for critical user workflows
4. 📋 **Future:** Performance and security test automation

---

**Last Updated:** February 25, 2026  
**Maintained By:** Engineering Team  
**Review Cycle:** Monthly
