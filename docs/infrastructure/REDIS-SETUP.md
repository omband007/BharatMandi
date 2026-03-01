# Redis Setup Guide

This guide explains how to set up Redis for translation caching in Bharat Mandi.

## Overview

Redis is used to cache translations from AWS Translate, reducing API calls and improving response times. We use a local Redis instance via Docker for development and can migrate to AWS ElastiCache for production.

## Prerequisites

- Docker installed on your system
- Docker Compose installed

## Setup Instructions

### 1. Start Redis Container

From the project root directory, run:

```bash
docker-compose up -d redis
```

This will:
- Pull the Redis 7 Alpine image (if not already downloaded)
- Start Redis on port 6379
- Create a persistent volume for data
- Enable append-only file (AOF) persistence

### 2. Verify Redis is Running

Check the container status:

```bash
docker-compose ps
```

You should see:
```
NAME                    STATUS              PORTS
bharat-mandi-redis      Up X seconds        0.0.0.0:6379->6379/tcp
```

### 3. Test Redis Connection

You can test the connection using redis-cli:

```bash
docker exec -it bharat-mandi-redis redis-cli ping
```

Expected output: `PONG`

### 4. Configure Environment Variables

Add the following to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Usage

### Starting Redis

```bash
docker-compose up -d redis
```

### Stopping Redis

```bash
docker-compose stop redis
```

### Restarting Redis

```bash
docker-compose restart redis
```

### Viewing Redis Logs

```bash
docker-compose logs -f redis
```

### Accessing Redis CLI

```bash
docker exec -it bharat-mandi-redis redis-cli
```

Common Redis CLI commands:
- `PING` - Test connection
- `KEYS translation:*` - List all translation cache keys
- `GET <key>` - Get value for a key
- `TTL <key>` - Check time-to-live for a key
- `DBSIZE` - Get number of keys in database
- `FLUSHDB` - Clear all keys (use with caution!)
- `INFO` - Get Redis server information

## Cache Management

### View Cache Statistics

From the Redis CLI:

```redis
# Count translation cache entries
KEYS translation:*

# Get database size
DBSIZE

# Get memory usage
INFO memory
```

### Clear Translation Cache

From the Redis CLI:

```redis
# Delete all translation cache keys
EVAL "return redis.call('del', unpack(redis.call('keys', 'translation:*')))" 0
```

Or from your application:

```typescript
import { getRedisClient } from './src/shared/cache/redis-client';

const redis = getRedisClient();
const keys = await redis.keys('translation:*');
if (keys.length > 0) {
  await redis.del(keys);
}
```

## Troubleshooting

### Redis Container Won't Start

1. Check if port 6379 is already in use:
   ```bash
   netstat -an | grep 6379
   ```

2. If port is in use, either:
   - Stop the other Redis instance
   - Change the port in `docker-compose.yml`:
     ```yaml
     ports:
       - "6380:6379"  # Use port 6380 instead
     ```
   - Update `REDIS_PORT` in `.env` accordingly

### Connection Refused Errors

1. Ensure Redis container is running:
   ```bash
   docker-compose ps
   ```

2. Check Redis logs for errors:
   ```bash
   docker-compose logs redis
   ```

3. Verify network connectivity:
   ```bash
   docker exec -it bharat-mandi-redis redis-cli ping
   ```

### Data Persistence Issues

Redis data is stored in a Docker volume named `redis-data`. To inspect:

```bash
docker volume inspect bharat-mandi_redis-data
```

To remove the volume (WARNING: deletes all cached data):

```bash
docker-compose down -v
```

## Production Considerations

For production deployment, consider:

1. **AWS ElastiCache**: Migrate to managed Redis service
   - Better availability and automatic failover
   - Automated backups
   - Monitoring and alerting

2. **Security**:
   - Enable password authentication
   - Use TLS/SSL for connections
   - Restrict network access

3. **Monitoring**:
   - Track cache hit rate
   - Monitor memory usage
   - Set up alerts for connection failures

4. **Scaling**:
   - Use Redis Cluster for horizontal scaling
   - Configure appropriate memory limits
   - Implement eviction policies

## Migration to ElastiCache

When ready to migrate to AWS ElastiCache:

1. Create ElastiCache Redis cluster in AWS Console
2. Update environment variables:
   ```env
   REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```
3. Update security groups to allow access from your EC2 instances
4. Test connection before switching production traffic

## Cache Configuration

Current cache settings:
- **TTL**: 24 hours for translations
- **Key Format**: `translation:<sha256-hash>`
- **Eviction Policy**: No eviction (relies on TTL)

To modify cache behavior, edit `src/features/i18n/translation.service.ts`:

```typescript
private readonly CACHE_TTL = 24 * 60 * 60; // Adjust as needed
```

## Performance Tips

1. **Preload Common Translations**: Use `preloadCommonTranslations()` to cache frequently used phrases
2. **Monitor Hit Rate**: Track cache effectiveness with `getCacheStats()`
3. **Batch Operations**: Use `translateBatch()` for multiple translations
4. **Connection Pooling**: Redis client automatically manages connection pooling

## Support

For issues or questions:
- Check Redis logs: `docker-compose logs redis`
- Review application logs for cache errors
- Consult Redis documentation: https://redis.io/docs/
