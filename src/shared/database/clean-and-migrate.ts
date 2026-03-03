/**
 * Clean Database and Run Migration
 * Clears test data and executes schema consolidation
 */

import { pool } from './pg-config';
import * as fs from 'fs';
import * as path from 'path';

async function cleanAndMigrate() {
  console.log('='.repeat(80));
  console.log('DATABASE CLEANUP AND SCHEMA CONSOLIDATION');
  console.log('='.repeat(80));
  console.log('');
  console.log('⚠️  WARNING: This will delete all existing data!');
  console.log('');
  
  const client = await pool.connect();
  
  try {
    // Test connection
    console.log('🔌 Testing PostgreSQL connection...');
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL at:', testResult.rows[0].now);
    console.log('');
    
    // Start transaction
    await client.query('BEGIN');
    console.log('🔄 Transaction started');
    console.log('');
    
    // Step 1: Clean up existing data
    console.log('🧹 Cleaning up existing data...');
    
    const tablesToClean = [
      'dispute_evidence',
      'disputes',
      'vehicle_tracking',
      'route_optimizations',
      'scheme_applications',
      'bids',
      'auction_listings',
      'storage_bookings',
      'logistics_orders',
      'ratings',
      'credibility_score_history',
      'credibility_scores',
      'escrow_accounts',
      'transactions',
      'listing_media',
      'listings'
    ];
    
    for (const table of tablesToClean) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`   ✅ Cleared ${table} (${result.rowCount || 0} rows)`);
      } catch (error: any) {
        // Table might not exist, that's okay
        console.log(`   ⚠️  ${table} - ${error.message}`);
      }
    }
    console.log('');
    
    // Step 2: Execute the migration
    console.log('🚀 Executing schema migration...');
    const migrationPath = path.join(__dirname, 'migrations', '005_consolidate_user_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove BEGIN/COMMIT from migration file since we're already in a transaction
    const cleanedSQL = migrationSQL
      .replace(/BEGIN;/g, '')
      .replace(/COMMIT;/g, '');
    
    await client.query(cleanedSQL);
    console.log('✅ Migration executed successfully');
    console.log('');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed');
    console.log('');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    // Check users table is gone
    const usersTableVerify = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `);
    
    if (usersTableVerify.rows.length === 0) {
      console.log('✅ Legacy "users" table successfully dropped');
    } else {
      console.log('⚠️  WARNING: "users" table still exists');
    }
    
    // Check foreign keys reference user_profiles
    const foreignKeysCheck = await client.query(`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'user_profiles'
      ORDER BY tc.table_name
    `);
    
    console.log(`✅ Found ${foreignKeysCheck.rows.length} foreign keys referencing user_profiles:`);
    foreignKeysCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    console.log('');
    
    console.log('='.repeat(80));
    console.log('✅ CLEANUP AND MIGRATION SUCCESSFUL');
    console.log('='.repeat(80));
    console.log('');
    console.log('Database is now using user_profiles as the single source of truth.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Register a new user via profile.html');
    console.log('2. Create a listing via listing.html');
    console.log('3. Verify listing creation succeeds without errors');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ OPERATION FAILED');
    console.error('='.repeat(80));
    console.error('');
    console.error('Error:', error);
    console.error('');
    
    try {
      await client.query('ROLLBACK');
      console.error('The transaction has been rolled back.');
      console.error('Your database is unchanged.');
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
    }
    console.error('');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup and migration
cleanAndMigrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
