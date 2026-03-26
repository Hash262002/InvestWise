// ========================================
// Rate Limiting Middleware
// ========================================
// Protects against brute force and DDoS attacks
// Uses Redis for distributed rate limiting
// ========================================

const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

// ----------------------------------------
// Custom Redis Store for Rate Limiting
// ----------------------------------------

/**
 * Redis store for express-rate-limit
 * Uses Redis to track request counts across multiple server instances
 */
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.client = null;
  }

  /**
   * Get Redis client (lazy initialization)
   */
  getClient() {
    if (!this.client) {
      this.client = getRedisClient();
    }
    return this.client;
  }

  /**
   * Increment counter for a key
   * @param {string} key - Client identifier
   * @returns {Object} { totalHits, resetTime }
   */
  async increment(key) {
    const client = this.getClient();
    const prefixedKey = this.prefix + key;

    if (!client) {
      // Fallback to memory-based limiting
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    }

    try {
      const results = await client
        .multi()
        .incr(prefixedKey)
        .pttl(prefixedKey)
        .exec();

      const totalHits = results[0][1];
      let ttl = results[1][1];

      // If key is new (no TTL), set expiry
      if (ttl < 0) {
        await client.pexpire(prefixedKey, 60000); // 1 minute default
        ttl = 60000;
      }

      return {
        totalHits,
        resetTime: new Date(Date.now() + ttl),
      };
    } catch (error) {
      console.error('Rate limit Redis error:', error);
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    }
  }

  /**
   * Decrement counter (for successful requests)
   */
  async decrement(key) {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.decr(this.prefix + key);
    } catch (error) {
      console.error('Rate limit decrement error:', error);
    }
  }

  /**
   * Reset counter for a key
   */
  async resetKey(key) {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.del(this.prefix + key);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }
}

// ----------------------------------------
// Rate Limiter Configurations
// ----------------------------------------

/**
 * Create a rate limiter with custom settings
 * @param {Object} options - Rate limiter options
 */
const createLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute default
    max = 100,            // 100 requests default
    message = 'Too many requests, please try again later.',
    prefix = 'rl:',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    message: {
      status: 'error',
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    store: new RedisStore({ prefix }),
    skipSuccessfulRequests,
    skipFailedRequests,
    // Using default key generator based on IP
    validate: { xForwardedForHeader: false }, // Disable strict validation for dev
  });
};

// ----------------------------------------
// Pre-configured Rate Limiters
// ----------------------------------------

/**
 * General API rate limiter
 * 100 requests per minute
 */
const generalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: 'rl:general:',
  message: 'Too many requests. Please slow down.',
});

/**
 * Authentication rate limiter
 * 5 requests per 15 minutes (strict for login/register)
 */
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  prefix: 'rl:auth:',
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

/**
 * 2FA rate limiter
 * 3 attempts per 5 minutes
 */
const twoFactorLimiter = createLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  prefix: 'rl:2fa:',
  message: 'Too many 2FA attempts. Please wait 5 minutes.',
});

/**
 * Password reset rate limiter
 * 3 requests per hour
 */
const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  prefix: 'rl:reset:',
  message: 'Too many password reset attempts. Please try again in an hour.',
});

/**
 * AI Analysis rate limiter
 * 5 requests per hour (computationally expensive)
 */
const analysisLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  prefix: 'rl:analysis:',
  message: 'AI analysis limit reached. You can analyze 5 portfolios per hour.',
});

/**
 * Create account rate limiter
 * 3 accounts per IP per hour (prevent spam registrations)
 */
const createAccountLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  prefix: 'rl:create:',
  message: 'Too many accounts created from this IP. Please try again later.',
});

// ----------------------------------------
// Sliding Window Rate Limiter (Advanced)
// ----------------------------------------

/**
 * More accurate sliding window rate limiter using Redis sorted sets
 * Better than fixed window for preventing burst at window boundaries
 */
const slidingWindowLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests',
    keyPrefix = 'sw:',
  } = options;

  return async (req, res, next) => {
    const client = getRedisClient();
    if (!client) {
      // If Redis is down, fall through (or use memory fallback)
      return next();
    }

    const key = keyPrefix + (req.user?.userId || req.ip);
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove old entries
      await client.zremrangebyscore(key, 0, windowStart);

      // Count current entries
      const count = await client.zcard(key);

      if (count >= max) {
        // Get oldest entry to calculate retry time
        const oldest = await client.zrange(key, 0, 0, 'WITHSCORES');
        const retryAfter = oldest.length > 1 
          ? Math.ceil((parseInt(oldest[1]) + windowMs - now) / 1000)
          : Math.ceil(windowMs / 1000);

        return res.status(429).json({
          status: 'error',
          message,
          retryAfter,
        });
      }

      // Add current request
      await client.zadd(key, now, `${now}:${Math.random()}`);
      
      // Set key expiry
      await client.pexpire(key, windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - count - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      next();
    } catch (error) {
      console.error('Sliding window rate limit error:', error);
      next(); // Continue on error
    }
  };
};

// ----------------------------------------
// IP Blocking
// ----------------------------------------

/**
 * Block IPs with too many violations
 */
const blockBadIPs = async (req, res, next) => {
  const client = getRedisClient();
  if (!client) return next();

  const ip = req.ip;
  const blockKey = `blocked:${ip}`;

  try {
    const isBlocked = await client.get(blockKey);
    if (isBlocked) {
      return res.status(403).json({
        status: 'error',
        message: 'Your IP has been temporarily blocked due to suspicious activity.',
      });
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * Block an IP address
 * @param {string} ip - IP address to block
 * @param {number} duration - Block duration in seconds (default 1 hour)
 */
const blockIP = async (ip, duration = 3600) => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.setex(`blocked:${ip}`, duration, '1');
    return true;
  } catch (error) {
    console.error('Error blocking IP:', error);
    return false;
  }
};

/**
 * Unblock an IP address
 */
const unblockIP = async (ip) => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(`blocked:${ip}`);
    return true;
  } catch (error) {
    console.error('Error unblocking IP:', error);
    return false;
  }
};

// ----------------------------------------
// Export
// ----------------------------------------

module.exports = {
  // Pre-configured limiters
  generalLimiter,
  authLimiter,
  twoFactorLimiter,
  passwordResetLimiter,
  analysisLimiter,
  createAccountLimiter,
  
  // Factory functions
  createLimiter,
  slidingWindowLimiter,
  
  // IP blocking
  blockBadIPs,
  blockIP,
  unblockIP,
};
