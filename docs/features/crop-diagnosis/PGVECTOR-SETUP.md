# pgvector Setup Guide

## Problem

The RAG feature requires PostgreSQL with the pgvector extension. Your local PostgreSQL installation doesn't have pgvector installed.

## Solution Options

### Option 1: Use Docker (Recommended - Easiest)

This is the fastest way to get PostgreSQL with pgvector running.

#### Step 1: Stop your local PostgreSQL service

```powershell
# Stop the local PostgreSQL service to free up port 5432
Stop-Service postgresql-x64-18
```

#### Step 2: Start PostgreSQL with Docker

```bash
# Start PostgreSQL with pgvector using Docker Compose
docker-compose up -d postgres

# Verify it's running
docker ps | grep postgres
```

#### Step 3: Verify pgvector is installed

```bash
npx ts-node scripts/check-rag-setup.ts
```

Expected output:
```
✓ PostgreSQL Connection - Connected successfully
✓ pgvector Extension - Extension installed
⚠ rag_documents Table - Table does not exist (will be created automatically)
✓ AWS Bedrock (Embeddings) - Embedding generation working
```

#### Step 4: Ingest knowledge base

```bash
npx ts-node scripts/ingest-knowledge-base.ts
```

### Option 2: Install pgvector on Windows PostgreSQL

This is more complex and requires compilation.

#### Requirements
- Visual Studio with C++ build tools
- PostgreSQL development files
- Git

#### Steps

1. **Clone pgvector repository**
   ```bash
   git clone https://github.com/pgvector/pgvector.git
   cd pgvector
   ```

2. **Build and install**
   ```bash
   # This requires Visual Studio and PostgreSQL dev files
   # Follow instructions at: https://github.com/pgvector/pgvector#windows
   ```

3. **Enable extension**
   ```sql
   -- Connect to bharat_mandi database
   psql -U postgres -d bharat_mandi
   
   -- Create extension
   CREATE EXTENSION vector;
   ```

### Option 3: Use Remote PostgreSQL (AWS RDS)

If you have access to AWS RDS with pgvector:

1. **Update .env to use RDS**
   ```bash
   # Uncomment RDS configuration in .env
   POSTGRES_HOST=bharat-mandi-testing.c1y0cuowi6cr.ap-southeast-2.rds.amazonaws.com
   POSTGRES_PORT=5432
   POSTGRES_DB=postgres
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=EmqTqar2Nz9nWZB
   DB_SSL=true
   ```

2. **Ensure pgvector is installed on RDS**
   ```sql
   -- Connect to RDS
   psql -h bharat-mandi-testing.c1y0cuowi6cr.ap-southeast-2.rds.amazonaws.com -U postgres
   
   -- Create extension
   CREATE EXTENSION vector;
   ```

## Recommended Approach

**Use Docker (Option 1)** - It's the simplest and most reliable way to get pgvector working on Windows.

## Switching Between Local and Docker PostgreSQL

### Use Docker PostgreSQL
```powershell
# Stop local PostgreSQL
Stop-Service postgresql-x64-18

# Start Docker PostgreSQL
docker-compose up -d postgres

# .env should have:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bharat_mandi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=PGSql
DB_SSL=false
```

### Use Local PostgreSQL (after installing pgvector)
```powershell
# Stop Docker PostgreSQL
docker-compose stop postgres

# Start local PostgreSQL
Start-Service postgresql-x64-18

# .env should have:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bharat_mandi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=PGSql
DB_SSL=false
```

## Verification

After setup, run the verification script:

```bash
npx ts-node scripts/check-rag-setup.ts
```

All checks should pass (or have warnings only, no failures).

## Troubleshooting

### Port 5432 already in use
```powershell
# Check what's using port 5432
netstat -ano | findstr :5432

# Stop local PostgreSQL service
Stop-Service postgresql-x64-18
```

### Docker not starting
```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs postgres
```

### Connection refused
```bash
# Wait for PostgreSQL to be ready
docker-compose ps

# Check health status
docker inspect bharat-mandi-postgres | grep Health
```

## Next Steps

Once pgvector is set up:

1. ✅ Run verification: `npx ts-node scripts/check-rag-setup.ts`
2. ✅ Ingest knowledge base: `npx ts-node scripts/ingest-knowledge-base.ts`
3. ✅ Test RAG: Follow `RAG-QUICK-START.md`
