// ========================================
// Two-Factor Authentication Controller
// ========================================
// Handles 2FA HTTP endpoints:
// - POST /api/auth/enable-2fa - Start 2FA setup
// - POST /api/auth/confirm-2fa - Verify and activate 2FA
// - POST /api/auth/verify-2fa - Verify TOTP during login
// - POST /api/auth/disable-2fa - Disable 2FA
// - GET /api/auth/backup-codes - Get remaining backup code count
// - POST /api/auth/regenerate-backup-codes - Generate new backup codes
// ========================================

const User = require('../models/User');
const twoFactorService = require('../services/twoFactorService');
const authService = require('../services/authService');

// ----------------------------------------
// Enable 2FA (Step 1)
// ----------------------------------------

/**
 * Start 2FA setup - generates secret and QR code
 * User must be logged in but 2FA not yet enabled
 * 
 * @route POST /api/auth/enable-2fa
 * @access Private (requires auth)
 */
const enable2FA = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Get user
    const user = await User.findById(userId).select('+twoFactorSecret +twoFactorTempSecret');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is already enabled for this account',
      });
    }

    // Generate new secret
    const { secret, otpauthUrl, qrCodeDataUrl } = await twoFactorService.generateSecret(user.email);

    // Store encrypted temporary secret
    // This will be moved to twoFactorSecret after confirmation
    user.twoFactorTempSecret = twoFactorService.encryptSecret(secret);
    await user.save();

    res.json({
      status: 'success',
      message: 'Scan the QR code with your authenticator app',
      data: {
        qrCode: qrCodeDataUrl,
        manualEntryKey: secret, // For manual entry in authenticator
        otpauthUrl, // Can be used by password managers
      },
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Confirm 2FA (Step 2)
// ----------------------------------------

/**
 * Verify TOTP code and activate 2FA
 * Generates backup codes after successful verification
 * 
 * @route POST /api/auth/confirm-2fa
 * @body { token } - 6-digit code from authenticator
 * @access Private (requires auth)
 */
const confirm2FA = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { token } = req.body;

    // Validate input
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification code is required',
      });
    }

    // Get user with temp secret
    const user = await User.findById(userId).select('+twoFactorTempSecret +twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check if 2FA setup was started
    if (!user.twoFactorTempSecret) {
      return res.status(400).json({
        status: 'error',
        message: 'Please start 2FA setup first by calling /enable-2fa',
      });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is already enabled',
      });
    }

    // Verify the token against temp secret
    const isValid = twoFactorService.verifyTokenEncrypted(user.twoFactorTempSecret, token);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code. Please try again.',
      });
    }

    // Generate backup codes
    const { plainCodes, hashedCodes } = twoFactorService.generateBackupCodes(10);

    // Activate 2FA
    user.twoFactorSecret = user.twoFactorTempSecret; // Move temp to permanent
    user.twoFactorTempSecret = undefined; // Clear temp
    user.twoFactorEnabled = true;
    user.backupCodes = hashedCodes;
    await user.save();

    res.json({
      status: 'success',
      message: '2FA has been enabled successfully',
      data: {
        backupCodes: plainCodes,
        warning: 'Save these backup codes securely. They will not be shown again!',
      },
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Verify 2FA (Login Step 2)
// ----------------------------------------

/**
 * Verify TOTP or backup code during login
 * Called after successful password verification when 2FA is enabled
 * 
 * @route POST /api/auth/verify-2fa
 * @body { tempToken, token } or { tempToken, backupCode }
 * @access Public (but requires temp token from login)
 */
const verify2FA = async (req, res, next) => {
  try {
    const { tempToken, token, backupCode } = req.body;

    // Validate input
    if (!tempToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Temporary token is required',
      });
    }

    if (!token && !backupCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification code or backup code is required',
      });
    }

    // Verify temp token
    const decoded = authService.verifyAccessToken(tempToken);
    if (!decoded?.temp2FA) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired temporary token. Please login again.',
      });
    }

    // Get user with 2FA secret
    const user = await User.findById(decoded.userId).select('+twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is not enabled for this account',
      });
    }

    let isValid = false;
    let usedBackupCode = false;

    // Try TOTP first
    if (token) {
      isValid = twoFactorService.verifyTokenEncrypted(user.twoFactorSecret, token);
    }

    // Try backup code if TOTP not provided or failed
    if (!isValid && backupCode) {
      const backupResult = twoFactorService.verifyBackupCode(backupCode, user.backupCodes);
      if (backupResult.valid) {
        isValid = true;
        usedBackupCode = true;
        
        // Mark backup code as used
        user.backupCodes[backupResult.index].used = true;
        await user.save();
      }
    }

    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid verification code',
      });
    }

    // Generate tokens
    const tokens = authService.generateTokenPair(user);

    // Store refresh token
    await authService.storeRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
      req.get('User-Agent') || 'unknown'
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Prepare response
    const response = {
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        ...tokens,
      },
    };

    // Warn if backup code was used
    if (usedBackupCode) {
      const remaining = twoFactorService.countRemainingBackupCodes(user.backupCodes);
      response.data.warning = `Backup code used. ${remaining} backup codes remaining.`;
      
      if (remaining <= 3) {
        response.data.warning += ' Consider generating new backup codes.';
      }
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Disable 2FA
// ----------------------------------------

/**
 * Disable 2FA for the account
 * Requires current password or TOTP code for security
 * 
 * @route POST /api/auth/disable-2fa
 * @body { password } or { token }
 * @access Private (requires auth)
 */
const disable2FA = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { password, token } = req.body;

    // Require at least one verification method
    if (!password && !token) {
      return res.status(400).json({
        status: 'error',
        message: 'Password or TOTP code is required to disable 2FA',
      });
    }

    // Get user with password and 2FA secret
    const user = await User.findById(userId).select('+password +twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is not enabled for this account',
      });
    }

    // Verify with password
    let verified = false;
    if (password) {
      verified = await user.comparePassword(password);
    }

    // Or verify with TOTP
    if (!verified && token) {
      verified = twoFactorService.verifyTokenEncrypted(user.twoFactorSecret, token);
    }

    if (!verified) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid password or verification code',
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    user.backupCodes = [];
    await user.save();

    res.json({
      status: 'success',
      message: '2FA has been disabled',
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Backup Codes
// ----------------------------------------

/**
 * Get backup code status (count remaining)
 * Does NOT return the actual codes
 * 
 * @route GET /api/auth/backup-codes
 * @access Private (requires auth)
 */
const getBackupCodes = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is not enabled',
      });
    }

    const total = user.backupCodes.length;
    const remaining = twoFactorService.countRemainingBackupCodes(user.backupCodes);
    const used = total - remaining;

    res.json({
      status: 'success',
      data: {
        total,
        remaining,
        used,
      },
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate backup codes
 * Requires TOTP verification
 * Invalidates all existing backup codes
 * 
 * @route POST /api/auth/regenerate-backup-codes
 * @body { token } - TOTP code for verification
 * @access Private (requires auth)
 */
const regenerateBackupCodes = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { token } = req.body;

    // Require TOTP verification
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'TOTP verification code is required',
      });
    }

    // Get user with 2FA secret
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        status: 'error',
        message: '2FA is not enabled',
      });
    }

    // Verify TOTP
    const isValid = twoFactorService.verifyTokenEncrypted(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid verification code',
      });
    }

    // Generate new backup codes
    const { plainCodes, hashedCodes } = twoFactorService.generateBackupCodes(10);

    // Replace existing backup codes
    user.backupCodes = hashedCodes;
    await user.save();

    res.json({
      status: 'success',
      message: 'New backup codes generated',
      data: {
        backupCodes: plainCodes,
        warning: 'Save these backup codes securely. They will not be shown again!',
      },
    });

  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// Exports
// ----------------------------------------

module.exports = {
  enable2FA,
  confirm2FA,
  verify2FA,
  disable2FA,
  getBackupCodes,
  regenerateBackupCodes,
};
