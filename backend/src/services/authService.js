// ========================================
// Authentication Service
// ========================================
// Handles all authentication-related business logic:
// - Password hashing/verification
// - JWT token generation
// - Refresh token management
// ========================================

const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { getRedisClient } = require('../config/redis');

// ----------------------------------------
// JWT Configuration
// ----------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// ----------------------------------------
// Token Generation
// ----------------------------------------

/**
 * Generate an access token (short-lived)
 * 
 * Access tokens are used for API authentication.
 * They expire quickly (15 mins) for security.
 * 
 * @param {Object} user - User document from MongoDB
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
    issuer: 'investwise',
    subject: user._id.toString(),
  });
};

/**
 * Generate a refresh token (long-lived)
 * 
 * Refresh tokens are used to get new access tokens
 * without requiring the user to login again.
 * 
 * @param {Object} user - User document from MongoDB
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    type: 'refresh',
    // Add a unique identifier for token revocation
    tokenId: crypto.randomBytes(16).toString('hex'),
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
    issuer: 'investwise',
    subject: user._id.toString(),
  });
};

/**
 * Generate both access and refresh tokens
 * 
 * @param {Object} user - User document
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokenPair = (user) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

// ----------------------------------------
// Token Verification
// ----------------------------------------

/**
 * Verify an access token
 * 
 * @param {string} token - JWT access token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'investwise',
    });
    
    if (decoded.type !== 'access') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Failed to verify access token:', error.message);
    return null;
  }
};

/**
 * Verify a refresh token
 * 
 * @param {string} token - JWT refresh token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'investwise',
    });
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Failed to verify refresh token:', error.message);
    return null;
  }
};

// ----------------------------------------
// Token Blacklisting (for logout)
// ----------------------------------------

/**
 * Add a token to the blacklist (Redis)
 * Used when user logs out to invalidate tokens
 * 
 * @param {string} token - Token to blacklist
 * @param {number} expiresIn - Seconds until token would naturally expire
 */
const blacklistToken = async (token, expiresIn = 3600) => {
  const redis = getRedisClient();
  if (!redis) {
    console.warn('Redis not available for token blacklisting');
    return false;
  }
  
  try {
    // Store token hash in Redis with same expiry as token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await redis.setex(`blacklist:${tokenHash}`, expiresIn, '1');
    return true;
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

/**
 * Check if a token is blacklisted
 * 
 * @param {string} token - Token to check
 * @returns {boolean} True if blacklisted
 */
const isTokenBlacklisted = async (token) => {
  const redis = getRedisClient();
  if (!redis) {
    return false; // If Redis is down, allow token (fallback)
  }
  
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await redis.get(`blacklist:${tokenHash}`);
    return result === '1';
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
};

// ----------------------------------------
// Refresh Token Storage
// ----------------------------------------

/**
 * Store refresh token for a user (for token rotation)
 * 
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token
 * @param {string} deviceInfo - Optional device identifier
 */
const storeRefreshToken = async (userId, refreshToken, deviceInfo = 'unknown') => {
  const redis = getRedisClient();
  if (!redis) return false;
  
  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const key = `refresh:${userId}:${tokenHash}`;
    
    // Store token with device info and timestamp
    await redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify({
      deviceInfo,
      createdAt: Date.now(),
    }));
    
    return true;
  } catch (error) {
    console.error('Error storing refresh token:', error);
    return false;
  }
};

/**
 * Remove a refresh token
 * 
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token to remove
 */
const removeRefreshToken = async (userId, refreshToken) => {
  const redis = getRedisClient();
  if (!redis) return false;
  
  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const key = `refresh:${userId}:${tokenHash}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Error removing refresh token:', error);
    return false;
  }
};

/**
 * Remove all refresh tokens for a user (logout from all devices)
 * 
 * @param {string} userId - User ID
 */
const removeAllRefreshTokens = async (userId) => {
  const redis = getRedisClient();
  if (!redis) return false;
  
  try {
    const pattern = `refresh:${userId}:*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    return true;
  } catch (error) {
    console.error('Error removing all refresh tokens:', error);
    return false;
  }
};

/**
 * Check if refresh token is valid (exists in store)
 * 
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token
 * @returns {boolean}
 */
const isRefreshTokenValid = async (userId, refreshToken) => {
  const redis = getRedisClient();
  if (!redis) return true; // Fallback if Redis is down
  
  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const key = `refresh:${userId}:${tokenHash}`;
    const result = await redis.get(key);
    return result !== null;
  } catch (error) {
    console.error('Error checking refresh token:', error);
    return true; // Fallback
  }
};

// ----------------------------------------
// Password Utilities
// ----------------------------------------

/**
 * Validate password strength
 * 
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// ----------------------------------------
// Rate Limiting Helpers
// ----------------------------------------

/**
 * Increment failed login attempts for an IP/email
 * 
 * @param {string} identifier - IP address or email
 * @returns {number} Current attempt count
 */
const incrementFailedAttempts = async (identifier) => {
  const redis = getRedisClient();
  if (!redis) return 0;
  
  try {
    const key = `failed_login:${identifier}`;
    const attempts = await redis.incr(key);
    
    // Set expiry on first attempt (15 minutes)
    if (attempts === 1) {
      await redis.expire(key, 15 * 60);
    }
    
    return attempts;
  } catch (error) {
    console.error('Error incrementing failed attempts:', error);
    return 0;
  }
};

/**
 * Reset failed login attempts
 * 
 * @param {string} identifier - IP address or email
 */
const resetFailedAttempts = async (identifier) => {
  const redis = getRedisClient();
  if (!redis) return;
  
  try {
    const key = `failed_login:${identifier}`;
    await redis.del(key);
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
  }
};

/**
 * Get current failed login attempts
 * 
 * @param {string} identifier - IP address or email
 * @returns {number} Current attempt count
 */
const getFailedAttempts = async (identifier) => {
  const redis = getRedisClient();
  if (!redis) return 0;
  
  try {
    const key = `failed_login:${identifier}`;
    const attempts = await redis.get(key);
    return Number.parseInt(attempts) || 0;
  } catch (error) {
    console.error('Error getting failed attempts:', error);
    return 0;
  }
};

// ----------------------------------------
// Export
// ----------------------------------------

module.exports = {
  // Token generation
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  
  // Token verification
  verifyAccessToken,
  verifyRefreshToken,
  
  // Token management
  blacklistToken,
  isTokenBlacklisted,
  storeRefreshToken,
  removeRefreshToken,
  removeAllRefreshTokens,
  isRefreshTokenValid,
  
  // Password utilities
  validatePassword,
  
  // Rate limiting
  incrementFailedAttempts,
  resetFailedAttempts,
  getFailedAttempts,
};
