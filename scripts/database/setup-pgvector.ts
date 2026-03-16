/**
 * pgvector Setup Script
 * 
 * Installs pgvector extension and creates the bharat_mandi database if needed.
 * 
 * Usage:
 *   npx ts-node scripts/setup-pgvector.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupPgVector() {
  console.log('='.repeat(60));
  console.log('pgvector Setup Script');
  console.log('='.repeat(60));
  console.log('');

  // Connect to postgres database first to check/create bharat_mandi
  const adminPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: 'postgres', // Connect to default postgres database
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false,
  });

  try {
    // Check if bharat_mandi database exists
    console.log('Checking if bharat_mandi database exists...');
    const dbCheck = await adminPool.query(`
      SELECT 1 FROM pg_database WHERE datname = 'bharat_mandi';
    `);

    if (dbCheck.rows.length === 0) {
      console.log('Creating bharat_mandi database...');
      await adminPool.query('CREATE DATABASE bharat_mandi;');
      console.log('✓ Database created');
    } else {
      console.log('✓ Database already exists');
    }
    console.log('');

  } catch (error) {
    console.error('✗ Failed to check/create database:', error);
    await adminPool.end();
    process.exit(1);
  } finally {
    await adminPool.end();
  }

  // Now connect to bharat_mandi database to install pgvector
  const dbPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'bharat_mandi',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false,
  });

  try {
    // Check if pgvector is already installed
    console.log('Checking pgvector extension...');
    const extCheck = await dbPool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);

    if (extCheck.rows.length === 0) {
      console.log('Installing pgvector extension...');
      await dbPool.query('CREATE EXTENSION vector;');
      console.log('✓ pgvector extension installed');
    } else {
      console.log('✓ pgvector extension already installed');
      console.log(`  Version: ${extCheck.rows[0].extversion || 'unknown'}`);
    }
    console.log('');

    // Verify installation
    console.log('Verifying pgvector installation...');
    const versionCheck = await dbPool.query(`
      SELECT extversion FROM pg_extension WHERE extname = 'vector';
    `);
    
    if (versionCheck.rows.length > 0) {
      console.log('✓ pgvector is working correctly');
      console.log(`  Version: ${versionCheck.rows[0].extversion}`);
      console.log('');
      
      console.log('='.repeat(60));
      console.log('Setup Complete!');
      console.log('='.repeat(60));
      console.log('');
      console.log('Next steps:');
      console.log('1. Run verification: npx ts-node scripts/check-rag-setup.ts');
      console.log('2. Ingest knowledge base: npx ts-node scripts/ingest-knowledge-base.ts');
      console.log('');
    } else {
      throw new Error('pgvector installation verification failed');
    }

  } catch (error) {
    console.error('');
    console.error('✗ Setup failed:', error);
    console.error('');
    
    if (error instanceof Error && error.message.includes('could not open extension control file')) {
      console.error('pgvector extension files are not installed on your system.');
      console.error('');
      console.error('Installation instructions:');
      console.error('');
      console.error('Windows:');
      console.error('1. Download pgvector from: https://github.com/pgvector/pgvector/releases');
      console.error('2. Or use pgAdmin to install extensions');
      console.error('3. Or compile from source if you have Visual Studio');
      console.error('');
      console.error('Alternative: Use Docker with PostgreSQL + pgvector:');
      console.error('  docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=PGSql ankane/pgvector');
      console.error('');
    }
    
    await dbPool.end();
    process.exit(1);
  }

  await dbPool.end();
}

// Run setup
setupPgVector().catch(error => {
  console.error('');
  console.error('✗ Fatal error:', error);
  process.exit(1);
});
