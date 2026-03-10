import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function diagnoseMarketplace() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'bharat_mandi',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  });

  try {
    console.log('🔍 Diagnosing Marketplace Issue...\n');

    // Check if listings table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'listings'
      );
    `);
    console.log('✓ Listings table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Listings table does not exist! Run migrations first.');
      return;
    }

    // Check table structure
    console.log('\n📋 Table Structure:');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'listings'
      ORDER BY ordinal_position;
    `);
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Count total listings
    const totalCount = await pool.query('SELECT COUNT(*) FROM listings');
    console.log('\n📊 Total Listings:', totalCount.rows[0].count);

    // Count by status
    const statusCount = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM listings
      GROUP BY status
      ORDER BY count DESC;
    `);
    console.log('\n📈 Listings by Status:');
    statusCount.rows.forEach(row => {
      console.log(`  - ${row.status}: ${row.count}`);
    });

    // Show sample listings
    const sampleListings = await pool.query(`
      SELECT id, farmer_id, produce_type, quantity, price_per_kg, status, created_at
      FROM listings
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    console.log('\n📦 Sample Listings (latest 5):');
    sampleListings.rows.forEach(listing => {
      console.log(`  - ID: ${listing.id.substring(0, 8)}...`);
      console.log(`    Produce: ${listing.produce_type}`);
      console.log(`    Quantity: ${listing.quantity} kg @ ₹${listing.price_per_kg}/kg`);
      console.log(`    Status: ${listing.status}`);
      console.log(`    Created: ${listing.created_at}`);
      console.log('');
    });

    // Check for ACTIVE listings specifically
    const activeListings = await pool.query(`
      SELECT id, farmer_id, produce_type, quantity, price_per_kg, status
      FROM listings
      WHERE status = 'ACTIVE'
      LIMIT 5;
    `);
    console.log(`\n✅ ACTIVE Listings (${activeListings.rows.length} found):`);
    if (activeListings.rows.length === 0) {
      console.log('  ⚠️  No ACTIVE listings found! This is why marketplace is empty.');
    } else {
      activeListings.rows.forEach(listing => {
        console.log(`  - ${listing.produce_type}: ${listing.quantity} kg @ ₹${listing.price_per_kg}/kg`);
      });
    }

    // Check users table
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log('\n👥 Total Users:', usersCount.rows[0].count);

    const userTypes = await pool.query(`
      SELECT user_type, COUNT(*) as count
      FROM users
      GROUP BY user_type;
    `);
    console.log('\n👥 Users by Type:');
    userTypes.rows.forEach(row => {
      console.log(`  - ${row.user_type}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

diagnoseMarketplace();
