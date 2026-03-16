# Environment Management Guide

This guide explains how to manage different database environments for local development and AWS testing.

## Overview

The application supports two separate database environments:

1. **Local Development** - Docker PostgreSQL on port 5433
2. **AWS RDS Testing** - AWS RDS PostgreSQL in ap-southeast-2 region

**IMPORTANT**: These databases are completely separate. There is NO automatic replication between them.

## Environment Files

### `.env.local` - Local Development
- Uses Docker PostgreSQL on port 5433
- Database: `bharat_mandi`
- For local development and RAG testing
- Data is stored in Docker volume `postgres_data`

### `.env.aws` - AWS RDS Testing
- Uses AWS RDS PostgreSQL
- Database: `postgres`
- For testing before production deployment
- Data is persistent and backed up by AWS

### `.env` - Active Configuration
- This is the active environment file used by the application
- **DO NOT EDIT MANUALLY** - use the scripts below to switch environments
- Auto-generated when you switch environments

### `config/.env.production` - Production Deployment
- For EC2 production deployment
- Uses environment variables for sensitive data
- See `config/PRODUCTION-SETUP.md` for details

## Quick Start

### Switch to Local Development

```bash
npm run env:local
```

This will:
- Copy `.env.local` to `.env`
- Configure the app to use Docker PostgreSQL (port 5433)
- Display the current configuration

### Switch to AWS RDS Testing

```bash
npm run env:aws
```

This will:
- Copy `.env.aws` to `.env`
- Configure the app to use AWS RDS PostgreSQL
- Display a warning that you're connected to AWS
- Show the current configuration

### Check Current Environment

```bash
npm run env:status
```

This displays which database you're currently configured to use.

## Workflow Examples

### Local Development Workflow

```bash
# 1. Switch to local environment
npm run env:local

# 2. Start Docker services
docker-compose up -d

# 3. Initialize database (if needed)
npm run db:setup

# 4. Start development server
npm run dev
```

### AWS Testing Workflow

```bash
# 1. Switch to AWS environment
npm run env:aws

# 2. Start development server (connects to AWS RDS)
npm run dev

# 3. When done, switch back to local
npm run env:local
```

## Database Initialization

### Local Docker PostgreSQL

```bash
# Ensure Docker is running
docker-compose up -d

# Initialize database schema
npm run db:setup

# Verify tables were created
docker exec bharat-mandi-postgres psql -U postgres -d bharat_mandi -c "\dt"
```

### AWS RDS PostgreSQL

The AWS RDS database should already be initialized. If you need to run migrations:

```bash
# Switch to AWS environment
npm run env:aws

# Run migrations
npm run db:setup
```

## Important Notes

### No Automatic Replication

**There is NO automatic replication between local and AWS databases.** They are completely separate:

- Creating a user in local Docker does NOT create it in AWS RDS
- Creating a user in AWS RDS does NOT create it in local Docker
- Each environment has its own independent data

### The Sync Engine

The `SyncEngine` in the codebase is for a different purpose:
- It syncs between **PostgreSQL** (primary) and **SQLite** (offline cache)
- It does NOT sync between local PostgreSQL and AWS RDS
- This is for offline-first mobile app support

### Data Persistence

**Local Docker PostgreSQL**:
- Data stored in Docker volume: `postgres_data`
- Persists between container restarts
- Lost if you run `docker-compose down -v` (with `-v` flag)
- Lost if you delete the Docker volume

**AWS RDS PostgreSQL**:
- Data stored on AWS EBS volumes
- Automatic daily backups by AWS
- Persistent and highly available
- Managed by AWS

## Troubleshooting

### "Relation does not exist" Error

This means the database tables haven't been created:

```bash
# For local Docker
npm run env:local
npm run db:setup

# For AWS RDS
npm run env:aws
npm run db:setup
```

### Docker Volume Reset

If your Docker PostgreSQL data was lost:

```bash
# 1. Ensure Docker is running
docker-compose up -d

# 2. Recreate the schema
npm run db:setup

# 3. Restart your app
npm run dev
```

### Wrong Database Connection

If you're not sure which database you're connected to:

```bash
# Check current configuration
npm run env:status

# Or look at the startup logs when running npm run dev
# The database configuration is displayed at startup
```

### Switching Environments

Always use the npm scripts to switch environments:

```bash
# ✅ CORRECT
npm run env:local
npm run env:aws

# ❌ WRONG - Don't manually edit .env
# Manually editing .env can lead to confusion
```

## Best Practices

1. **Use Local for Development**
   - Use `npm run env:local` for day-to-day development
   - Test features locally before pushing to AWS

2. **Use AWS for Integration Testing**
   - Use `npm run env:aws` to test with AWS services
   - Verify everything works before production deployment

3. **Always Check Your Environment**
   - Run `npm run env:status` if you're unsure
   - Look at the startup logs when running `npm run dev`

4. **Don't Mix Environments**
   - Don't switch environments while the server is running
   - Stop the server, switch environment, then restart

5. **Backup Important Data**
   - Local Docker data can be lost
   - AWS RDS has automatic backups, but export important data regularly

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run env:local` | Switch to local Docker PostgreSQL |
| `npm run env:aws` | Switch to AWS RDS PostgreSQL |
| `npm run env:status` | Show current database configuration |
| `npm run db:setup` | Initialize database schema (run migrations) |
| `npm run dev` | Start development server |

## Related Documentation

- [Production Setup Guide](../config/PRODUCTION-SETUP.md)
- [Database Architecture](./architecture/aws-cloud-architecture.md)
- [Docker Compose Configuration](../docker-compose.yml)

## Support

If you encounter issues:

1. Check which environment you're using: `npm run env:status`
2. Verify Docker is running: `docker ps`
3. Check database connectivity in the startup logs
4. Ensure migrations have been run: `npm run db:setup`
