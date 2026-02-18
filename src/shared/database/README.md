# Bharat Mandi - PostgreSQL Database

This directory contains the PostgreSQL database schema, migrations, and configuration for the Bharat Mandi platform.

## Database Structure

The database consists of the following main tables:

### Core Tables
- **users** - Farmers, buyers, and service providers
- **listings** - Produce listings in the marketplace
- **transactions** - Purchase transactions between farmers and buyers
- **escrow_accounts** - Secure payment escrow for transactions

### Rating & Credibility
- **ratings** - User ratings and feedback
- **credibility_scores** - Farmer credibility scores
- **credibility_score_history** - Historical credibility score changes

### Ecosystem Integration
- **service_providers** - Logistics, storage, and supplier providers
- **logistics_orders** - Logistics and delivery orders
- **storage_bookings** - Cold storage bookings
- **vehicle_tracking** - Real-time vehicle location tracking
- **route_optimizations** - Optimized delivery routes

### Auctions
- **auction_listings** - Auction-based produce listings
- **bids** - Bids placed on auctions

### Government Schemes
- **government_schemes** - Available government schemes
- **scheme_applications** - Farmer applications for schemes

### Disputes
- **disputes** - Transaction disputes
- **dispute_evidence** - Evidence submitted for disputes

## Setup Instructions

### 1. Install PostgreSQL

**Windows:**
```bash
# Download and install from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bharat_mandi;

# Exit psql
\q
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bharat_mandi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
```

### 4. Install Dependencies

```bash
npm install pg @types/pg
```

### 5. Run Migrations

```bash
# Run all pending migrations
npm run migrate up

# Rollback last migration (development only)
npm run migrate rollback
```

## Migration System

Migrations are SQL files located in `src/database/migrations/` directory. They are executed in alphabetical order.

### Creating a New Migration

1. Create a new file in `src/database/migrations/` with format: `XXX_description.sql`
   - Example: `002_add_user_preferences.sql`

2. Write your SQL migration:
```sql
-- Migration: 002_add_user_preferences
-- Description: Add user preferences table
-- Date: 2024-01-15

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id);
```

3. Run migrations:
```bash
npm run migrate up
```

## Database Connection

### Using the Pool

```typescript
import { pool, query } from './database/pg-config';

// Simple query
const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

// Using pool directly
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM users');
  console.log(result.rows);
} finally {
  client.release();
}
```

### Transactions

```typescript
import { getClient } from './database/pg-config';

const client = await getClient();
try {
  await client.query('BEGIN');
  
  await client.query('INSERT INTO users (name, phone) VALUES ($1, $2)', ['John', '1234567890']);
  await client.query('INSERT INTO credibility_scores (farmer_id, score) VALUES ($1, $2)', [userId, 500]);
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Schema Features

### Automatic Timestamps
Tables with `updated_at` columns automatically update the timestamp on row updates using triggers.

### UUID Primary Keys
All tables use UUID primary keys for better distribution and security.

### Foreign Key Constraints
Proper foreign key relationships ensure data integrity with CASCADE deletes where appropriate.

### Indexes
Strategic indexes on frequently queried columns for optimal performance:
- User lookups by phone, type, location
- Transaction queries by status, dates
- Listing searches by produce type, active status
- Rating and credibility score queries

### Check Constraints
Enum-like constraints on status fields ensure data validity.

## Maintenance

### Backup Database
```bash
pg_dump -U postgres bharat_mandi > backup.sql
```

### Restore Database
```bash
psql -U postgres bharat_mandi < backup.sql
```

### View Migration Status
```sql
SELECT * FROM migrations ORDER BY executed_at DESC;
```

### Reset Database (Development Only)
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS bharat_mandi;"
psql -U postgres -c "CREATE DATABASE bharat_mandi;"

# Run migrations
npm run migrate up
```

## Performance Tips

1. **Connection Pooling**: Always use the pool for queries instead of creating new connections
2. **Prepared Statements**: Use parameterized queries ($1, $2) to prevent SQL injection and improve performance
3. **Indexes**: Add indexes for columns frequently used in WHERE, JOIN, and ORDER BY clauses
4. **Batch Operations**: Use batch inserts/updates when possible
5. **Query Analysis**: Use EXPLAIN ANALYZE to optimize slow queries

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running: `pg_isready`
- Check connection settings in `.env`
- Verify firewall settings

### Migration Fails
- Check PostgreSQL logs for detailed errors
- Ensure database user has proper permissions
- Verify SQL syntax in migration file

### Performance Issues
- Run `VACUUM ANALYZE` to update statistics
- Check for missing indexes on frequently queried columns
- Monitor connection pool usage
