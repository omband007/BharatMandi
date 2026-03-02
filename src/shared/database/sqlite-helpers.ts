import { getSQLiteDB } from './sqlite-config';
import type { OTPSession } from '../../features/profile/types/profile.types';

// ============================================================================
// OTP SESSION OPERATIONS
// ============================================================================

export async function createOTPSession(session: OTPSession): Promise<void> {
  const db = getSQLiteDB();
  
  // Delete any existing OTP sessions for this phone number
  await db.run('DELETE FROM otp_sessions WHERE phone_number = ?', [session.phoneNumber]);
  
  // Create new session
  await db.run(
    `INSERT INTO otp_sessions (phone_number, otp, expires_at, attempts)
     VALUES (?, ?, ?, ?)`,
    [session.phoneNumber, session.otp, session.expiresAt.toISOString(), session.attempts]
  );
}

export async function getOTPSession(phoneNumber: string): Promise<OTPSession | undefined> {
  const db = getSQLiteDB();
  const row = await db.get<{ phone_number: string; otp: string; expires_at: string; attempts: number }>(
    'SELECT * FROM otp_sessions WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1',
    [phoneNumber]
  );
  
  if (!row) return undefined;
  
  return {
    phoneNumber: row.phone_number,
    otp: row.otp,
    expiresAt: new Date(row.expires_at),
    attempts: row.attempts
  };
}

export async function updateOTPAttempts(phoneNumber: string, attempts: number): Promise<void> {
  const db = getSQLiteDB();
  await db.run(
    'UPDATE otp_sessions SET attempts = ? WHERE phone_number = ?',
    [attempts, phoneNumber]
  );
}

export async function deleteOTPSession(phoneNumber: string): Promise<void> {
  const db = getSQLiteDB();
  await db.run('DELETE FROM otp_sessions WHERE phone_number = ?', [phoneNumber]);
}

export async function cleanupExpiredOTPSessions(): Promise<void> {
  const db = getSQLiteDB();
  await db.run('DELETE FROM otp_sessions WHERE expires_at < ?', [new Date().toISOString()]);
}

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


// ============================================================================
// Marketplace Operations - Listings
// ============================================================================

export async function createListing(listing: any): Promise<any> {
  const db = getSQLiteDB();
  await db.run(
    `INSERT INTO listings (
      id, farmer_id, produce_type, quantity, price_per_kg, 
      certificate_id, expected_harvest_date, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      listing.id,
      listing.farmerId,
      listing.produceType,
      listing.quantity,
      listing.pricePerKg,
      listing.certificateId,
      listing.expectedHarvestDate?.toISOString() || null,
      listing.isActive ? 1 : 0,
      listing.createdAt.toISOString()
    ]
  );
  return listing;
}

export async function getListing(id: string): Promise<any | undefined> {
  const db = getSQLiteDB();
  const row = await db.get('SELECT * FROM listings WHERE id = ?', [id]);
  return row ? mapRowToListing(row) : undefined;
}

export async function getActiveListings(): Promise<any[]> {
  const db = getSQLiteDB();
  const rows = await db.all('SELECT * FROM listings WHERE is_active = 1 ORDER BY created_at DESC');
  return rows.map(mapRowToListing);
}

export async function updateListing(id: string, updates: any): Promise<any | undefined> {
  const db = getSQLiteDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.quantity !== undefined) {
    fields.push('quantity = ?');
    values.push(updates.quantity);
  }
  if (updates.pricePerKg !== undefined) {
    fields.push('price_per_kg = ?');
    values.push(updates.pricePerKg);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.expectedHarvestDate !== undefined) {
    fields.push('expected_harvest_date = ?');
    values.push(updates.expectedHarvestDate?.toISOString() || null);
  }

  if (fields.length === 0) return getListing(id);

  values.push(id);
  await db.run(
    `UPDATE listings SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return getListing(id);
}

function mapRowToListing(row: any): any {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    produceType: row.produce_type,
    quantity: row.quantity,
    pricePerKg: row.price_per_kg,
    certificateId: row.certificate_id,
    expectedHarvestDate: row.expected_harvest_date ? new Date(row.expected_harvest_date) : undefined,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at)
  };
}

