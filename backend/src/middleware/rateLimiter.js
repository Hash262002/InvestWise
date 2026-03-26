const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Create a rate limiter with Redis store
 */
const createRateLimiter = (options) => {
  const redisClient = getRedisClient();
  
  const config = {
    windowMs: options.windowMs || 60 * 1000, // 1 minute default
    max: options.max || 100,
    message: {
      error: 'Too Many Requests',
      message: options.message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil((options.windowMs || 60000) / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => {
      // Use user ID if authenticated, otherwise IP
      return req.userId?.toString() || req.ip;
    }),
    skip: options.skip || (() => false),
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.userId,
        path: req.path,
        limit: options.max,
      });
      res.status(429).json(options.message);
    },
  };

  // Use Redis store if available, otherwise memory store
  if (redisClient) {
    config.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: options.prefix || 'rl:',
    });
  }

  return rateLimit(config);
};

/**
 * General API rate limiter - 100 requests per minute
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

/**
 * Authentication rate limiter - stricter for login/register
 * 10 attempts per 15 minutes
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  prefix: 'rl:auth:',
  keyGenerator: (req) => req.ip,
});

/**
 * Analysis rate limiter - expensive operation
 * 5 requests per minute per user
 */
const analysisLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.ANALYSIS_RATE_LIMIT_MAX) || 5,
  message: 'Too many analysis requests. Please wait before requesting another analysis.',
  prefix: 'rl:analysis:',
  keyGenerator: (req) => req.userId?.toString() || req.ip,
});

/**
 * Portfolio creation limiter
 * 20 portfolios per hour
 */
const portfolioCreateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Portfolio creation limit reached. Please try again later.',
  prefix: 'rl:portfolio:',
  keyGenerator: (req) => req.userId?.toString() || req.ip,
});

/**
 * CSV import limiter - resource intensive
 * 10 imports per hour
 */
const importLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Import limit reached. Please try again later.',
  prefix: 'rl:import:',
  keyGenerator: (req) => req.userId?.toString() || req.ip,
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  analysisLimiter,
  portfolioCreateLimiter,
  importLimiter,
};
