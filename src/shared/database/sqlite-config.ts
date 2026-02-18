import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// SQLite database path
const DB_DIR = process.env.SQLITE_DB_DIR || path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'offline.db');

let db: Database | null = null;

// Ensure data directory exists
function ensureDataDirectory(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`✓ Created data directory: ${DB_DIR}`);
  }
}

// Open SQLite database connection
export async function openSQLiteDB(): Promise<Database> {
  if (db) {
    return db;
  }

  ensureDataDirectory();

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON;');
  
  // Enable WAL mode for better concurrency
  await db.exec('PRAGMA journal_mode = WAL;');

  console.log(`✓ SQLite database opened: ${DB_PATH}`);
  return db;
}

// Close SQLite database connection
export async function closeSQLiteDB(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('✓ SQLite database closed');
  }
}

// Get current database instance
export function getSQLiteDB(): Database {
  if (!db) {
    throw new Error('SQLite database not initialized. Call openSQLiteDB() first.');
  }
  return db;
}

// Initialize database schema
export async function initializeSQLiteSchema(): Promise<void> {
  const database = await openSQLiteDB();
  const schemaPath = path.join(__dirname, 'sqlite-schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await database.exec(schema);
  
  console.log('✓ SQLite schema initialized');
}

// Test SQLite connection
export async function testSQLiteConnection(): Promise<boolean> {
  try {
    const database = await openSQLiteDB();
    const result = await database.get('SELECT 1 as test');
    console.log('✓ SQLite connection test passed:', result);
    return true;
  } catch (error) {
    console.error('✗ SQLite connection test failed:', error);
    return false;
  }
}

// Get database statistics
export async function getSQLiteStats(): Promise<any> {
  const database = getSQLiteDB();
  
  const stats: any = {};
  
  const tables = [
    'cached_listings',
    'pending_sync_queue',
    'local_photo_logs',
    'user_profile',
    'ai_models_metadata',
    'cached_certificates',
    'offline_activities',
    'cached_transactions',
    'sync_status',
    'app_settings'
  ];

  for (const table of tables) {
    const result = await database.get(`SELECT COUNT(*) as count FROM ${table}`);
    stats[table] = result?.count || 0;
  }

  return stats;
}

// Clear all cached data (for development/testing)
export async function clearAllCachedData(): Promise<void> {
  const database = getSQLiteDB();
  
  await database.exec(`
    DELETE FROM cached_listings;
    DELETE FROM pending_sync_queue;
    DELETE FROM local_photo_logs;
    DELETE FROM cached_certificates;
    DELETE FROM offline_activities;
    DELETE FROM cached_transactions;
  `);
  
  console.log('✓ All cached data cleared');
}

// Vacuum database to reclaim space
export async function vacuumDatabase(): Promise<void> {
  const database = getSQLiteDB();
  await database.exec('VACUUM;');
  console.log('✓ Database vacuumed');
}

// Get database file size
export function getDatabaseSize(): number {
  if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    return stats.size;
  }
  return 0;
}

// Export database path for external use
export { DB_PATH };
