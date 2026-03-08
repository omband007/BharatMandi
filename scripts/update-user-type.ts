/**
 * Script to update user type for a specific mobile number
 * Usage: npx ts-node scripts/update-user-type.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MOBILE_NUMBER = '+919986017659';
const NEW_USER_TYPE = 'both';

async function updateUserType() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'bharat_mandi',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });

  try {
    console.log(`\n🔄 Updating user type for ${MOBILE_NUMBER} to "${NEW_USER_TYPE}"...\n`);

    // First, check if user exists
    const checkResult = await pool.query(
      'SELECT user_id, mobile_number, name, user_type FROM user_profiles WHERE mobile_number = $1',
      [MOBILE_NUMBER]
    );

    if (checkResult.rows.length === 0) {
      console.log(`❌ User with mobile number ${MOBILE_NUMBER} not found!`);
      await pool.end();
      return;
    }

    const user = checkResult.rows[0];
    console.log('📋 Current user details:');
    console.log(`   ID: ${user.user_id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Mobile: ${user.mobile_number}`);
    console.log(`   Current Type: ${user.user_type}`);
    console.log('');

    // Update the user type
    const updateResult = await pool.query(
      `UPDATE user_profiles 
       SET user_type = $1, updated_at = NOW() 
       WHERE mobile_number = $2 
       RETURNING user_id, mobile_number, name, user_type, updated_at`,
      [NEW_USER_TYPE, MOBILE_NUMBER]
    );

    if (updateResult.rows.length > 0) {
      const updatedUser = updateResult.rows[0];
      console.log('✅ User type updated successfully!');
      console.log('');
      console.log('📋 Updated user details:');
      console.log(`   ID: ${updatedUser.user_id}`);
      console.log(`   Name: ${updatedUser.name}`);
      console.log(`   Mobile: ${updatedUser.mobile_number}`);
      console.log(`   New Type: ${updatedUser.user_type}`);
      console.log(`   Updated At: ${updatedUser.updated_at}`);
      console.log('');
      console.log('✨ The user can now access both Farmer (Listings) and Buyer (Marketplace) pages!');
    } else {
      console.log('❌ Update failed!');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error updating user type:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the script
updateUserType();
