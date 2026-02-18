# Spec Organization Guide

## Overview

This document explains how the Bharat Mandi specifications are organized using a hybrid approach that balances clarity, maintainability, and ease of navigation.

## Organization Principles

### 1. Hierarchical Structure
- **Main Spec** (bharat-mandi): High-level product vision with 30 requirements
- **Child Specs**: Detailed implementation specs for specific features/infrastructure

### 2. Cross-References
- Each child spec links back to parent requirements
- Specs declare dependencies on other specs
- Current State document tracks all specs

### 3. Metadata Headers
Every spec includes YAML front-matter with:
- `parent_spec`: Links to main spec
- `implements_requirements`: Which requirements it fulfills
- `depends_on`: Other specs it depends on
- `status`: ready | in-progress | complete
- `type`: infrastructure | feature | enhancement

### 4. Centralized Index
- `README.md` in specs directory provides overview
- Shows relationships between specs
- Tracks implementation status
- Provides navigation links

## File Structure

```
.kiro/specs/
├── README.md                          # Spec index and overview
├── ORGANIZATION.md                    # This file
│
├── bharat-mandi/                      # Main product spec
│   ├── requirements.md                # 30 high-level requirements
│   ├── design.md                      # Overall architecture
│   ├── tasks.md                       # Master implementation plan
│   └── CURRENT_STATE.md              # Progress tracker with spec links
│
├── database-sync-postgresql-sqlite/   # Infrastructure spec
│   ├── requirements.md                # 9 requirements (with metadata)
│   ├── design.md                      # Technical design (with metadata)
│   └── tasks.md                       # 14 implementation tasks
│
├── persist-listings-transactions/     # Feature spec
│   ├── requirements.md                # 7 requirements (with metadata)
│   ├── design.md                      # Technical design (with metadata)
│   └── tasks.md                       # 13 implementation tasks
│
└── listing-media-support/             # Feature enhancement spec
    ├── requirements.md                # 8 requirements (with metadata)
    ├── design.md                      # Technical design (with metadata)
    └── tasks.md                       # 16 implementation tasks
```

## Metadata Format

### Requirements Document Header
```markdown
---
parent_spec: bharat-mandi
implements_requirements: [6, 7]
depends_on: [database-sync-postgresql-sqlite]
status: complete
type: feature
---

# Requirements Document

**Parent Spec:** [Bharat Mandi](../bharat-mandi/requirements.md) - Requirements 6 & 7  
**Depends On:** [Dual Database Sync](../database-sync-postgresql-sqlite/requirements.md)  
**Status:** ✅ Complete

## Introduction
...
```

### Design Document Header
```markdown
---
parent_spec: bharat-mandi
implements_requirements: [6, 7]
depends_on: [database-sync-postgresql-sqlite]
status: complete
type: feature
---

# Design Document: Feature Name

**Parent Spec:** [Bharat Mandi Design](../bharat-mandi/design.md)  
**Related Requirements:** [Feature Requirements](./requirements.md)  
**Depends On:** [Dependency Design](../dependency-spec/design.md)  
**Status:** ✅ Complete

## Overview
...
```

## Status Indicators

| Symbol | Meaning | Description |
|--------|---------|-------------|
| ✅ | Complete | Implemented and tested |
| 🚧 | In Progress | Partially implemented |
| 📝 | Spec Ready | Requirements and design complete, ready for implementation |
| ❌ | Not Started | No spec or implementation yet |

## Spec Types

### Infrastructure
Foundation components used by multiple features.
- Example: database-sync-postgresql-sqlite
- No direct user-facing functionality
- Provides services to other specs

### Feature
Complete user-facing functionality.
- Example: persist-listings-transactions
- Implements one or more main requirements
- May depend on infrastructure specs

### Enhancement
Extends existing features with additional capabilities.
- Example: listing-media-support
- Enhances existing feature specs
- Depends on the feature it extends

## Navigation Paths

