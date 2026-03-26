// ========================================
// Authentication Controller
// ========================================
// Handles HTTP requests for authentication:
// - POST /api/auth/register - Create new account
// - POST /api/auth/login - Login (step 1)
// - POST /api/auth/verify-2fa - Login (step 2, if 2FA enabled)
// - POST /api/auth/refresh - Refresh access token
// - POST /api/auth/logout - Logout
// - GET /api/auth/me - Get current user
// ========================================

const User = require('../models/User');
const authService = require('../services/authService');

// ----------------------------------------
// Register
// ----------------------------------------

/**
 * Register a new user
 * 
 * @route POST /api/auth/register
 * @body { email, password, firstName, lastName }
 */
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required: email, password, firstName, lastName',
      });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter a valid email address',
      });
    }

    // Validate password strength
    const passwordValidation = authService.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists',
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    await user.save();

    // Generate tokens
    const tokens = authService.generateTokenPair(user);

    // Store refresh token
    await authService.storeRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
      req.get('User-Agent') || 'unknown'
    );

    // Send response (don't include password!)
    res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          preferences: user.preferences,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        ...tokens,
      },
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Login
// ----------------------------------------

/**
 * Login user (step 1)
 * 
 * If 2FA is enabled, returns requires2FA: true
 * and a temporary token for step 2.
 * 
 * @route POST /api/auth/login
 * @body { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    // Get client IP for rate limiting
    const clientIP = req.ip || req.connection.remoteAddress;

    // Check failed attempts
    const failedAttempts = await authService.getFailedAttempts(email.toLowerCase());
    if (failedAttempts >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many failed login attempts. Please try again later.',
      });
    }

    // Find user with password field
    const user = await User.findByEmail(email);
    if (!user) {
      await authService.incrementFailedAttempts(email.toLowerCase());
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        status: 'error',
        message: 'Account is temporarily locked. Please try again later.',
        lockedUntil: user.security.lockUntil,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      await authService.incrementFailedAttempts(email.toLowerCase());
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Password is correct - reset failed attempts
    await user.resetLoginAttempts();
    await authService.resetFailedAttempts(email.toLowerCase());

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = authService.generateAccessToken({
        _id: user._id,
        email: user.email,
        temp2FA: true, // Mark as temporary
      });

      return res.json({
        status: 'success',
        message: '2FA verification required',
        data: {
          requires2FA: true,
          tempToken,
          // Include partial email for UI
          maskedEmail: maskEmail(user.email),
        },
      });
    }

    // No 2FA - generate full tokens
    const tokens = authService.generateTokenPair(user);

    // Store refresh token
    await authService.storeRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
      req.get('User-Agent') || 'unknown'
    );

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          preferences: user.preferences,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        ...tokens,
      },
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Refresh Token
// ----------------------------------------

/**
 * Refresh access token using refresh token
 * 
 * @route POST /api/auth/refresh
 * @body { refreshToken }
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
    }

    // Verify the refresh token
    const decoded = authService.verifyRefreshToken(token);
    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token',
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        status: 'error',
        message: 'Token has been revoked',
      });
    }

    // Check if token exists in store
    const isValid = await authService.isRefreshTokenValid(decoded.userId, token);
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Token not found or expired',
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found or account is deactivated',
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      // Invalidate all refresh tokens for this user
      await authService.removeAllRefreshTokens(user._id.toString());
      return res.status(401).json({
        status: 'error',
        message: 'Password was changed. Please login again.',
      });
    }

    // Token rotation: Remove old token, generate new pair
    await authService.removeRefreshToken(decoded.userId, token);

    const newTokens = authService.generateTokenPair(user);

    // Store new refresh token
    await authService.storeRefreshToken(
      user._id.toString(),
      newTokens.refreshToken,
      req.get('User-Agent') || 'unknown'
    );

    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: newTokens,
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Logout
// ----------------------------------------

/**
 * Logout user
 * 
 * @route POST /api/auth/logout
 * @body { refreshToken } (optional - to logout specific device)
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    // Blacklist access token if provided
    if (accessToken) {
      await authService.blacklistToken(accessToken, 15 * 60); // 15 minutes
    }

    // If refresh token provided, remove just that token
    if (refreshToken && req.user) {
      await authService.removeRefreshToken(req.user.userId, refreshToken);
      await authService.blacklistToken(refreshToken, 7 * 24 * 60 * 60); // 7 days
    }

    res.json({
      status: 'success',
      message: 'Logged out successfully',
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Logout from all devices
 * 
 * @route POST /api/auth/logout-all
 */
const logoutAll = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    // Remove all refresh tokens for user
    await authService.removeAllRefreshTokens(req.user.userId);

    res.json({
      status: 'success',
      message: 'Logged out from all devices',
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Get Current User
// ----------------------------------------

/**
 * Get current authenticated user
 * 
 * @route GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          preferences: user.preferences,
          twoFactorEnabled: user.twoFactorEnabled,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          lastLogin: user.security.lastLogin,
        },
      },
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Update Profile
// ----------------------------------------

/**
 * Update user profile
 * 
 * @route PUT /api/auth/profile
 * @body { firstName, lastName, preferences }
 */
const updateProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const { firstName, lastName, preferences } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Update allowed fields only
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (preferences) {
      // Merge preferences
      user.preferences = {
        ...user.preferences.toObject(),
        ...preferences,
      };
    }

    await user.save();

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          preferences: user.preferences,
        },
      },
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Change Password
// ----------------------------------------

/**
 * Change password
 * 
 * @route POST /api/auth/change-password
 * @body { currentPassword, newPassword }
 */
const changePassword = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required',
      });
    }

    // Validate new password
    const passwordValidation = authService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors,
      });
    }

    // Get user with password
    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Invalidate all refresh tokens (security measure)
    await authService.removeAllRefreshTokens(user._id.toString());

    // Generate new tokens
    const tokens = authService.generateTokenPair(user);

    // Store new refresh token
    await authService.storeRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
      req.get('User-Agent') || 'unknown'
    );

    res.json({
      status: 'success',
      message: 'Password changed successfully. All other sessions have been logged out.',
      data: tokens,
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Helper Functions
// ----------------------------------------

/**
 * Mask email for privacy
 * test@example.com -> t***@example.com
 */
const maskEmail = (email) => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.charAt(0) + '***';
  return `${maskedUsername}@${domain}`;
};

// ----------------------------------------
// Export
// ----------------------------------------

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  updateProfile,
  changePassword,
};
