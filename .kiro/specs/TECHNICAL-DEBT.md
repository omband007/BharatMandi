# TODO & Technical Debt

This document tracks known issues, technical debt, and future improvements for the Bharat Mandi POC.

## 🔴 Critical Issues

### SQLite Database Locking
**Status:** Known Issue  
**Priority:** High  
**Description:** SQLite database is being locked by the sync engine, preventing concurrent read operations. This causes the stats endpoint to timeout when trying to query SQLite.

**Current Workaround:** Stats endpoint only shows PostgreSQL data, SQLite shows "N/A"

**Root Cause:** The sync engine holds long-running transactions or locks that block read queries.

**Proper Fix Required:**
1. Refactor sync engine to use shorter transactions
2. Implement proper connection pooling for SQLite
3. Consider using separate read-only connections for stats queries
4. Add transaction timeout handling

**Related Files:**
- `src/shared/database/sync-engine.ts`
- `src/shared/database/sqlite-config.ts`
- `src/features/dev/dev.controller.ts` (stats endpoint)

**Related Code Comments:**
- `src/features/dev/dev.controller.ts:268` - TODO comment about fixing SQLite locking

---

## 🟢 Recently Fixed

### Phone Number Format Compatibility
**Status:** ✅ Fixed  
**Priority:** High  
**Description:** Authentication tile only accepted 10-digit phone numbers (9876543210), but "Create Users" section used international format with country code (+919876543210). This caused incompatibility where users created with +91 prefix couldn't login.

**Solution Implemented:**
- Added `normalizePhoneNumber()` helper function in auth service
- Strips +91 or 91 prefix from phone numbers before validation
- Updated all auth functions: `requestOTP`, `verifyOTP`, `createUser`, `getUserByPhone`, `loginWithPIN`, `loginWithBiometric`, `setupPIN`
- Updated frontend validation to accept both formats
- Changed placeholder text to show both formats are accepted
- All phone numbers are now stored in normalized 10-digit format internally

**Benefits:**
- Users can enter phone numbers with or without +91 prefix
- Consistent storage format in database (10 digits)
- No breaking changes to existing data
- Better user experience

**Related Files:**
- `src/features/auth/auth.service.ts` - Added normalization logic
- `public/index.html` - Updated validation and placeholder text

---

## 🟡 Medium Priority

### Translation Service - AWS SDK Client Mocking
**Status:** Known Issue  
**Priority:** Medium  
**Description:** AWS SDK clients (TranslateClient, ComprehendClient) are instantiated at module load time, making them difficult to mock in unit tests. One test is currently skipped due to this limitation.

**Current Workaround:** Test is marked as `.skip()` with TODO comment

**Impact:**
- Cannot fully test auto-detection feature in isolation
- Reduces test coverage for translation service
- Makes it harder to test error scenarios

**Proper Fix Required:**
1. Refactor TranslationService to accept AWS clients via dependency injection
2. Create factory pattern for AWS client creation
3. Update tests to inject mock clients
4. Remove `.skip()` from auto-detection test

**Related Files:**
- `src/features/i18n/translation.service.ts` - Client instantiation at module level
- `src/features/i18n/__tests__/translation.service.test.ts:150` - Skipped test with TODO

**Suggested Implementation:**
```typescript
// Option 1: Constructor injection
export class TranslationService {
  constructor(
    private translateClient = new TranslateClient(...),
    private comprehendClient = new ComprehendClient(...)
  ) {}
}

// Option 2: Factory pattern
export class AWSClientFactory {
  static createTranslateClient() { ... }
  static createComprehendClient() { ... }
}
```

---

### Translation Service - Cache Hit Rate Tracking
**Status:** Not Implemented  
**Priority:** Medium  
**Description:** `getCacheStats()` returns `hitRate: 0` because we don't track cache hits/misses. This makes it difficult to monitor cache effectiveness and optimize caching strategy.

**Current Behavior:**
- Cache size is tracked (number of keys in Redis)
- Hit rate always shows 0%
- No metrics on cache performance

**Impact:**
- Cannot measure cache effectiveness
- Cannot optimize TTL or preloading strategy
- Missing important performance metric

