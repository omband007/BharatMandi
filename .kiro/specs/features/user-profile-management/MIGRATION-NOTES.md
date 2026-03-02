# Migration Notes: User Profile Management

## What Changed

### Merged Specifications
- **Old**: `core-profile-management` + `progressive-profile-management` (separate specs)
- **New**: `user-profile-management` (single unified spec)

### Rationale
Progressive profiling is a data collection strategy, not a separate feature. It makes sense to have ONE spec that covers:
1. Core authentication and mandatory fields
2. Progressive collection of optional fields through contextual prompts and implicit updates

### Mobile Number Format Update
- **Input**: Accept both 10 digits (9876543210) OR 13 digits (+919876543210)
- **Normalization**: If 10 digits provided, prepend +91
- **Storage**: Always international format (+91XXXXXXXXXX)
- **Validation**: After normalization, must start with 6-9 (valid Indian mobile)

### Requirements Count
- **Total**: 35 requirements (was 25 in core-profile-management)
- **Added**: 10 progressive profiling requirements (26-35)
  - Req 26: Progressive Data Collection Strategy
  - Req 27: Contextual Prompts for User Type
  - Req 28: Implicit Crop Detection
  - Req 29: Language Preference Detection
  - Req 30: Farm Size Collection
  - Req 31: Profile Completeness Display
  - Req 32: Completion Incentives
  - Req 33: Implicit User Type Inference
  - Req 34: Contextual Prompt Timing
  - Req 35: Profile Analytics

### Removed Content
Gamification, Trust Management, and Referral features have been moved to separate specs:
- `.kiro/specs/features/gamification-system/`
- `.kiro/specs/features/trust-management-system/`
- `.kiro/specs/features/referral-program/`

### Files Migrated
From `progressive-profile-management/`:
- ✅ `design.md` → `user-profile-management/design.md`
- ✅ `tasks.md` → `user-profile-management/tasks.md`
- ✅ `.config.kiro` → `user-profile-management/.config.kiro`
- ❌ `requirements.md` → Deleted (replaced by merged version)
- ❌ `SUMMARY.md` → Deleted (outdated)
- ❌ `UNIFICATION-PLAN.md` → Deleted (executed)

### Next Steps
1. **Update design.md** to reflect mobile number format changes and progressive profiling
2. **Update tasks.md** to remove gamification/trust/referral tasks
3. **Review requirements** with stakeholders
4. **Begin implementation** of unified User Profile Management

## Key Concepts

### Progressive Profiling
- Collect mandatory fields at registration (name, mobile, location)
- Collect optional fields progressively through:
  - **Contextual Prompts**: Ask for data when it's relevant (e.g., farm size when giving fertilizer advice)
  - **Implicit Updates**: Automatically detect and update fields (e.g., crop type from images, language from messages)
- Minimize registration friction while building complete profiles over time

### Authentication Methods
1. **OTP** (always available): SMS-based one-time password
2. **PIN** (optional): 4-6 digit quick login
3. **Biometric** (optional): Fingerprint/Face ID

### Profile Completeness
- Calculated as percentage (0-100%)
- Unlocks features at thresholds (50%, 70%, 90%)
- Motivates users to complete profiles
- Tracks source of each field (prompt, implicit, manual)

## Migration Checklist

- [x] Create unified requirements document
- [x] Update mobile number format to international
- [x] Add progressive profiling requirements
- [x] Move design.md and tasks.md
- [x] Update FEATURE-OVERVIEW.md
- [x] Delete old progressive-profile-management requirements
- [ ] Update design.md for mobile format and progressive profiling
- [ ] Update tasks.md to remove gamification/trust/referral
- [ ] Update implementation code to use international format
- [ ] Update POC UI to use unified spec
