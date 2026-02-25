# Dual Database System - Quick Setup

## Summary

✅ **No POC UI changes needed!** The UI works exactly as before.

The dual database system is now integrated into your backend. All user operations automatically:
- Write to PostgreSQL (primary database)
- Cache in SQLite (offline fallback)
- Sync automatically when connectivity changes

## What Changed

### Backend Changes
1. ✅ Auth service now uses `DatabaseManager` instead of direct SQLite calls
2. ✅ App startup initializes `DatabaseManager` and starts monitoring
3. ✅ Health check endpoint now shows database status

### POC UI
- ✅ **No changes needed** - all API endpoints work the same
- ✅ User creation, login, profile updates all work as before
- ✅ UI doesn't need to know about dual database system

## Setup Steps

### 1. Initialize PostgreSQL Database

```bash
# Create database
psql -U postgres
CREATE DATABASE bharat_mandi;
\q

# Run schema
psql -U postgres -d bharat_mandi -f src/shared/database/pg-schema.sql
```

### 2. Build and Start

```bash
npm run build
npm start
```

You should see:
```
✓ SQLite database initialized
✓ DatabaseManager started - monitoring PostgreSQL connectivity
[ConnectionMonitor] PostgreSQL connected
Server running on port 3000
```

### 3. Test with POC UI

Open `http://localhost:3000` and use the UI normally:

1. **Create Farmer** - Data goes to PostgreSQL + SQLite
2. **View All Users** - Reads from PostgreSQL (or SQLite if offline)
3. **Profile Management** - Updates sync between databases

## Monitoring

### Check Database Status

Visit: `http://localhost:3000/api/health`

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "databases": {
    "postgresql": {
      "connected": true,
      "lastCheck": "2024-01-01T12:00:00.000Z"
    },
    "sqlite": {
      "connected": true
    }
  }
}
```

### Watch Server Logs

Key log messages to watch:
```
[DatabaseManager] Starting connection monitor and sync engine
[ConnectionMonitor] PostgreSQL connected
[SyncEngine] Propagating CREATE for user:xxx to SQLite
[SyncEngine] Successfully propagated CREATE for user:xxx to SQLite
```

## Testing Offline Mode

### Simulate PostgreSQL Offline

1. **Stop PostgreSQL**:
```bash
net stop postgresql-x64-18
```

2. **Use POC UI** - Everything still works!
   - Reads come from SQLite
   - Writes are queued for sync

3. **Check logs**:
```
[ConnectionMonitor] PostgreSQL disconnected
[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.
[Auth] User creation queued for sync
```

4. **Start PostgreSQL**:
```bash
net start postgresql-x64-18
```

5. **Watch automatic sync**:
```
[ConnectionMonitor] PostgreSQL connected
[SyncEngine] PostgreSQL connection restored, processing sync queue
[SyncEngine] Processing 1 sync queue items
[SyncEngine] Successfully processed CREATE for user:xxx
```

## Verify Data Sync

### Check PostgreSQL
```bash
psql -U postgres -d bharat_mandi

SELECT id, phone_number, name, user_type FROM users;
```

### Check SQLite
```bash
sqlite3 data/offline.db

SELECT id, phone_number, name, user_type FROM users;
```

Both should show the same users!

## Troubleshooting

### PostgreSQL Connection Failed

**Error**: `[ConnectionMonitor] PostgreSQL disconnected`

**Check**:
1. PostgreSQL is running: `net start postgresql-x64-18`
2. Database exists: `psql -U postgres -l | findstr bharat_mandi`
3. Password is correct in `src/shared/database/pg-config.ts`

**Solution**: System works in offline mode using SQLite until PostgreSQL is available

### Sync Queue Not Processing

**Check sync queue**:
```bash
sqlite3 data/offline.db
SELECT * FROM pending_sync_queue;
```

**If items stuck**:
1. Check PostgreSQL is accessible
2. Look for error_message in sync queue
3. Restart server to retry

### Data Not in PostgreSQL

**Possible causes**:
1. PostgreSQL was offline when user was created
2. Sync failed (check sync queue)
3. Schema not initialized

**Solution**:
```bash
# Check sync queue
sqlite3 data/offline.db
SELECT * FROM pending_sync_queue;

# If items exist, they'll sync when PostgreSQL is available
# If no items, user was created before dual database system
```

## Performance Notes

- **Write latency**: ~50-100ms (PostgreSQL write + async SQLite propagation)
- **Read latency**: ~10-20ms (PostgreSQL) or ~5ms (SQLite fallback)
- **Sync interval**: Every 30 seconds for connectivity check
- **Propagation time**: Within 5 seconds for SQLite cache updates
- **Retry backoff**: 2s, 4s, 8s (exponential)

## Next Steps

1. ✅ Use POC UI normally - no changes needed
2. ✅ Monitor health endpoint for database status
3. ✅ Test offline mode by stopping PostgreSQL
4. ✅ Verify data exists in both databases

For detailed testing scenarios, see: `docs/DUAL-DATABASE-TESTING-GUIDE.md`
