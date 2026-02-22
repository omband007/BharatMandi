# Dual Database System - Testing Guide

## Overview
This guide helps you test the dual database system (PostgreSQL + SQLite) manually.

## Prerequisites

1. **PostgreSQL 18** installed and running
2. **Database created**: `bharat_mandi`
3. **User**: `postgres` with password `PGSql`
4. **SQLite database**: Already exists at `data/offline.db`

## Setup

### 1. Initialize PostgreSQL Schema

```bash
# Connect to PostgreSQL and create the database
psql -U postgres

# In psql:
CREATE DATABASE bharat_mandi;
\c bharat_mandi

# Run the schema file
\i src/shared/database/pg-schema.sql

# Verify tables were created
\dt

# You should see: users, otp_sessions, sync_status
```

Or run directly from command line:
```bash
psql -U postgres -d bharat_mandi -f src/shared/database/pg-schema.sql
```

### 2. Update Application to Start DatabaseManager

Add to `src/app.ts` or `src/index.ts`:

```typescript
import { DatabaseManager } from './shared/database/db-abstraction';

// Create and start the database manager
const dbManager = new DatabaseManager();
dbManager.start();

console.log('[App] DatabaseManager started - monitoring PostgreSQL connectivity');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[App] Shutting down...');
  dbManager.stop();
  process.exit(0);
});
```

### 3. Build and Start the Server

```bash
npm run build
npm start
```

## Manual Test Scenarios

### Test 1: Normal Operation (Both Databases Online)

**Goal**: Verify data is written to PostgreSQL and cached in SQLite

1. **Create a user via API**:
```bash
# Request OTP
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210"}'

# Verify OTP (check console logs for OTP)
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210", "otp": "123456"}'

# Create user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "name": "Test User",
    "userType": "FARMER",
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "address": "New Delhi"
    }
  }'
```

2. **Verify in PostgreSQL**:
```bash
psql -U postgres -d bharat_mandi

SELECT * FROM users WHERE phone_number = '9876543210';
```

3. **Verify in SQLite**:
```bash
# Using sqlite3 CLI
sqlite3 data/offline.db

SELECT * FROM users WHERE phone_number = '9876543210';
```

**Expected**: User exists in BOTH databases with same data

---

### Test 2: PostgreSQL Offline (Fallback to SQLite)

**Goal**: Verify reads fall back to SQLite when PostgreSQL is unavailable

1. **Stop PostgreSQL**:
```bash
# Windows
net stop postgresql-x64-18

# Or stop via Services app
```

2. **Try to read user**:
```bash
curl http://localhost:3000/api/users/9876543210
```

3. **Check server logs**:
```
[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.
```

**Expected**: 
- User data is returned from SQLite
- Warning logged about stale data
- No errors

---

### Test 3: Offline Write Operations (Queue for Sync)

**Goal**: Verify writes are queued when PostgreSQL is offline

1. **Ensure PostgreSQL is still stopped**

2. **Try to create a new user**:
```bash
# Request OTP
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9123456789"}'

# Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9123456789", "otp": "XXXX"}'

# Create user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9123456789",
    "name": "Offline User",
    "userType": "BUYER",
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "address": "Mumbai"
    }
  }'
```

3. **Check server logs**:
```
[Auth] User creation queued for sync: PostgreSQL unavailable. Operation queued for sync.
```

4. **Verify in SQLite sync queue**:
```bash
sqlite3 data/offline.db

SELECT * FROM pending_sync_queue;
```

**Expected**:
- User creation succeeds (returns success)
- Operation is added to sync queue
- User exists in SQLite but NOT in PostgreSQL yet

---

### Test 4: Automatic Sync When PostgreSQL Returns

**Goal**: Verify queued operations sync automatically when connectivity returns

1. **Start PostgreSQL**:
```bash
# Windows
net start postgresql-x64-18
```

2. **Watch server logs** (within 30 seconds):
```
[ConnectionMonitor] PostgreSQL connected
[SyncEngine] PostgreSQL connection restored, processing sync queue
[SyncEngine] Processing 1 sync queue items
[SyncEngine] Successfully processed CREATE for user:9123456789
[SyncEngine] Removed sync queue item 1
```

3. **Verify in PostgreSQL**:
```bash
psql -U postgres -d bharat_mandi

SELECT * FROM users WHERE phone_number = '9123456789';
```

4. **Check sync queue is empty**:
```bash
sqlite3 data/offline.db

SELECT * FROM pending_sync_queue;
-- Should return no rows
```

**Expected**:
- Queued operation syncs automatically
- User now exists in PostgreSQL
- Sync queue is empty

---

### Test 5: Retry Logic with Exponential Backoff

**Goal**: Verify failed sync operations retry with backoff

