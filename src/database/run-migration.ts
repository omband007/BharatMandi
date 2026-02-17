import { pool } from './pg-config';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', '002_add_pin_to_users.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 002_add_pin_to_users.sql');
    await pool.query(sql);
    console.log('Migration completed successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
