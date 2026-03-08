/**
 * Standalone script to update sale_channel enum in PostgreSQL
 * Run with: npx ts-node scripts/update-sale-channel-enum.ts
 */

import { pool } from '../src/shared/database/pg-config';

async function updateSaleChannelEnum() {
  console.log('\n=== Updating sale_channel enum ===\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Step 1: Converting sale_channel column to TEXT...');
    await client.query('ALTER TABLE listings ALTER COLUMN sale_channel TYPE TEXT');

    console.log('Step 2: Updating existing data...');
    const result = await client.query(`
      UPDATE listings 
      SET sale_channel = 'PLATFORM' 
      WHERE sale_channel IN ('PLATFORM_ESCROW', 'PLATFORM_DIRECT')
    `);
    console.log(`  Updated ${result.rowCount} rows`);

    console.log('Step 3: Dropping old enum type...');
    await client.query('DROP TYPE IF EXISTS sale_channel CASCADE');

    console.log('Step 4: Creating new enum type...');
    await client.query("CREATE TYPE sale_channel AS ENUM ('PLATFORM', 'EXTERNAL')");

    console.log('Step 5: Converting column back to enum...');
    await client.query(`
      ALTER TABLE listings 
      ALTER COLUMN sale_channel TYPE sale_channel 
      USING sale_channel::sale_channel
    `);

    console.log('Step 6: Updating comment...');
    await client.query(`
      COMMENT ON COLUMN listings.sale_channel IS 'How listing was sold: PLATFORM or EXTERNAL'
    `);

    await client.query('COMMIT');
    
    console.log('\n✅ Successfully updated sale_channel enum!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error updating enum:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateSaleChannelEnum()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
