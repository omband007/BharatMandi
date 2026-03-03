/**
 * Check Database Schema
 */

import { pool } from './pg-config';

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Checking user_profiles table structure...\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position
    `);
    
    console.log('user_profiles columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });
    
    console.log('\n\nChecking listings table structure...\n');
    
    const listingsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'listings'
      ORDER BY ordinal_position
    `);
    
    console.log('listings columns:');
    listingsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