**Proper Fix Required:**
1. Add Redis counters for hits and misses
2. Increment on cache hit/miss in `translateText()`
3. Calculate hit rate: `hits / (hits + misses) * 100`
4. Consider using Redis INCR for atomic counters
5. Add cache stats reset endpoint

**Related Files:**
- `src/features/i18n/translation.service.ts:195` - `getCacheStats()` method
- `src/features/i18n/i18n.controller.ts` - Cache stats endpoint

**Suggested Implementation:**
```typescript
// Track hits/misses in Redis
private async recordCacheHit() {
  await redis.incr('translation:stats:hits');
}

private async recordCacheMiss() {
  await redis.incr('translation:stats:misses');
}

async getCacheStats() {
  const hits = await redis.get('translation:stats:hits') || 0;
  const misses = await redis.get('translation:stats:misses') || 0;
  const total = hits + misses;
  const hitRate = total > 0 ? (hits / total) * 100 : 0;
  return { hitRate, size, hits, misses };
}
```

---

### Translation Service - Production Credential Management
**Status:** Using Environment Variables  
**Priority:** Medium (before production deployment)  
**Description:** AWS credentials are currently loaded from `.env` file, which is acceptable for development but not ideal for production.

**Current Setup:**
- ✅ `.env` is in `.gitignore` (secure for development)
- ✅ Using environment variables (better than hardcoded)
- ❌ Not using AWS IAM roles or Secrets Manager

**Production Recommendations:**

**Option 1: AWS IAM Roles (Recommended for EC2/ECS)**
- No credentials in code or environment
- Automatic credential rotation
- Fine-grained permissions per service
- Zero credential management overhead

**Option 2: AWS Secrets Manager**
- Centralized credential storage
- Automatic rotation
- Audit logging
- Requires code changes to fetch secrets

**Option 3: AWS Systems Manager Parameter Store**
- Free for standard parameters
- Integrated with IAM
- Good for configuration management

**Migration Steps:**
1. Create IAM role with translate/comprehend permissions
2. Attach role to EC2/ECS instances
3. Remove AWS credentials from environment variables
4. AWS SDK automatically uses IAM role
5. Test in staging environment

**Related Files:**
- `src/features/i18n/translation.service.ts:8-9` - AWS client initialization
- `.env.example` - AWS credential placeholders
- `docs/features/PHASE2-TRANSLATION-SERVICE.md` - Security documentation

---

### Translation Service - ElastiCache Migration Path
**Status:** Using Local Redis  
**Priority:** Low (production optimization)  
**Description:** Currently using local Redis (Docker) for development. Need to migrate to AWS ElastiCache for production to get better performance, availability, and automatic failover.

**Current Setup:**
- Local Redis via Docker Compose
- No encryption in transit
- No automatic backups
- Single instance (no failover)

**ElastiCache Benefits:**
- Automatic failover and replication
- Encryption in transit and at rest
- Automated backups
- CloudWatch monitoring
- Better performance (optimized for AWS)

**Migration Checklist:**
1. Provision ElastiCache Redis cluster (t3.micro for staging)
2. Configure security groups and VPC
3. Enable encryption in transit
4. Update `REDIS_HOST` and `REDIS_PORT` in environment
5. Add `REDIS_PASSWORD` if using AUTH
6. Test connection from application
7. Monitor cache hit rate and performance
8. Set up CloudWatch alarms

**Cost Estimate:**
- t3.micro: ~$12/month
- Data transfer: minimal (same region)
- Backups: included

**Related Files:**
- `docker-compose.yml` - Local Redis configuration
- `src/shared/cache/redis-client.ts` - Redis connection
- `docs/setup/REDIS-SETUP.md` - Migration guide

---

### Listing Creation with Media - Race Condition
**Status:** ✅ Fixed with Production Solution  
**Priority:** Medium  
**Description:** When creating a listing with photos, there was a race condition where the listing was created in PostgreSQL but media upload would fail because the listing wasn't immediately visible for verification.

**Previous Workaround:** Frontend retry logic with exponential backoff (temporary fix)

**Production Solution Implemented:**
- Created new atomic endpoint `/api/marketplace/listings/with-media`
- Handles both listing creation and media upload in a single request
- Eliminates race conditions and timing issues completely
- Frontend automatically uses this endpoint when media files are selected
- Falls back to simple endpoint when no media is provided

