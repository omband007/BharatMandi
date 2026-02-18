# SQLite Offline Storage - Bharat Mandi

## Overview

SQLite is used for offline storage in the Bharat Mandi mobile app. When the device loses connectivity, data is stored locally and synced to PostgreSQL/MongoDB when connectivity is restored.

## Database Location

- **Development**: `C:\Om\Projects\Kiro\data\offline.db`
- **Production (Mobile)**: Device-specific app data directory

## Tables

### 1. cached_listings
Cached marketplace listings for offline browsing.

**Columns:**
- id, farmer_id, produce_type, quantity, price_per_kg
- certificate_id, expected_harvest_date, is_active
- created_at, cached_at

### 2. pending_sync_queue
Queue of operations waiting to sync to server.

**Columns:**
- id, operation_type (CREATE/UPDATE/DELETE)
- entity_type, entity_id, data (JSON)
- created_at, retry_count, last_retry_at, error_message

### 3. local_photo_logs
Farming activity photos stored locally.

**Columns:**
- id, farmer_id, image_path (local file)
- category, location_lat, location_lng
- timestamp, notes, transaction_id
- synced, created_at

### 4. user_profile
Cached user profile for offline access.

**Columns:**
- id, name, phone, type, location
- bank details, credibility_score, rating
- last_synced_at

### 5. ai_models_metadata
Metadata for locally stored AI models.

**Columns:**
- id, model_name, model_version
- model_path, model_size
- downloaded_at, last_used_at, is_active

### 6. cached_certificates
Quality certificates cached locally.

**Columns:**
- id, certificate_id, farmer_id
- produce_type, grade, timestamp
- location, image_hash, image_path
- analysis_details (JSON), cached_at

### 7. offline_activities
Log of all activities performed offline.

**Columns:**
- id, activity_type, user_id
- data (JSON), status (PENDING/SYNCED/FAILED)
- created_at, synced_at, error_message

### 8. cached_transactions
Transaction history cached for offline viewing.

**Columns:**
- id, listing_id, farmer_id, buyer_id
- amount, status
- created_at, updated_at, cached_at

### 9. sync_status
Tracks sync status for each entity type.

**Columns:**
- id, entity_type
- last_sync_at, last_sync_status
- records_synced, records_failed, error_message

### 10. app_settings
Application settings and configuration.

**Columns:**
- key, value, updated_at

**Default Settings:**
- offline_mode: false
- auto_sync: true
- last_online_at: timestamp
- app_version: 0.1.0

## Usage Examples

### Add Item to Sync Queue
```typescript
import { addToSyncQueue } from './database/sqlite-helpers';

await addToSyncQueue({
  operation_type: 'CREATE',
  entity_type: 'listing',
  entity_id: 'listing-123',
  data: JSON.stringify({
    produce_type: 'Tomato',
    quantity: 100,
    price_per_kg: 50
  })
});
```

### Save Photo Log Offline
```typescript
import { saveLocalPhotoLog } from './database/sqlite-helpers';

await saveLocalPhotoLog({
  id: 'photo-123',
  farmer_id: 'farmer-123',
  image_path: '/storage/photos/harvest-001.jpg',
  category: 'HARVEST',
  location_lat: 28.7041,
  location_lng: 77.1025,
  timestamp: new Date().toISOString(),
  synced: 0
});
```

### Get Unsynced Items
```typescript
import { getUnsyncedPhotoLogs, getPendingSyncItems } from './database/sqlite-helpers';

// Get unsynced photo logs
const photoLogs = await getUnsyncedPhotoLogs();

// Get pending sync queue items
const syncItems = await getPendingSyncItems(50);
```

### Cache User Profile
```typescript
import { cacheUserProfile } from './database/sqlite-helpers';

await cacheUserProfile({
  id: 'user-123',
  name: 'Rajesh Kumar',
  phone: '+919876543210',
  type: 'FARMER',
  location: 'Punjab',
  credibility_score: 750,
  rating: 4.5
});
```

### Check Offline Mode
```typescript
import { isOfflineMode, setOfflineMode } from './database/sqlite-helpers';

// Check if app is in offline mode
const offline = await isOfflineMode();

// Set offline mode
await setOfflineMode(true);
```

## Sync Workflow

1. **Offline Operation**: User performs action (create listing, upload photo)
2. **Local Storage**: Data saved to SQLite
3. **Queue Addition**: Operation added to `pending_sync_queue`
4. **Activity Log**: Activity logged in `offline_activities`
5. **Connectivity Check**: App periodically checks for connectivity
6. **Sync Process**: When online, process sync queue
7. **Server Upload**: Send data to PostgreSQL/MongoDB
8. **Mark Synced**: Update local records as synced
9. **Clean Queue**: Remove successfully synced items

## Management Commands

### Setup Database
```bash
npm run sqlite:setup
```

### Test Connection
```bash
npm run sqlite:test
```

### View Statistics
```bash
npm run sqlite:stats
```

### Clear Cached Data (Development)
```typescript
import { clearAllCachedData } from './database/sqlite-config';
await clearAllCachedData();
```

### Vacuum Database
```typescript
import { vacuumDatabase } from './database/sqlite-config';
await vacuumDatabase();
```

## Best Practices

1. **Always queue operations** when offline
2. **Limit cached data** to essential information
3. **Clean old cache** periodically
4. **Handle sync conflicts** gracefully
5. **Validate data** before syncing
6. **Log errors** for debugging
7. **Test offline scenarios** thoroughly

## Sync Conflict Resolution

When syncing, conflicts may occur:

- **Server Wins**: For transaction states, payment status
- **Client Wins**: For photo logs, user preferences
- **Merge**: For activity logs (union of both)
- **Manual Review**: For critical data mismatches

## Performance Tips

1. **Use indexes** for frequently queried columns
2. **Batch operations** when possible
3. **Limit query results** with LIMIT clause
4. **Use transactions** for multiple operations
5. **Vacuum regularly** to reclaim space
6. **Monitor database size** and clean old data

## Security

- **No sensitive data** stored in plain text
- **Encrypt database** in production (SQLCipher)
- **Validate all inputs** before storage
- **Sanitize data** before syncing to server

## Troubleshooting

### Database Locked
- Close all connections before operations
- Use WAL mode (already enabled)
- Implement retry logic

### Sync Failures
- Check network connectivity
- Validate data format
- Review error messages in sync_status
- Retry failed items with exponential backoff

### Large Database Size
- Run VACUUM to reclaim space
- Clear old cached data
- Limit photo log retention
- Compress images before storage
