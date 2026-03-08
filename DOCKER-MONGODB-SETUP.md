# Docker & MongoDB Setup Guide

## Current Status
✅ **Docker is RUNNING** - Both MongoDB and Redis containers are up and healthy

## Container Information

### MongoDB
- **Container Name**: `bharat-mandi-mongodb`
- **Image**: `mongo:7.0`
- **Port**: `27017` (mapped to localhost:27017)
- **Database**: `bharat_mandi`
- **Connection String**: `mongodb://localhost:27017/bharat_mandi`
- **Status**: Healthy (Up 16 hours)

### Redis
- **Container Name**: `bharat-mandi-redis`
- **Image**: `redis:7-alpine`
- **Port**: `6379` (mapped to localhost:6379)
- **Status**: Healthy (Up 16 hours)

## Docker Commands

### Start Docker Containers
```powershell
# Start all services (MongoDB + Redis)
docker-compose up -d

# Start only MongoDB
docker-compose up -d mongodb

# Start only Redis
docker-compose up -d redis
```

### Stop Docker Containers
```powershell
# Stop all services
docker-compose down

# Stop but keep data volumes
docker-compose stop
```

### Check Container Status
```powershell
# List running containers
docker ps

# Check container logs
docker logs bharat-mandi-mongodb
docker logs bharat-mandi-redis

# Check MongoDB health
docker exec bharat-mandi-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Restart Containers
```powershell
# Restart all services
docker-compose restart

# Restart only MongoDB
docker-compose restart mongodb
```

### Access MongoDB Shell
```powershell
# Connect to MongoDB shell
docker exec -it bharat-mandi-mongodb mongosh bharat_mandi

# Run a quick command
docker exec bharat-mandi-mongodb mongosh --eval "db.stats()"
```

### View Data Volumes
```powershell
# List volumes
docker volume ls

# Inspect MongoDB volume
docker volume inspect bharat-mandi_mongodb_data
```

## MongoDB Collections

The following collections are used in Bharat Mandi:

1. **Kisan Mitra** (AI Chat Assistant)
   - `conversations` - Chat conversation logs
   - `farming_tips` - Agricultural tips and advice

2. **Crop Diagnosis** (Dr. Crop)
   - `diagnoses` - Diagnosis history
   - `expert_reviews` - Expert review requests

## Environment Configuration

Your `.env` file is configured with:
```env
MONGODB_URI=mongodb://localhost:27017/bharat_mandi
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Troubleshooting

### MongoDB Connection Issues

If you see MongoDB connection errors in your app:

1. **Check if Docker is running**:
   ```powershell
   docker ps
   ```

2. **Start MongoDB if stopped**:
   ```powershell
   docker-compose up -d mongodb
   ```

3. **Check MongoDB logs**:
   ```powershell
   docker logs bharat-mandi-mongodb --tail 50
   ```

4. **Test connection**:
   ```powershell
   docker exec bharat-mandi-mongodb mongosh --eval "db.adminCommand('ping')"
   ```

### Redis Connection Issues

1. **Check Redis status**:
   ```powershell
   docker exec bharat-mandi-redis redis-cli ping
   ```
   Should return: `PONG`

2. **Check Redis logs**:
   ```powershell
   docker logs bharat-mandi-redis --tail 50
   ```

## Data Persistence

Data is persisted in Docker volumes:
- `bharat-mandi_mongodb_data` - MongoDB data
- `bharat-mandi_redis_data` - Redis data

These volumes persist even when containers are stopped or removed (unless you use `docker-compose down -v`).

## Clean Start (Reset All Data)

⚠️ **WARNING**: This will delete all data!

```powershell
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Quick Reference

| Action | Command |
|--------|---------|
| Start all | `docker-compose up -d` |
| Stop all | `docker-compose down` |
| Restart all | `docker-compose restart` |
| View logs | `docker-compose logs -f` |
| Check status | `docker ps` |
| MongoDB shell | `docker exec -it bharat-mandi-mongodb mongosh bharat_mandi` |
| Redis CLI | `docker exec -it bharat-mandi-redis redis-cli` |

## Integration with App

Your Node.js app connects to:
- **MongoDB**: `mongodb://localhost:27017/bharat_mandi`
- **Redis**: `localhost:6379`

The app will automatically reconnect if MongoDB/Redis are unavailable, with graceful error handling in the diagnosis service.
