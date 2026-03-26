// ========================================
// Authentication Middleware
// ========================================
// Middleware to protect routes requiring authentication
// Verifies JWT tokens and attaches user info to request
// ========================================

const authService = require('../services/authService');
const User = require('../models/User');

/**
 * Protect middleware
 * 
 * Verifies the JWT access token and attaches user info to req.user
 * Use this middleware on routes that require authentication.
 * 
 * Usage: router.get('/protected', protect, (req, res) => { ... })
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required',
        code: 'NO_TOKEN',
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        status: 'error',
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
    }

    // Verify token
    const decoded = authService.verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'error',
        message: 'Password was recently changed. Please login again.',
        code: 'PASSWORD_CHANGED',
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    // Also attach the full user document if needed
    req.userDoc = user;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
};

/**
 * Optional auth middleware
 * 
 * Like protect, but doesn't fail if no token is provided.
 * Useful for routes that work for both authenticated and anonymous users.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // No token = anonymous user, continue without user info
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Check blacklist
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return next(); // Continue as anonymous
    }

    // Verify token
    const decoded = authService.verifyAccessToken(token);
    if (!decoded) {
      return next(); // Continue as anonymous
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (user && user.isActive) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
      req.userDoc = user;
    }

    next();
  } catch (error) {
    // On error, continue as anonymous
    next();
  }
};

/**
 * Require 2FA middleware
 * 
 * Ensures the user has 2FA enabled and verified for this session.
 * Use after protect middleware for sensitive operations.
 */
const require2FA = async (req, res, next) => {
  try {
    if (!req.userDoc) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // If user doesn't have 2FA enabled, that's fine
    if (!req.userDoc.twoFactorEnabled) {
      return next();
    }

    // Check if this session has verified 2FA
    // This would be set during the 2FA verification step
    if (!req.user.verified2FA) {
      return res.status(403).json({
        status: 'error',
        message: '2FA verification required',
        code: '2FA_REQUIRED',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check ownership middleware factory
 * 
 * Creates middleware to verify the user owns the requested resource.
 * 
 * Usage:
 *   router.get('/portfolios/:id', protect, checkOwnership('portfolio'), handler)
 * 
 * @param {string} resourceType - Type of resource (portfolio, holding, alert)
 * @returns {Function} Express middleware
 */
const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      
      if (!resourceId) {
        return res.status(400).json({
          status: 'error',
          message: 'Resource ID is required',
        });
      }

      let Model;
      switch (resourceType) {
        case 'portfolio':
          Model = require('../models/Portfolio');
          break;
        case 'holding':
          Model = require('../models/Holding');
          break;
        case 'alert':
          Model = require('../models/Alert');
          break;
        default:
          return res.status(500).json({
            status: 'error',
            message: 'Invalid resource type',
          });
      }

      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          status: 'error',
          message: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`,
        });
      }

      // Check ownership
      if (resource.user.toString() !== req.user.userId) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to access this resource',
        });
      }

      // Attach resource to request for handler to use
      req[resourceType] = resource;

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ----------------------------------------
// Export
// ----------------------------------------

module.exports = {
  protect,
  optionalAuth,
  require2FA,
  checkOwnership,
};
