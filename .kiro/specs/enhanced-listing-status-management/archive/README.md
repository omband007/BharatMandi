# Archive - Historical Design Documents

This folder contains historical documents that explain major design decisions and feature additions to the enhanced listing status management spec.

## Documents

### EXPIRATION-MODEL-UPDATE.md
**Date**: Initial spec creation  
**Purpose**: Documents the shift from simple harvest date expiration to perishability-based expiration model

**Key Changes**:
- Introduced produce categories (Leafy Greens, Fruits, Root Vegetables, Grains)
- Changed expiration formula from `harvest_date + 24h grace period` to `harvest_date + category_expiry_period`
- Added support for PRE_HARVEST and POST_HARVEST listing types

**Status**: Fully integrated into requirements.md and design.md

---

### MANUAL-SALE-CONFIRMATION.md
**Date**: Feature addition  
**Purpose**: Documents the addition of manual sale confirmation and direct payment support

**Key Changes**:
- Added payment method preference (PLATFORM_ONLY, DIRECT_ONLY, BOTH)
- Added sale channel tracking (PLATFORM_ESCROW, PLATFORM_DIRECT, EXTERNAL)
- Added manual sale confirmation for external sales
- Added COMPLETED_DIRECT transaction state for direct payments
- Added sales analytics by channel

**Status**: Fully integrated into requirements.md, design.md, STATE-SYNCHRONIZATION.md, and state-diagrams.md

---

## Why Keep These Documents?

1. **Historical Context** - Understand why certain design decisions were made
2. **Onboarding** - Help new team members understand the evolution of the spec
3. **Decision Trail** - Document the reasoning behind major changes
4. **Reference** - Useful when similar features need to be added in the future

## Current Spec Files

For the current, authoritative specification, refer to:
- `../requirements.md` - All requirements (21 total)
- `../design.md` - Complete technical design (HLD + LLD)
- `../tasks.md` - Implementation task breakdown
- `../STATE-SYNCHRONIZATION.md` - State machine synchronization rules
- `../../shared/state-diagrams.md` - Visual state diagrams
