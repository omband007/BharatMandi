# Bharat Mandi Specifications

## Overview

This directory contains all specifications for the Bharat Mandi agricultural marketplace platform. Specs are organized to mirror the `src/` code structure, making it easy to find the spec for any feature.

**Key Principle:** Spec paths match code paths exactly.
- Code: `src/features/auth/` → Spec: `.kiro/specs/features/auth/`
- Code: `src/shared/database/` → Spec: `.kiro/specs/shared/database/`

## Quick Navigation

- **[Main Product Spec](#main-specification)** - High-level vision (30 requirements)
- **[Feature Specs](#feature-specs)** - Detailed feature implementations
- **[Infrastructure Specs](#infrastructure-specs)** - Shared infrastructure
- **[Current State](#progress-summary)** - Implementation progress
- **[Organization Guide](./ORGANIZATION.md)** - How specs are structured

---

## Main Specification

### [Bharat Mandi Main](./bharat-mandi-main/)
**High-level product vision and architecture**

- **[Requirements](./bharat-mandi-main/requirements.md)** - 30 high-level requirements
- **[Design](./bharat-mandi-main/design.md)** - Overall architecture
- **[Tasks](./bharat-mandi-main/tasks.md)** - Master implementation plan
- **[Current State](./bharat-mandi-main/CURRENT_STATE.md)** - Progress tracker

---

## Feature Specs

Feature specs mirror `src/features/` structure and contain detailed requirements, design, and tasks.

### [Authentication](./features/auth/)
**User registration, login, and profile management**

- **Code:** `src/features/auth/`
- **Status:** ✅ Complete
- **Implements:** Requirement 5 (User Authentication)
- **Depends On:** shared/database

**Files:**
- [Requirements](./features/auth/requirements.md) - OTP registration, PIN login, account lockout
- [Design](./features/auth/design.md) - Architecture, security, API endpoints
- [Tasks](./features/auth/tasks.md) - Implementation tasks (all complete)

**Key Features:**
- OTP-based registration
- PIN/biometric login
- JWT token management
- Account lockout protection (3 attempts, 30 min)
- Profile management

---

### [Grading](./features/grading/)
**AI-powered produce quality grading**

- **Code:** `src/features/grading/`
- **Status:** 🚧 Partial (basic implementation exists)
- **Implements:** Requirement 1 (Fasal-Parakh)
- **Depends On:** shared/database

**Files:**
- [Requirements](./features/grading/requirements.md) - AI grading, quality certificates
- [Design](./features/grading/design.md) - AI models, grading logic, certificates
- [Tasks](./features/grading/tasks.md) - Implementation tasks

**Key Features:**
- AI crop detection (10+ crops)
- Quality grading (A/B/C)
- Digital Quality Certificates
- Offline grading with color-based fallback
- Hugging Face ViT model integration

---

### [Marketplace](./features/marketplace/)
**Produce listings, transactions, and media**

- **Code:** `src/features/marketplace/` and `src/features/transactions/`
- **Status:** ✅ Complete (persistence), 📝 Ready (media)
- **Implements:** Requirements 6 & 7 (Digital Mandi, Transactions)
- **Depends On:** shared/database

**Core Files:**
- [Requirements](./features/marketplace/requirements.md) - Listings and transactions persistence
- [Design](./features/marketplace/design.md) - Database schemas, service layer
- [Tasks](./features/marketplace/tasks.md) - Implementation tasks (complete)

**Media Enhancement Files:**
- [Media Requirements](./features/marketplace/media-requirements.md) - Photos, videos, PDFs
- [Media Design](./features/marketplace/media-design.md) - Storage, sync, API
- [Media Tasks](./features/marketplace/media-tasks.md) - Implementation tasks (ready)

**Key Features:**
- Marketplace listings with CRUD operations
- Transaction management with escrow
- Offline support with automatic sync
- **Media support (ready to implement):**
  - Photos (≤5MB), Videos (≤50MB), PDFs (≤10MB)
  - Max 10 media items per listing
  - Primary media selection and reordering
  - Offline upload queue
  - AWS S3 storage with signed URLs

---

### [Transactions](./features/transactions/)
**Transaction and escrow management**

- **Code:** `src/features/transactions/`
- **Status:** ✅ Complete
- **Implements:** Requirement 7 (Transaction Management)
- **Depends On:** shared/database, features/marketplace

**Files:**
- [Requirements](./features/transactions/requirements.md) - Transaction lifecycle, escrow
- [Design](./features/transactions/design.md) - Transaction states, escrow logic
- [Tasks](./features/transactions/tasks.md) - Implementation tasks (complete)

**Key Features:**
- Purchase request flow
- Transaction status tracking
- Escrow account creation and locking
- Payment release
- Offline transaction support

---

## Infrastructure Specs

Infrastructure specs mirror `src/shared/` structure and provide foundation for features.

### [Database](./shared/database/)
**Dual database architecture (PostgreSQL + SQLite)**

- **Code:** `src/shared/database/`
- **Status:** ✅ Complete
- **Implements:** Requirement 8 (Offline Functionality)
- **Used By:** All features

**Files:**
- [Requirements](./shared/database/requirements.md) - 9 requirements for offline-first architecture
- [Design](./shared/database/design.md) - Connection monitoring, sync engine, retry logic
- [Tasks](./shared/database/tasks.md) - 14 implementation tasks (complete)

**Key Components:**
- **PostgreSQLAdapter** - Primary database operations
- **SQLiteAdapter** - Offline cache operations
- **DatabaseManager** - Unified interface with automatic routing
- **ConnectionMonitor** - Checks connectivity every 30 seconds
- **SyncEngine** - Automatic sync with exponential backoff (2s, 4s, 8s)

**Key Features:**
- PostgreSQL-first writes with SQLite fallback
- Read operations fall back to SQLite when offline
- Automatic bidirectional sync
- Retry logic with exponential backoff
- 71 automated tests passing

---

## Spec Structure

Each feature/infrastructure spec contains:

```
features/[feature-name]/
├── requirements.md    # Detailed requirements
├── design.md         # Technical design
└── tasks.md          # Implementation tasks
```

### Metadata Format

Every spec includes YAML front-matter:

```yaml
---
parent_spec: bharat-mandi-main
implements_requirements: [5, 6]
depends_on: [shared/database]
status: complete | in-progress | ready
type: feature | infrastructure | enhancement
code_location: src/features/[feature-name]/
---
```

---

## Progress Summary

### Implementation Status

| Feature | Status | Spec Location | Code Location |
|---------|--------|---------------|---------------|
| **Infrastructure** |
| Dual Database | ✅ Complete | [shared/database](./shared/database/) | `src/shared/database/` |
| **Features** |
| Authentication | ✅ Complete | [features/auth](./features/auth/) | `src/features/auth/` |
| Grading | 🚧 Partial | [features/grading](./features/grading/) | `src/features/grading/` |
| Marketplace | ✅ Complete | [features/marketplace](./features/marketplace/) | `src/features/marketplace/` |
| Marketplace Media | 📝 Spec Ready | [features/marketplace](./features/marketplace/) | `src/features/marketplace/` |
| Transactions | ✅ Complete | [features/transactions](./features/transactions/) | `src/features/transactions/` |

### Requirements Coverage

- **Total Requirements:** 30
- **Fully Implemented:** 5 (16.7%)
  - Req 5: Authentication ✅
  - Req 6: Marketplace ✅
  - Req 7: Transactions ✅
  - Req 8: Offline Functionality ✅
  - Req 1: Grading (partial) 🚧
- **Spec Ready:** 1 (3.3%)
  - Req 6: Marketplace Media 📝
- **Not Started:** 24 (80%)

**Legend:**
- ✅ Complete - Implemented and tested
- 🚧 Partial - Some components implemented
- 📝 Spec Ready - Requirements and design complete, ready for implementation
- ❌ Not Started - No spec or implementation yet

---

## Dependency Graph

```
bharat-mandi-main (high-level vision)
│
├── shared/database (infrastructure)
│   └── Used by: all features
│
└── features/
    ├── auth
    │   └── Depends on: shared/database
    │
    ├── grading
    │   └── Depends on: shared/database
    │
    ├── marketplace
    │   ├── Depends on: shared/database
    │   └── Media enhancement ready
    │
    └── transactions
        ├── Depends on: shared/database
        └── Depends on: features/marketplace
```

---

## How to Use These Specs

### For New Developers

1. **Start with the vision:** Read [Bharat Mandi Main Requirements](./bharat-mandi-main/requirements.md)
2. **Check progress:** See [Current State](./bharat-mandi-main/CURRENT_STATE.md)
3. **Understand infrastructure:** Review [Database Spec](./shared/database/)
4. **Pick a feature:** Choose from [Feature Specs](#feature-specs)
5. **Find the code:** Use `code_location` in spec metadata

### For Implementation

1. **Read requirements:** Understand user needs and acceptance criteria
2. **Review design:** Study technical approach and architecture
3. **Follow tasks:** Step-by-step implementation guide
4. **Update status:** Mark tasks complete as you go
5. **Update Current State:** Link to your completed spec

### For Finding Specs

**Rule:** Spec path = Code path (replace `src/` with `.kiro/specs/`)

Examples:
- Working on `src/features/auth/`? → Check `.kiro/specs/features/auth/`
- Working on `src/shared/database/`? → Check `.kiro/specs/shared/database/`
- Working on `src/features/marketplace/`? → Check `.kiro/specs/features/marketplace/`

---

## Creating New Specs

### Step 1: Create Directory

Mirror the code structure:
```bash
mkdir -p .kiro/specs/features/[feature-name]
```

### Step 2: Create Files

```bash
touch .kiro/specs/features/[feature-name]/requirements.md
touch .kiro/specs/features/[feature-name]/design.md
touch .kiro/specs/features/[feature-name]/tasks.md
```

### Step 3: Add Metadata

Add YAML front-matter to each file:
```yaml
---
parent_spec: bharat-mandi-main
implements_requirements: [X]
depends_on: [shared/database]
status: ready
type: feature
code_location: src/features/[feature-name]/
---
```

### Step 4: Update This README

Add your spec to the appropriate section above.

### Step 5: Update Current State

Link to your spec in [Current State](./bharat-mandi-main/CURRENT_STATE.md).

---

## Related Documentation

- **[Organization Guide](./ORGANIZATION.md)** - Detailed spec organization principles
- **[Reorganization Summary](./REORGANIZATION-SUMMARY.md)** - Recent changes
- **[Main README](../../README.md)** - Project overview and setup
- **[Architecture Docs](../../docs/)** - Technical documentation
- **[Database Documentation](../../docs/DATABASE-DOCUMENTATION.md)** - Database details

---

## Contributing

When adding new features:

1. **Create spec first** - Requirements → Design → Tasks
2. **Mirror code structure** - Spec path matches code path
3. **Add metadata** - Include all required YAML fields
4. **Link to parent** - Reference main requirements
5. **Update this README** - Add to appropriate section
6. **Update Current State** - Track progress

---

## Questions?

- **Can't find a spec?** Follow the code path: `src/X/Y/` → `.kiro/specs/X/Y/`
- **Need examples?** Check existing specs like [auth](./features/auth/) or [database](./shared/database/)
- **Want to understand organization?** Read [ORGANIZATION.md](./ORGANIZATION.md)
- **Looking for progress?** See [Current State](./bharat-mandi-main/CURRENT_STATE.md)