### For New Developers
1. Start: [Spec Index](./README.md)
2. Read: [Main Requirements](./bharat-mandi/requirements.md)
3. Check: [Current State](./bharat-mandi/CURRENT_STATE.md)
4. Explore: Individual feature specs

### For Implementation
1. Pick a spec from [Spec Index](./README.md)
2. Read requirements document
3. Review design document
4. Follow tasks document
5. Update [Current State](./bharat-mandi/CURRENT_STATE.md) when done

### For Understanding Dependencies
1. Check metadata header in spec
2. Follow `depends_on` links
3. Review [Spec Relationships](./README.md#spec-relationships) diagram

## Cross-Reference Examples

### In Main Spec (bharat-mandi/requirements.md)
```markdown
### Requirement 6: Digital Mandi (Marketplace)
...
**Implementation Specs:**
- [Persist Listings & Transactions](../persist-listings-transactions/requirements.md) ✅
- [Listing Media Support](../listing-media-support/requirements.md) 📝
```

### In Child Spec (listing-media-support/requirements.md)
```markdown
**Parent Spec:** [Bharat Mandi](../bharat-mandi/requirements.md) - Requirement 6
**Depends On:** [Dual Database Sync](../database-sync-postgresql-sqlite/requirements.md)
```

### In Current State (bharat-mandi/CURRENT_STATE.md)
```markdown
### 3. Marketplace (Digital Mandi)
- ✅ Create produce listings
- 🚧 Media support - [spec ready](../listing-media-support/)
- **Specs**: 
  - [persist-listings-transactions](../persist-listings-transactions/) ✅
  - [listing-media-support](../listing-media-support/) 📝
```

## Benefits of This Approach

### ✅ Clear Hierarchy
- Easy to understand parent-child relationships
- Main spec stays high-level and readable
- Child specs provide implementation details

### ✅ Independent Work
- Teams can work on different specs simultaneously
- Each spec is self-contained
- Dependencies are explicit

### ✅ Easy Navigation
- Centralized index for quick access
- Cross-references for context
- Status tracking in one place

### ✅ Maintainability
- Update child specs without touching main spec
- Add new specs without restructuring
- Clear ownership and scope

### ✅ Discoverability
- New developers can quickly find relevant specs
- Relationships are explicit
- Progress is visible

## Creating a New Spec

### Step 1: Create Directory
```bash
mkdir .kiro/specs/[feature-name]
```

### Step 2: Create Files
```bash
touch .kiro/specs/[feature-name]/requirements.md
touch .kiro/specs/[feature-name]/design.md
touch .kiro/specs/[feature-name]/tasks.md
```

### Step 3: Add Metadata
Add YAML front-matter to requirements.md and design.md:
```yaml
---
parent_spec: bharat-mandi
implements_requirements: [X, Y]
depends_on: [spec-a, spec-b]
status: ready
type: feature | infrastructure | enhancement
---
```

### Step 4: Add Cross-References
Add links to parent spec and dependencies after the metadata.

### Step 5: Update Index
Add entry to [Spec Index](./README.md) with:
- Spec name and link
- Status indicator
- Brief description
- Key features
- Dependencies

### Step 6: Update Current State
Add spec link to [Current State](./bharat-mandi/CURRENT_STATE.md) under relevant feature.

## Maintenance Guidelines

### When Completing a Spec
1. Update status in metadata: `status: complete`
2. Update status in [Spec Index](./README.md): ✅
3. Update [Current State](./bharat-mandi/CURRENT_STATE.md)
4. Add implementation notes if needed

### When Starting a Spec
1. Create spec with `status: in-progress`
2. Update [Spec Index](./README.md): 🚧
3. Update [Current State](./bharat-mandi/CURRENT_STATE.md)

### When Spec is Ready for Implementation
1. Set `status: ready` in metadata
2. Update [Spec Index](./README.md): 📝
3. Ensure all cross-references are correct

## Questions?

- Check [Spec Index](./README.md) for overview
- Review existing specs for examples
- See [Current State](./bharat-mandi/CURRENT_STATE.md) for progress