// ============================================================================
// Marketplace Operations - Transactions
// ============================================================================

export async function createTransaction(transaction: any): Promise<any> {
  const db = getSQLiteDB();
  await db.run(
    `INSERT INTO transactions (
      id, listing_id, farmer_id, buyer_id, amount, status, 
      created_at, updated_at, dispatched_at, delivered_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id,
      transaction.listingId,
      transaction.farmerId,
      transaction.buyerId,
      transaction.amount,
      transaction.status,
      transaction.createdAt.toISOString(),
      transaction.updatedAt.toISOString(),
      transaction.dispatchedAt?.toISOString() || null,
      transaction.deliveredAt?.toISOString() || null,
      transaction.completedAt?.toISOString() || null
    ]
  );
  return transaction;
}

export async function getTransaction(id: string): Promise<any | undefined> {
  const db = getSQLiteDB();
  const row = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
  return row ? mapRowToTransaction(row) : undefined;
}

export async function updateTransaction(id: string, updates: any): Promise<any | undefined> {
  const db = getSQLiteDB();
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.dispatchedAt !== undefined) {
    fields.push('dispatched_at = ?');
    values.push(updates.dispatchedAt.toISOString());
  }
  if (updates.deliveredAt !== undefined) {
    fields.push('delivered_at = ?');
    values.push(updates.deliveredAt.toISOString());
  }
  if (updates.completedAt !== undefined) {
    fields.push('completed_at = ?');
    values.push(updates.completedAt.toISOString());
  }

  values.push(id);
  await db.run(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return getTransaction(id);
}

function mapRowToTransaction(row: any): any {
  return {
    id: row.id,
    listingId: row.listing_id,
    farmerId: row.farmer_id,
    buyerId: row.buyer_id,
    amount: row.amount,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    dispatchedAt: row.dispatched_at ? new Date(row.dispatched_at) : undefined,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined
  };
}

// ============================================================================
// Marketplace Operations - Escrow Accounts
// ============================================================================

export async function createEscrow(escrow: any): Promise<any> {
  const db = getSQLiteDB();
  await db.run(
    `INSERT INTO escrow_accounts (
      id, transaction_id, amount, status, is_locked, created_at, released_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      escrow.id,
      escrow.transactionId,
      escrow.amount,
      escrow.status,
      escrow.isLocked ? 1 : 0,
      escrow.createdAt.toISOString(),
      escrow.releasedAt?.toISOString() || null
    ]
  );
  return escrow;
}

export async function getEscrow(id: string): Promise<any | undefined> {
  const db = getSQLiteDB();
  const row = await db.get('SELECT * FROM escrow_accounts WHERE id = ?', [id]);
  return row ? mapRowToEscrow(row) : undefined;
}

export async function getEscrowByTransaction(transactionId: string): Promise<any | undefined> {
  const db = getSQLiteDB();
  const row = await db.get('SELECT * FROM escrow_accounts WHERE transaction_id = ?', [transactionId]);
  return row ? mapRowToEscrow(row) : undefined;
}

export async function updateEscrow(id: string, updates: any): Promise<any | undefined> {
  const db = getSQLiteDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.isLocked !== undefined) {
    fields.push('is_locked = ?');
    values.push(updates.isLocked ? 1 : 0);
  }
  if (updates.releasedAt !== undefined) {
    fields.push('released_at = ?');
    values.push(updates.releasedAt.toISOString());
  }

  if (fields.length === 0) return getEscrow(id);

  values.push(id);
  await db.run(
    `UPDATE escrow_accounts SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return getEscrow(id);
}

function mapRowToEscrow(row: any): any {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    amount: row.amount,
    status: row.status,
    isLocked: row.is_locked === 1,
    createdAt: new Date(row.created_at),
    releasedAt: row.released_at ? new Date(row.released_at) : undefined
  };
}
