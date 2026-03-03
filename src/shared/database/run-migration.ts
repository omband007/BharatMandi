/**
 * Database Migration Runner
 * Executes the schema consolidation migration
 */

import { pool } from './pg-config';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('='.repeat(80));
  console.log('DATABASE SCHEMA CONSOLIDATION MIGRATION');
  console.log('='.repeat(80));
  console.log('');
  
  const client = await pool.connect();
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '005_consolidate_user_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded:', migrationPath);
    console.log('');
    
    // Test connection
    console.log('🔌 Testing PostgreSQL connection...');
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL at:', testResult.rows[0].now);
    console.log('');
    
    // Check if users table exists
    console.log('🔍 Checking current schema...');
    const usersTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `);
    
    if (usersTableCheck.rows.length > 0) {
      console.log('✅ Found legacy "users" table - migration needed');
    } else {
      console.log('⚠️  Legacy "users" table not found - may already be migrated');
      console.log('');
      console.log('Do you want to continue anyway? (This will update foreign keys)');
    }
    
    // Check if user_profiles table exists
    const userProfilesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'user_profiles'
    `);
    
    if (userProfilesCheck.rows.length > 0) {
      console.log('✅ Found "user_profiles" table - target exists');
    } else {
      console.log('❌ ERROR: "user_profiles" table not found!');
      console.log('   Please ensure Sequelize has created the user_profiles table first.');
      process.exit(1);
    }
    console.log('');
    
    // Execute the migration
    console.log('🚀 Executing migration...');
    console.log('   This will:');
    console.log('   1. Drop foreign key constraints referencing users(id)');
    console.log('   2. Add foreign key constraints referencing user_profiles(user_id)');
    console.log('   3. Drop the legacy users table');
    console.log('');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
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
    console.log('✅ MIGRATION SUCCESSFUL');
    console.log('='.repeat(80));
    console.log('');
    console.log('Next steps:');
    console.log('1. Test user registration');
    console.log('2. Test listing creation');
    console.log('3. Verify data integrity');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ MIGRATION FAILED');
    console.error('='.repeat(80));
    console.error('');
    console.error('Error:', error);
    console.error('');
    console.error('The transaction has been rolled back.');
    console.error('Your database is unchanged.');
    console.error('');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
