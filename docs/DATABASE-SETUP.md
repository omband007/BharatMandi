# PostgreSQL Database Setup Guide

This guide will help you set up PostgreSQL for the Bharat Mandi platform.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)

## Step 1: Install PostgreSQL

### Windows

**Option 1: Official Installer**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Default port is 5432

**Option 2: Using Chocolatey**
```powershell
choco install postgresql
```

### macOS

```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Step 2: Verify PostgreSQL Installation

```bash
# Check if PostgreSQL is running
pg_isready

# Expected output: /tmp:5432 - accepting connections
```

## Step 3: Create Database

### Windows (PowerShell or CMD)

```powershell
# Connect to PostgreSQL
psql -U postgres

# You'll be prompted for the password you set during installation
```

### macOS/Linux

```bash
# Connect to PostgreSQL
sudo -u postgres psql
```

### Create the Database

Once connected to psql, run:

```sql
-- Create database
CREATE DATABASE bharat_mandi;

-- Verify database was created
\l

-- Exit psql
\q
```

## Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
copy .env.example .env
```

2. Edit `.env` file with your PostgreSQL credentials:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bharat_mandi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_actual_password
```

## Step 5: Install Node.js Dependencies

```bash
npm install
```

This will install:
- `pg` - PostgreSQL client for Node.js
- `@types/pg` - TypeScript types for pg
- `dotenv` - Environment variable management

## Step 6: Run Database Migrations

```bash
# Run all migrations
npm run db:setup
```

Expected output:
```
=== Database Migration ===

✓ PostgreSQL connected successfully at: 2024-01-01T12:00:00.000Z
✓ Migrations table ready

Found 1 migration file(s)

→ Executing migration: 001_initial_schema.sql
✓ Migration completed: 001_initial_schema.sql

=== Migration Summary ===
Total migrations: 1
Executed: 1
Skipped: 0
=========================
```

## Step 7: Verify Database Schema

Connect to PostgreSQL and verify tables were created:

```bash
psql -U postgres -d bharat_mandi
```

```sql
-- List all tables
\dt

-- Expected tables:
-- users, listings, transactions, escrow_accounts, ratings,
-- credibility_scores, service_providers, logistics_orders,
-- storage_bookings, auction_listings, bids, government_schemes,
-- scheme_applications, route_optimizations, vehicle_tracking,
-- disputes, dispute_evidence, migrations

-- View table structure
\d users

-- Exit
\q
```

## Troubleshooting

### Issue: "psql: command not found"

**Windows:**
Add PostgreSQL bin directory to PATH:
1. Find PostgreSQL installation (usually `C:\Program Files\PostgreSQL\15\bin`)
2. Add to System Environment Variables PATH

**macOS:**
```bash
echo 'export PATH="/usr/local/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Linux:**
```bash
sudo apt-get install postgresql-client
```

### Issue: "Connection refused"

1. Check if PostgreSQL is running:
```bash
# Windows
sc query postgresql-x64-15

# macOS
brew services list

# Linux
sudo systemctl status postgresql
```

2. Start PostgreSQL if not running:
```bash
# Windows
net start postgresql-x64-15

# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### Issue: "password authentication failed"

1. Verify password in `.env` file matches PostgreSQL user password
2. Reset PostgreSQL password if needed:

```bash
# Connect as postgres user
psql -U postgres

# Change password
ALTER USER postgres PASSWORD 'new_password';
```

### Issue: "database does not exist"

Create the database manually:
```bash
psql -U postgres -c "CREATE DATABASE bharat_mandi;"
```

### Issue: Migration fails

1. Check PostgreSQL logs for detailed errors
2. Verify database user has proper permissions:

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE bharat_mandi TO postgres;
```

3. Reset and retry:
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS bharat_mandi;"
psql -U postgres -c "CREATE DATABASE bharat_mandi;"

# Run migrations again
npm run db:setup
```

## Database Management Commands

### Run Migrations
```bash
npm run db:setup
```

### Rollback Last Migration (Development Only)
```bash
npm run db:rollback
```

### Backup Database
```bash
pg_dump -U postgres bharat_mandi > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
psql -U postgres bharat_mandi < backup_20240101.sql
```

### View Migration History
```sql
SELECT * FROM migrations ORDER BY executed_at DESC;
```

## Next Steps

After successful database setup:

1. Start the development server:
```bash
npm run dev
```

2. The server will connect to PostgreSQL automatically
3. Check console for "✓ PostgreSQL connected successfully" message
4. You can now use the API endpoints with PostgreSQL backend

## Database Schema Overview

The database includes:

- **23 tables** covering all platform features
- **UUID primary keys** for better security and distribution
- **Foreign key constraints** for data integrity
- **Indexes** on frequently queried columns
- **Triggers** for automatic timestamp updates
- **Check constraints** for data validation

See `src/database/README.md` for detailed schema documentation.
