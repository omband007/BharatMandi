# Specs Organization Guide

## Overview

This document explains how the Bharat Mandi specifications are organized to separate functional features from test specifications, making navigation and maintenance easier.

## Organization Principles

### 1. Clear Separation
- **Functional Specs** (`features/`, `shared/`) - Product features and infrastructure
- **Test Specs** (`tests/`) - All testing-related specifications
- **Main Spec** (`bharat-mandi-main/`) - High-level product vision

### 2. Hierarchical Structure
- Main spec contains 30 high-level requirements
- Feature specs implement specific requirements
- Test specs validate feature implementations
- Infrastructure specs provide foundation for features

### 3. Metadata Headers
Every spec includes YAML front-matter with:
- `parent_spec`: Links to main spec
- `implements_requirements`: Which requirements it fulfills
- `depends_on`: Other specs it depends on
- `status`: ready | in-progress | complete
- `type`: infrastructure | feature | enhancement | test

---

## Directory Structure

```
.kiro/specs/
├── bharat-mandi-main/          # Main product specification
│   ├── requirements.md         # 30 high-level requirements
│   ├── design.md              # Overall architecture
│   ├── tasks.md               # Master implementation plan
│   └── CURRENT_STATE.md       # Progress tracker
│
├── features/                   # Functional feature specifications
│   ├── auth/                  # Authentication & user management
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   ├── deployment/            # Deployment specifications
│   │   └── aws-deployment/
│   ├── grading/               # AI-powered produce grading
│   ├── marketplace/           # Marketplace listings & media
│   ├── multi-language-support/ # Internationalization
│   └── transactions/          # Transaction & escrow management
│
├── shared/                     # Shared infrastructure
│   └── database/              # Dual database architecture
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
│
├── tests/                      # Test specifications
│   ├── controller-tests/      # Controller integration tests
│   │   ├── auth-controller-tests/
│   │   ├── marketplace-controller-tests/
│   │   ├── transaction-controller-tests/
│   │   ├── grading-controller-tests/
│   │   ├── i18n-controller-tests/
│   │   ├── dev-controller-tests/
│   │   └── users-controller-tests/
│   ├── service-tests/         # Service unit tests
│   │   └── auth-service-tests/
│   └── bugfixes/              # Bug fix specifications
│       ├── fix-media-controller-tests/
│       ├── fix-media-service-mocks/
│       ├── fix-sync-engine-mocks/
│       └── fix-video-validation-pbt/
│
├── ORGANIZATION.md             # This file
├── README.md                   # Spec index and overview
└── TECHNICAL-DEBT.md          # Known issues and improvements
```

---

## Spec Categories

### Main Specification (`bharat-mandi-main/`)
High-level product vision with 30 requirements that define the entire platform. All other specs reference and implement these requirements.

### Functional Features (`features/`)
User-facing functionality and capabilities:
- **auth** - User registration, login, profile management
- **grading** - AI-powered produce quality grading
- **marketplace** - Produce listings, transactions, media
- **transactions** - Transaction lifecycle and escrow
- **multi-language-support** - Internationalization (i18n)
- **deployment** - Cloud infrastructure and deployment

### Infrastructure (`shared/`)
Foundation components used by multiple features:
- **database** - Dual database architecture (PostgreSQL + SQLite)
- Provides offline-first capabilities
- Used by all features

### Test Specifications (`tests/`)
Testing-related specs organized by test type:

#### Controller Tests (`tests/controller-tests/`)
Integration tests for API controllers:
- Target: 80%+ code coverage
- Complete service mocking for isolation
- Property-based testing where applicable
- Error response consistency verification

#### Service Tests (`tests/service-tests/`)
Unit tests for service layer:
- Target: 80%+ code coverage
- Complete database and dependency mocking
- Property-based testing for business logic
- Comprehensive edge case coverage

#### Bug Fixes (`tests/bugfixes/`)
Specifications for fixing failing tests:
- Problem description and root cause analysis
- Fix approach and verification plan
- Implementation tasks with checkpoints

---

## Spec Structure

Each spec contains:

```
spec-name/
├── requirements.md    # Detailed requirements (or bugfix.md for bugs)
├── design.md         # Technical design
├── tasks.md          # Implementation tasks
└── .config.kiro      # Spec metadata
```

### Metadata Format

```yaml
---
parent_spec: bharat-mandi-main
implements_requirements: [X, Y]
depends_on: [shared/database]
status: ready | in-progress | complete
type: feature | infrastructure | test | bugfix
---
```

---

## Status Indicators

| Symbol | Meaning | Description |
|--------|---------|-------------|
| ✅ | Complete | Implemented and tested |
| 🚧 | In Progress | Partially implemented |
| 📝 | Spec Ready | Requirements and design complete, ready for implementation |
| ❌ | Not Started | No spec or implementation yet |

---

## Navigation Paths

### For New Developers
1. Start: [Spec Index](./README.md)
2. Read: [Main Requirements](./bharat-mandi-main/requirements.md)
3. Check: [Current State](./bharat-mandi-main/CURRENT_STATE.md)
4. Explore: Individual feature specs in `features/`

### For Implementation
1. Pick a spec from [Spec Index](./README.md)
2. Read requirements document
3. Review design document
4. Follow tasks document
5. Update status as you progress

### For Testing
1. Browse `tests/` directory
2. Choose controller-tests, service-tests, or bugfixes
3. Review requirements and design
4. Implement tests following tasks.md

---

## Benefits of This Organization

### ✅ Clear Separation
- Functional specs separated from test specs
- Easy to find what you're looking for
- Reduced cognitive load

### ✅ Scalable Structure
- Easy to add new features in `features/`
- Easy to add new tests in `tests/`
- Clear categorization

### ✅ Easy Navigation
- Centralized index for quick access
- Logical grouping by purpose
- Status tracking in one place

### ✅ Maintainability
- Update specs without affecting others
- Clear ownership and scope
- Explicit dependencies

### ✅ Discoverability
- New developers can quickly find relevant specs
- Relationships are explicit
- Progress is visible

---

## Creating a New Spec

### For Features
```bash
mkdir -p .kiro/specs/features/[feature-name]
cd .kiro/specs/features/[feature-name]
touch requirements.md design.md tasks.md
```

### For Tests
```bash
mkdir -p .kiro/specs/tests/controller-tests/[controller-name]-tests
cd .kiro/specs/tests/controller-tests/[controller-name]-tests
touch requirements.md design.md tasks.md
```

### Add Metadata
Add YAML front-matter to requirements.md and design.md:
```yaml
---
parent_spec: bharat-mandi-main
implements_requirements: [X]
depends_on: [shared/database]
status: ready
type: feature | test | bugfix
---
```

### Update Index
Add entry to [README.md](./README.md) in the appropriate section.

---

## Maintenance Guidelines

### When Completing a Spec
1. Update status in metadata: `status: complete`
2. Update status in [README.md](./README.md): ✅
3. Update [Current State](./bharat-mandi-main/CURRENT_STATE.md) if applicable

### When Starting a Spec
1. Create spec with `status: in-progress`
2. Update [README.md](./README.md): 🚧

### When Spec is Ready for Implementation
1. Set `status: ready` in metadata
2. Update [README.md](./README.md): 📝
3. Ensure all cross-references are correct

---

## Questions?

- Check [README.md](./README.md) for overview
- Review existing specs for examples
- See [Current State](./bharat-mandi-main/CURRENT_STATE.md) for progress