1. **Simulate a sync failure** by temporarily breaking PostgreSQL connection:
```bash
# Stop PostgreSQL
net stop postgresql-x64-18
```

2. **Create a user** (will be queued)

3. **Start PostgreSQL but with wrong password** (edit pg-config.ts temporarily):
```typescript
password: 'wrong-password'
```

4. **Restart server** - watch logs:
```
[SyncEngine] Sync item 1 failed (attempt 1/3), will retry with 2s backoff
[SyncEngine] Sync item 1 failed (attempt 2/3), will retry with 4s backoff
[SyncEngine] Sync item 1 failed (attempt 3/3), will retry with 8s backoff
[SyncEngine] Sync item 1 failed after 3 attempts: <error>
```

5. **Fix password** and restart

6. **Manually trigger sync** or wait 30 seconds

**Expected**:
- Retries with exponential backoff (2s, 4s, 8s)
- After 3 failures, marked as failed
- When fixed, next sync attempt succeeds

---

### Test 6: Profile Update Propagation

**Goal**: Verify updates propagate from PostgreSQL to SQLite

1. **Update user profile**:
```bash
curl -X PUT http://localhost:3000/api/users/9876543210 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "name": "Updated Name",
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "address": "Updated Address"
    }
  }'
```

2. **Check PostgreSQL** (should update immediately):
```sql
SELECT name, location FROM users WHERE phone_number = '9876543210';
```

3. **Check SQLite** (should update within 5 seconds):
```sql
SELECT name, location FROM users WHERE phone_number = '9876543210';
```

4. **Watch logs**:
```
[SyncEngine] Propagating UPDATE for user:<id> to SQLite
[SyncEngine] Successfully propagated UPDATE for user:<id> to SQLite
```

**Expected**:
- PostgreSQL updates immediately
- SQLite updates within 5 seconds
- Both databases have same data

---

## Monitoring & Debugging

### Check Connection Status

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "postgresql": {
    "connected": true,
    "lastCheck": "2024-01-01T12:00:00.000Z"
  }
}
```

### View Sync Queue

```bash
sqlite3 data/offline.db

SELECT 
  id,
  operation_type,
  entity_type,
  entity_id,
  retry_count,
  error_message,
  created_at
FROM pending_sync_queue
ORDER BY created_at;
```

### View PostgreSQL Logs

```bash
# Windows - check PostgreSQL logs
# Usually in: C:\Program Files\PostgreSQL\18\data\log\
```

### View Application Logs

Watch for these key log messages:
- `[DatabaseManager]` - Manager lifecycle
- `[ConnectionMonitor]` - Connectivity changes
- `[SyncEngine]` - Sync operations
- `[Auth]` - Auth service operations

---

## Common Issues & Solutions

### Issue: "PostgreSQL unavailable" but PostgreSQL is running

**Solution**: Check connection settings in `src/shared/database/pg-config.ts`:
```typescript
host: 'localhost',
port: 5432,
database: 'bharat_mandi',
user: 'postgres',
password: 'PGSql'
```

### Issue: Sync queue items not processing

**Solution**: 
1. Check ConnectionMonitor is started: `dbManager.start()`
2. Verify PostgreSQL is accessible
3. Check sync queue for error messages

### Issue: Data in PostgreSQL but not in SQLite

**Solution**: 
- Check propagation logs
- Verify SQLite database is writable
- Check for SQLite errors in logs

### Issue: Tests pass but manual testing fails

**Solution**:
1. Ensure PostgreSQL schema is initialized
2. Verify DatabaseManager is started in app
3. Check environment variables
4. Rebuild: `npm run build`

---

## Performance Testing

### Test Sync Performance

1. **Create multiple users while offline**:
```bash
# Create 10 users
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"phoneNumber\": \"912345678$i\", ...}"
done
```

2. **Start PostgreSQL and measure sync time**

3. **Check logs for batch processing**:
```
[SyncEngine] Processing 10 sync queue items
```

**Expected**: All 10 items sync within reasonable time (< 30 seconds)

---

## Cleanup

### Reset Databases

```bash
# PostgreSQL
psql -U postgres -d bharat_mandi
TRUNCATE users, otp_sessions, sync_status CASCADE;

# SQLite
sqlite3 data/offline.db
DELETE FROM users;
DELETE FROM pending_sync_queue;
```

### Stop Services

```bash
# Stop server
Ctrl+C

# Stop PostgreSQL (optional)
net stop postgresql-x64-18
```

---

## Next Steps

After manual testing, consider:
1. Load testing with multiple concurrent users
2. Network partition testing (simulate network failures)
3. Data consistency verification scripts
4. Monitoring dashboard for sync queue status
5. Alerting for failed sync operations
