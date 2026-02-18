import * as fs from 'fs';
import * as path from 'path';
import { pool, testConnection } from './pg-config';

// Migration tracking table
const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// Get all migration files
function getMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort to ensure migrations run in order
}

// Check if migration has been executed
async function isMigrationExecuted(name: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT * FROM migrations WHERE name = $1',
    [name]
  );
  return result.rows.length > 0;
}

// Record migration execution
async function recordMigration(name: string): Promise<void> {
  await pool.query(
    'INSERT INTO migrations (name) VALUES ($1)',
    [name]
  );
}

// Execute a single migration
async function executeMigration(filename: string): Promise<void> {
  const migrationPath = path.join(__dirname, 'migrations', filename);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`\n→ Executing migration: ${filename}`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await recordMigration(filename);
    await client.query('COMMIT');
    console.log(`✓ Migration completed: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Migration failed: ${filename}`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run all pending migrations
export async function runMigrations(): Promise<void> {
  console.log('\n=== Database Migration ===\n');

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Cannot connect to database');
  }

  // Create migrations tracking table
  await pool.query(MIGRATIONS_TABLE);
  console.log('✓ Migrations table ready');

  // Get all migration files
  const migrationFiles = getMigrationFiles();
  
  if (migrationFiles.length === 0) {
    console.log('No migration files found');
    return;
  }

  console.log(`\nFound ${migrationFiles.length} migration file(s)`);

  // Execute pending migrations
  let executedCount = 0;
  for (const file of migrationFiles) {
    const isExecuted = await isMigrationExecuted(file);
    
    if (isExecuted) {
      console.log(`⊘ Skipping (already executed): ${file}`);
      continue;
    }

    await executeMigration(file);
    executedCount++;
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`Total migrations: ${migrationFiles.length}`);
  console.log(`Executed: ${executedCount}`);
  console.log(`Skipped: ${migrationFiles.length - executedCount}`);
  console.log('=========================\n');
}

// Rollback last migration (for development)
export async function rollbackLastMigration(): Promise<void> {
  const result = await pool.query(
    'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1'
  );

  if (result.rows.length === 0) {
    console.log('No migrations to rollback');
    return;
  }

  const lastMigration = result.rows[0].name;
  console.log(`Rolling back migration: ${lastMigration}`);
  
  // Note: This is a simple implementation. In production, you'd want
  // to have separate rollback SQL files for each migration
  await pool.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
  console.log('✓ Migration rolled back (manual cleanup may be required)');
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'up') {
    runMigrations()
      .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  } else if (command === 'rollback') {
    rollbackLastMigration()
      .then(() => {
        console.log('Rollback completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Rollback failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  npm run migrate up       - Run all pending migrations');
    console.log('  npm run migrate rollback - Rollback last migration');
    process.exit(1);
  }
}
