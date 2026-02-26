# Bharat Mandi Specifications

This directory contains all specification documents for the Bharat Mandi project, organized by category for easy navigation.

## Directory Structure

```
.kiro/specs/
├── bharat-mandi-main/     # Main product specification
├── features/              # Functional feature specifications
│   ├── auth/              # Authentication & user management
│   ├── deployment/        # Deployment specifications
│   ├── grading/           # AI-powered produce grading
│   ├── marketplace/       # Marketplace listings & media
│   ├── multi-language-support/  # Internationalization
│   └── transactions/      # Transaction & escrow management
├── shared/                # Shared infrastructure
│   └── database/          # Dual database architecture
├── tests/                 # Test specifications
│   ├── controller-tests/  # Controller integration tests (7 specs)
│   ├── service-tests/     # Service unit tests (1 spec)
│   └── bugfixes/          # Bug fix specifications (4 specs)
├── ORGANIZATION.md        # Detailed organization guide
├── README.md              # This file
└── TECHNICAL-DEBT.md      # Known issues and improvements
```

## Quick Navigation

### Main Specification
- **[Bharat Mandi Main](./bharat-mandi-main/)** - High-level product vision (30 requirements)

### Functional Features
- **[Authentication](./features/auth/)** - User registration, login, profile management ✅
- **[Grading](./features/grading/)** - AI-powered produce quality grading 🚧
- **[Marketplace](./features/marketplace/)** - Produce listings, transactions, media ✅
- **[Transactions](./features/transactions/)** - Transaction & escrow management ✅
- **[Multi-Language Support](./features/multi-language-support/)** - Internationalization 📝
- **[Deployment](./features/deployment/aws-deployment/)** - AWS infrastructure 📝

### Infrastructure
- **[Database](./shared/database/)** - Dual database architecture (PostgreSQL + SQLite) ✅

### Test Specifications
- **[Controller Tests](./tests/controller-tests/)** - 7 controller test specs (80%+ coverage target)
- **[Service Tests](./tests/service-tests/)** - 1 service test spec (80%+ coverage target)
- **[Bug Fixes](./tests/bugfixes/)** - 4 bug fix specifications

---

## Specification Types

### Feature Specifications (`features/`)
New features and enhancements follow the **Requirements-First Workflow**:
1. **requirements.md** - EARS-compliant requirements with acceptance criteria
2. **design.md** - Architecture, correctness properties, implementation plan
3. **tasks.md** - Detailed implementation tasks with checkpoints
4. **.config.kiro** - Spec metadata and configuration

### Test Specifications (`tests/`)
Test specs are organized by type:
- **controller-tests/** - Integration tests for API controllers (80%+ coverage)
- **service-tests/** - Unit tests for service layer (80%+ coverage)
- **bugfixes/** - Specifications for fixing failing tests

All test specs follow the requirements-first workflow with comprehensive mocking strategies.

---

## Test Specifications Status

### Completed & Passing ✅
- **auth-controller-tests** - 108 tests, 89% coverage
- **auth-service-tests** - 108 tests, 89% coverage
- **marketplace-controller-tests** - 67 tests, 93% coverage
- **fix-media-controller-tests** - 17 tests passing
- **fix-media-service-mocks** - 21 tests passing
- **fix-video-validation-pbt** - 26 tests passing
- **fix-sync-engine-mocks** - 33 tests passing

### Ready for Implementation 📋
- **transaction-controller-tests** - 7 endpoints, spec complete
- **grading-controller-tests** - 2 endpoints, spec complete
- **i18n-controller-tests** - 5 endpoints, spec complete
- **dev-controller-tests** - 6 endpoints, spec complete
- **users-controller-tests** - 2 endpoints, spec complete

---

## Getting Started

1. **Review Organization**: Check [ORGANIZATION.md](./ORGANIZATION.md) for detailed structure
2. **Check Technical Debt**: Review [TECHNICAL-DEBT.md](./TECHNICAL-DEBT.md) for known issues
3. **Start Implementation**: Open any spec's `tasks.md` and begin
4. **Create New Specs**: Follow the requirements-first workflow

---

## Workflow Guidelines

### Requirements-First Workflow
1. Start with `requirements.md` - Define WHAT needs to be built
2. Create `design.md` - Define HOW it will be built
3. Generate `tasks.md` - Break down implementation into actionable tasks
4. Execute tasks incrementally with checkpoints

### Test Development
- Target 80%+ code coverage for all controllers and services
- Use complete mocking for fast, isolated tests
- Include property-based testing where applicable
- Verify error response consistency
- Follow test pyramid: 70% unit, 25% integration, 5% E2E

---

## Related Documentation

- [Test Compliance Report](../../docs/testing/TEST-COMPLIANCE-REPORT.md)
- [Coverage Baseline](../../docs/testing/COVERAGE-BASELINE.md)
- [Main Project README](../../README.md)

---

## Quick Links

### Controller Tests
- [Auth Controller](./tests/controller-tests/auth-controller-tests/)
- [Marketplace Controller](./tests/controller-tests/marketplace-controller-tests/)
- [Transaction Controller](./tests/controller-tests/transaction-controller-tests/)
- [Grading Controller](./tests/controller-tests/grading-controller-tests/)
- [I18n Controller](./tests/controller-tests/i18n-controller-tests/)
- [Dev Controller](./tests/controller-tests/dev-controller-tests/)
- [Users Controller](./tests/controller-tests/users-controller-tests/)

### Service Tests
- [Auth Service](./tests/service-tests/auth-service-tests/)

### Bug Fixes
- [Media Controller Fix](./tests/bugfixes/fix-media-controller-tests/)
- [Media Service Mocks Fix](./tests/bugfixes/fix-media-service-mocks/)
- [Sync Engine Mocks Fix](./tests/bugfixes/fix-sync-engine-mocks/)
- [Video Validation PBT Fix](./tests/bugfixes/fix-video-validation-pbt/)

---

**Legend:**
- ✅ Complete - Implemented and tested
- 🚧 Partial - Some components implemented
- 📝 Spec Ready - Requirements and design complete, ready for implementation
