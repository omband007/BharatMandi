import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let isConnecting = false;

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export function getRedisConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  };
}

export async function initializeRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    await new Promise(resolve => setTimeout(resolve, 100));
    if (redisClient && redisClient.isOpen) {
      return redisClient;
    }
    throw new Error('Redis connection in progress');
  }

  isConnecting = true;

  try {
    const config = getRedisConfig();
    
    redisClient = createClient({
      socket: {
        host: config.host,
        port: config.port,
        connectTimeout: 2000, // 2 second timeout
        reconnectStrategy: false, // Don't auto-reconnect in tests
      },
      password: config.password,
      database: config.db,
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Client ready');
    });

    redisClient.on('end', () => {
      console.log('[Redis] Connection closed');
    });

    await redisClient.connect();
    isConnecting = false;
    return redisClient;
  } catch (error) {
    isConnecting = false;
    redisClient = null;
    console.error('[Redis] Failed to initialize:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client not initialized. Call initializeRedisClient() first.');
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

export async function isRedisAvailable(): Promise<boolean> {
  try {
    if (!redisClient || !redisClient.isOpen) {
      await initializeRedisClient();
    }
    await redisClient!.ping();
    return true;
  } catch (error) {
    console.error('[Redis] Availability check failed:', error);
    return false;
  }
}