**Benefits:**
- No race conditions or timing issues
- Better user experience (single request)
- Proper error handling for partial failures
- Production-ready solution

**Related Files:**
- `src/features/marketplace/marketplace.controller.ts` (new atomic endpoint)
- `public/media-test.html` (updated to use atomic endpoint)

---

### User Creation - JSON Parsing
**Status:** Fixed  
**Priority:** Medium  
**Description:** PostgreSQL JSONB columns return objects directly, not strings. The `mapRowToUser()` method was trying to parse objects as JSON strings.

**Fix Applied:** Added proper type checking before JSON.parse()

**Related Files:**
- `src/shared/database/pg-adapter.ts:232-256`

---

### Phone Number Length
**Status:** Fixed  
**Priority:** Medium  
**Description:** Phone number field was VARCHAR(10) but needed to support international format (+919876543210).

**Fix Applied:** Changed to VARCHAR(15) in PostgreSQL schema

**Related Files:**
- `src/shared/database/pg-schema.sql`
- `fix-phone-length.js` (migration script)

---

### Excessive Logging
**Status:** Fixed  
**Priority:** Medium  
**Description:** ConnectionMonitor was logging every `isConnected()` call, flooding the console.

**Fix Applied:** Removed logging from `isConnected()`, only log on state changes

**Related Files:**
- `src/shared/database/connection-monitor.ts`

---

## 🟢 Low Priority / Future Enhancements

### Multiple DatabaseManager Instances
**Status:** Fixed  
**Priority:** Low  
**Description:** Multiple services were creating their own DatabaseManager instances instead of sharing one.

**Fix Applied:** Made DatabaseManager globally accessible via `(global as any).sharedDbManager`

**Future Improvement:** Use proper dependency injection instead of global variable

**Related Files:**
- `src/app.ts`
- `src/features/marketplace/marketplace.service.ts`
- `src/features/auth/auth.service.ts`
- `src/features/transactions/transaction.service.ts`

---

### Image Loading - File Paths vs URL Paths
**Status:** Fixed  
**Priority:** Low  
**Description:** `uploadToLocal()` was returning file system paths instead of URL paths, causing 404 errors.

**Fix Applied:** Modified to return URL paths: `/data/media/${filePath}`

**Related Files:**
- `src/features/marketplace/storage.service.ts`

---

### Sync Queue Stale Items
**Status:** Fixed  
**Priority:** Low  
**Description:** Sync queue accumulated stale items from old test data, causing foreign key errors.

**Fix Applied:** 
- Auto-remove items after 3 failed attempts
- Silence foreign key constraint errors (stale data)
- Added `/api/dev/clear-sync-queue` endpoint

**Related Files:**
- `src/shared/database/sync-engine.ts`
- `src/features/dev/dev.controller.ts`

---

## 📋 Backlog / Nice to Have

### International Phone Number Support
**Status:** Not Implemented (India-only)  
**Priority:** Medium (for international expansion)  
**Description:** Current implementation only supports Indian phone numbers (+91). Phone numbers are normalized by stripping the +91 prefix and storing only 10 digits. This creates a **collision risk** if the platform expands to other countries.

**Current Behavior:**
- `+919876543210` (India) → stored as `9876543210` ✅
- `+449876543210` (UK) → would also normalize to `9876543210` ❌ **COLLISION!**
- Validation enforces Indian format: 10 digits starting with 6-9

**Limitation:**
- Cannot support users from multiple countries with the same phone number
- Risk of data collision if scope expands internationally

**Future Implementation Options:**

**Option A: Store Full International Format (Recommended)**
- Store phone numbers WITH country code: `+919876543210`
- Update validation to accept any country code
- Add country code dropdown in UI
- Database already supports VARCHAR(15) - no schema change needed
- Migration: Prepend +91 to all existing numbers

**Option B: Separate Country Code Field**
- Add `country_code` column (e.g., "91", "44", "1")
- Store phone number without country code
- Enforce uniqueness on (country_code, phone_number) pair
- Requires schema migration

**Migration Considerations:**
- Existing data: All current numbers are Indian (+91)
- Can safely prepend +91 to all existing records
- Update validation logic to handle multiple country codes
- Update UI to show country code selector

