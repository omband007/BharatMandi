import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL connection configuration
const poolConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'bharat_mandi',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create a connection pool
export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✓ PostgreSQL connected successfully at:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('✗ PostgreSQL connection failed:', error);
    return false;
  }
}

// Execute a query
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Get a client from the pool for transactions
export async function getClient() {
  return await pool.connect();
}

// Close the pool
export async function closePool() {
  await pool.end();
  console.log('PostgreSQL pool closed');
}
