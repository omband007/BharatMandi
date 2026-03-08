import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL connection configuration
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'bharat_mandi',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  logging: false, // Disable SQL query logging
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false // For AWS RDS
    } : false
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Test connection
export async function testSequelizeConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('✓ Sequelize PostgreSQL connection established');
    return true;
  } catch (error) {
    console.error('✗ Sequelize PostgreSQL connection failed:', error);
    return false;
  }
}

// Sync database (create tables if they don't exist)
export async function syncDatabase(force: boolean = false): Promise<void> {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log(`✓ Database synced ${force ? '(force)' : '(alter)'}`);
  } catch (error) {
    console.error('✗ Database sync failed:', error);
    throw error;
  }
}

// Close connection
export async function closeSequelizeConnection(): Promise<void> {
  try {
    await sequelize.close();
    console.log('✓ Sequelize connection closed');
  } catch (error) {
    console.error('✗ Error closing Sequelize connection:', error);
  }
}

export { sequelize };
export default sequelize;
