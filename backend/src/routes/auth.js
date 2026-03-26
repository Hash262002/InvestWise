// ========================================
// Authentication Routes
// ========================================
// All routes related to user authentication
// ========================================

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const twoFactorController = require('../controllers/twoFactorController');

// Import middleware
const { protect } = require('../middleware/auth');
const { 
  authLimiter, 
  createAccountLimiter,
  passwordResetLimiter,
  twoFactorLimiter,
} = require('../middleware/rateLimiter');

// ----------------------------------------
// Public Routes (No Authentication Required)
// ----------------------------------------

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email, password, firstName, lastName }
 */
router.post('/register', createAccountLimiter, authLimiter, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (step 1)
 * @access  Public
 * @body    { email, password }
 * @returns { tokens } or { requires2FA, tempToken }
 */
router.post('/login', authLimiter, authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/refresh', authController.refreshToken);

// ----------------------------------------
// Protected Routes (Authentication Required)
// ----------------------------------------

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate tokens)
 * @access  Private
 * @body    { refreshToken } (optional)
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', protect, authController.logoutAll);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 * @body    { firstName, lastName, preferences }
 */
router.put('/profile', protect, authController.updateProfile);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.post('/change-password', protect, passwordResetLimiter, authController.changePassword);

// ----------------------------------------
// 2FA Routes
// ----------------------------------------

/**
 * @route   POST /api/auth/enable-2fa
 * @desc    Start 2FA setup - generates QR code
 * @access  Private
 */
router.post('/enable-2fa', protect, twoFactorController.enable2FA);

/**
 * @route   POST /api/auth/confirm-2fa
 * @desc    Verify TOTP and activate 2FA
 * @access  Private
 * @body    { token }
 */
router.post('/confirm-2fa', protect, twoFactorLimiter, twoFactorController.confirm2FA);

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify TOTP during login (step 2)
 * @access  Public (requires temp token)
 * @body    { tempToken, token } or { tempToken, backupCode }
 */
router.post('/verify-2fa', twoFactorLimiter, twoFactorController.verify2FA);

/**
 * @route   POST /api/auth/disable-2fa
 * @desc    Disable 2FA
 * @access  Private
 * @body    { password } or { token }
 */
router.post('/disable-2fa', protect, twoFactorController.disable2FA);

/**
 * @route   GET /api/auth/backup-codes
 * @desc    Get backup code status (count remaining)
 * @access  Private
 */
router.get('/backup-codes', protect, twoFactorController.getBackupCodes);

/**
 * @route   POST /api/auth/regenerate-backup-codes
 * @desc    Generate new backup codes
 * @access  Private
 * @body    { token }
 */
router.post('/regenerate-backup-codes', protect, twoFactorLimiter, twoFactorController.regenerateBackupCodes);

module.exports = router;
