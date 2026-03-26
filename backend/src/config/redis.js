// ========================================
// Redis Connection Configuration
// ========================================
// Redis is an in-memory data store used for:
// - Caching (store frequently accessed data)
// - Session storage
// - Rate limiting counters
// - Real-time features (pub/sub)
// 
// We use 'ioredis' - a robust Redis client for Node.js
// ========================================

const Redis = require('ioredis');

// Create Redis client
// The client will auto-connect when first command is issued
let redisClient = null;

/**
 * Initialize Redis connection
 * 
 * Creates a new Redis client with the configured options.
 * Handles connection events and errors.
 * 
 * @returns {Redis} Redis client instance
 */
const connectRedis = () => {
  try {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number.parseInt(process.env.REDIS_DB) || 0,
      
      // Retry strategy for connection failures
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`🔄 Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      
      // Maximum number of retries
      maxRetriesPerRequest: 3,
    };

    redisClient = new Redis(redisConfig);

    // Connection event handlers
    redisClient.on('connect', () => {
      console.log('🔴 Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('🟢 Redis connected and ready');
      console.log(`   Host: ${redisConfig.host}:${redisConfig.port}`);
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });

    redisClient.on('close', () => {
      console.warn('⚠️  Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error.message);
    return null;
  }
};

/**
 * Get the Redis client instance
 * 
 * @returns {Redis|null} Redis client or null if not initialized
 */
const getRedisClient = () => {
  if (!redisClient) {
    return connectRedis();
  }
  return redisClient;
};

/**
 * Disconnect from Redis
 * 
 * Use this for graceful shutdown
 */
const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('🔴 Redis connection closed');
    redisClient = null;
  }
};

// ========================================
// Redis Helper Functions
// ========================================

/**
 * Cache data with expiration
 * 
 * @param {string} key - Cache key
 * @param {any} value - Data to cache (will be JSON stringified)
 * @param {number} ttlSeconds - Time to live in seconds
 */
const cacheSet = async (key, value, ttlSeconds = 300) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
    return true;
  } catch (error) {
    console.error('Redis cacheSet error:', error.message);
    return false;
  }
};

/**
 * Get cached data
 * 
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if not found
 */
const cacheGet = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis cacheGet error:', error.message);
    return null;
  }
};

/**
 * Delete cached data
 * 
 * @param {string} key - Cache key
 */
const cacheDelete = async (key) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis cacheDelete error:', error.message);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  cacheSet,
  cacheGet,
  cacheDelete,
};
