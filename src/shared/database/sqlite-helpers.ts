import { getSQLiteDB } from './sqlite-config';

// ============================================================================
// SYNC QUEUE OPERATIONS
// ============================================================================

export interface SyncQueueItem {
  id?: number;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;
  entity_id: string;
  data: string; // JSON string
  created_at?: string;
  retry_count?: number;
  last_retry_at?: string;
  error_message?: string;
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count'>): Promise<number> {
  const db = getSQLiteDB();
  const result = await db.run(
    `INSERT INTO pending_sync_queue (operation_type, entity_type, entity_id, data)
     VALUES (?, ?, ?, ?)`,
    [item.operation_type, item.entity_type, item.entity_id, item.data]
  );
  return result.lastID!;
}

export async function getPendingSyncItems(limit: number = 50): Promise<SyncQueueItem[]> {
  const db = getSQLiteDB();
  return await db.all(
    `SELECT * FROM pending_sync_queue 
     ORDER BY created_at ASC 
     LIMIT ?`,
    [limit]
  );
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  const db = getSQLiteDB();
  await db.run('DELETE FROM pending_sync_queue WHERE id = ?', [id]);
}

export async function updateSyncQueueRetry(id: number, errorMessage: string): Promise<void> {
  const db = getSQLiteDB();
  await db.run(
    `UPDATE pending_sync_queue 
     SET retry_count = retry_count + 1, 
         last_retry_at = CURRENT_TIMESTAMP,
         error_message = ?
     WHERE id = ?`,
    [errorMessage, id]
  );
}

// ============================================================================
// CACHED LISTINGS OPERATIONS
// ============================================================================

export interface CachedListing {
  id: string;
  farmer_id: string;
  produce_type: string;
  quantity: number;
  price_per_kg: number;
  certificate_id?: string;
  expected_harvest_date?: string;
  is_active: number;
  created_at?: string;
  cached_at?: string;
}

export async function cacheListing(listing: CachedListing): Promise<void> {
  const db = getSQLiteDB();
  await db.run(
    `INSERT OR REPLACE INTO cached_listings 
     (id, farmer_id, produce_type, quantity, price_per_kg, certificate_id, expected_harvest_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      listing.id,
      listing.farmer_id,
      listing.produce_type,
      listing.quantity,
      listing.price_per_kg,
      listing.certificate_id,
      listing.expected_harvest_date,
      listing.is_active
    ]
  );
}

export async function getCachedListings(filters?: { produce_type?: string; is_active?: number }): Promise<CachedListing[]> {
  const db = getSQLiteDB();
  let query = 'SELECT * FROM cached_listings WHERE 1=1';
  const params: any[] = [];

  if (filters?.produce_type) {
    query += ' AND produce_type = ?';
    params.push(filters.produce_type);
  }

  if (filters?.is_active !== undefined) {
    query += ' AND is_active = ?';
    params.push(filters.is_active);
  }

  query += ' ORDER BY created_at DESC';

  return await db.all(query, params);
}

// ============================================================================
// LOCAL PHOTO LOGS OPERATIONS
// ============================================================================

export interface LocalPhotoLog {
  id: string;
  farmer_id: string;
  image_path: string;
  category: string;
  location_lat: number;
  location_lng: number;
  timestamp: string;
  notes?: string;
  transaction_id?: string;
  synced: number;
  created_at?: string;
}

export async function saveLocalPhotoLog(photoLog: LocalPhotoLog): Promise<void> {
  const db = getSQLiteDB();
  await db.run(
    `INSERT INTO local_photo_logs 
     (id, farmer_id, image_path, category, location_lat, location_lng, timestamp, notes, transaction_id, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      photoLog.id,
      photoLog.farmer_id,
      photoLog.image_path,
      photoLog.category,
      photoLog.location_lat,
      photoLog.location_lng,
      photoLog.timestamp,
      photoLog.notes,
      photoLog.transaction_id,
      photoLog.synced
    ]
  );
}

export async function getUnsyncedPhotoLogs(): Promise<LocalPhotoLog[]> {
  const db = getSQLiteDB();
  return await db.all(
    'SELECT * FROM local_photo_logs WHERE synced = 0 ORDER BY timestamp ASC'
  );
}

export async function markPhotoLogAsSynced(id: string): Promise<void> {
  const db = getSQLiteDB();
  await db.run('UPDATE local_photo_logs SET synced = 1 WHERE id = ?', [id]);
}

// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  type: string;
  location: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_name?: string;
  bank_account_holder_name?: string;
  credibility_score: number;
  rating: number;
  last_synced_at?: string;
}

export async function cacheUserProfile(profile: UserProfile): Promise<void> {
  const db = getSQLiteDB();
  await db.run(
    `INSERT OR REPLACE INTO user_profile 
     (id, name, phone, type, location, bank_account_number, bank_ifsc_code, bank_name, bank_account_holder_name, credibility_score, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.id,
      profile.name,
      profile.phone,
      profile.type,
      profile.location,
      profile.bank_account_number,
      profile.bank_ifsc_code,
      profile.bank_name,
      profile.bank_account_holder_name,
      profile.credibility_score,
      profile.rating
    ]
  );
}

export async function getCachedUserProfile(userId: string): Promise<UserProfile | undefined> {
  const db = getSQLiteDB();
  return await db.get('SELECT * FROM user_profile WHERE id = ?', [userId]);
}

// ============================================================================
// OFFLINE ACTIVITIES OPERATIONS
// ============================================================================

export interface OfflineActivity {
  id?: number;
  activity_type: string;
  user_id: string;
  data: string; // JSON string
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at?: string;
  synced_at?: string;
  error_message?: string;
}

export async function logOfflineActivity(activity: Omit<OfflineActivity, 'id' | 'created_at'>): Promise<number> {
  const db = getSQLiteDB();
  const result = await db.run(
    `INSERT INTO offline_activities (activity_type, user_id, data, status)
     VALUES (?, ?, ?, ?)`,
    [activity.activity_type, activity.user_id, activity.data, activity.status]
  );
  return result.lastID!;
}

export async function getPendingOfflineActivities(): Promise<OfflineActivity[]> {
  const db = getSQLiteDB();
  return await db.all(
    `SELECT * FROM offline_activities 
     WHERE status = 'PENDING' 
     ORDER BY created_at ASC`
  );
}

export async function updateOfflineActivityStatus(
  id: number,
  status: 'SYNCED' | 'FAILED',
  errorMessage?: string
): Promise<void> {
  const db = getSQLiteDB();
  await db.run(
    `UPDATE offline_activities 
     SET status = ?, synced_at = CURRENT_TIMESTAMP, error_message = ?
     WHERE id = ?`,
    [status, errorMessage, id]
  );
}

// ============================================================================
// APP SETTINGS OPERATIONS
// ============================================================================

export async function getAppSetting(key: string): Promise<string | undefined> {
  const db = getSQLiteDB();
  const result = await db.get('SELECT value FROM app_settings WHERE key = ?', [key]);
  return result?.value;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const db = getSQLiteDB();
  await db.run(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [key, value]
  );
}

export async function isOfflineMode(): Promise<boolean> {
  const offlineMode = await getAppSetting('offline_mode');
  return offlineMode === 'true';
}

export async function setOfflineMode(offline: boolean): Promise<void> {
  await setAppSetting('offline_mode', offline ? 'true' : 'false');
  if (!offline) {
    await setAppSetting('last_online_at', new Date().toISOString());
  }
}

// ============================================================================
// SYNC STATUS OPERATIONS
// ============================================================================

export interface SyncStatus {
  id?: number;
  entity_type: string;
  last_sync_at?: string;
  last_sync_status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  records_synced: number;
  records_failed: number;
  error_message?: string;
}

export async function updateSyncStatus(status: SyncStatus): Promise<void> {
  const db = getSQLiteDB();
  await db.run(
    `UPDATE sync_status 
     SET last_sync_at = CURRENT_TIMESTAMP,
         last_sync_status = ?,
         records_synced = ?,
         records_failed = ?,
         error_message = ?
     WHERE entity_type = ?`,
    [
      status.last_sync_status,
      status.records_synced,
      status.records_failed,
      status.error_message,
      status.entity_type
    ]
  );
}

export async function getSyncStatus(entityType: string): Promise<SyncStatus | undefined> {
  const db = getSQLiteDB();
  return await db.get('SELECT * FROM sync_status WHERE entity_type = ?', [entityType]);
}

export async function getAllSyncStatuses(): Promise<SyncStatus[]> {
  const db = getSQLiteDB();
  return await db.all('SELECT * FROM sync_status ORDER BY last_sync_at DESC');
}