**Related Files:**
- `src/features/auth/auth.service.ts` - `normalizePhoneNumber()` function
- `public/index.html` - Phone number input validation
- `src/shared/database/pg-schema.sql` - Phone number column (already VARCHAR(15))
- `src/shared/database/sqlite-schema.sql` - Phone number column

**Business Impact:**
- Low: Current POC targets Indian market only
- High: If expanding to international markets

---

### Offline Mode Testing
**Status:** Not Implemented  
**Priority:** Low  
**Description:** The dual-database architecture supports offline mode, but there's no easy way to test it in the POC.

**Suggested Implementation:**
- Add a toggle in the UI to simulate offline mode
- Disable PostgreSQL connection temporarily
- Verify SQLite caching works correctly
- Test sync queue when coming back online

---

### WAL Mode Verification
**Status:** Implemented but Unverified  
**Priority:** Low  
**Description:** WAL mode is enabled in SQLite config, but we haven't verified it's actually working.

**Verification Steps:**
```sql
PRAGMA journal_mode; -- Should return 'wal'
```

**Related Files:**
- `src/shared/database/sqlite-config.ts:40`

---

### Connection Pool Configuration
**Status:** Using Defaults  
**Priority:** Low  
**Description:** PostgreSQL connection pool is using default settings. May need tuning for production.

**Suggested Review:**
- Max connections
- Idle timeout
- Connection timeout
- Statement timeout

**Related Files:**
- `src/shared/database/pg-config.ts`

---

## 📝 Documentation Needed

### API Documentation
- Document all REST endpoints
- Add request/response examples
- Document error codes

### Database Schema Documentation
- Document all tables and relationships
- Add ER diagram
- Document sync queue behavior

### Testing Guide
- How to test offline mode
- How to test sync engine
- How to test media upload

---

## 🔧 Code Quality Improvements

### TypeScript Strict Mode
**Status:** Not Enabled  
**Priority:** Low  
**Description:** TypeScript strict mode is not enabled, allowing potential type safety issues.

### Test Coverage
**Status:** Partial  
**Priority:** Medium  
**Description:** Property-based tests exist for some features, but overall test coverage is incomplete.

**Areas Needing Tests:**
- Sync engine edge cases
- Connection monitor state transitions
- Error handling paths

---

## 📊 Monitoring & Observability

### Logging Strategy
**Status:** Ad-hoc  
**Priority:** Low  
**Description:** Logging is inconsistent across the codebase. Need a unified logging strategy.

**Suggested Improvements:**
- Use a proper logging library (winston, pino)
- Define log levels (debug, info, warn, error)
- Add structured logging
- Add request ID tracking

### Metrics
**Status:** Not Implemented  
**Priority:** Low  
**Description:** No metrics collection for monitoring system health.

**Suggested Metrics:**
- Database query latency
- Sync queue size
- Failed sync attempts
- API response times

---

## 🎯 Performance Optimizations

### Database Indexes
**Status:** Basic indexes only  
**Priority:** Medium  
**Description:** Only primary keys and foreign keys are indexed. May need additional indexes for common queries.

**Review Needed:**
- Queries on `listings.is_active`
- Queries on `users.phone_number`
- Queries on `transactions.status`

### Caching Strategy
**Status:** SQLite cache only  
**Priority:** Low  
**Description:** Consider adding Redis or in-memory cache for frequently accessed data.

---

## 🔒 Security Improvements

### Input Validation
**Status:** Basic validation  
**Priority:** Medium  
**Description:** Add comprehensive input validation for all API endpoints.

### Rate Limiting
**Status:** Not Implemented  
**Priority:** Medium  
**Description:** No rate limiting on API endpoints.

### SQL Injection Prevention
**Status:** Using parameterized queries  
**Priority:** ✅ Good  
**Description:** All queries use parameterized statements, preventing SQL injection.

---

## 📅 Maintenance

Last Updated: 2026-02-22  
Maintained By: Development Team

**How to Use This File:**
1. Add new items as they're discovered
2. Update status when work is completed
3. Move completed items to a CHANGELOG.md
4. Review quarterly to prioritize technical debt

