// ========================================
// Two-Factor Authentication Service
// ========================================
// Handles TOTP-based 2FA:
// - Generate TOTP secrets
// - Generate QR codes for authenticator apps
// - Verify TOTP codes
// - Manage backup codes
// ========================================

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const encryptionService = require('./encryptionService');

// ----------------------------------------
// Configuration
// ----------------------------------------

const APP_NAME = process.env.APP_NAME || 'InvestWise';
const ISSUER = process.env.TOTP_ISSUER || 'InvestWise';

// TOTP Settings
const TOTP_OPTIONS = {
  step: 30, // Time step in seconds (standard is 30)
  digits: 6, // Number of digits in code
  window: 1, // Allow codes from previous/next time step
};

// ----------------------------------------
// Secret Generation
// ----------------------------------------

/**
 * Generate a new TOTP secret for a user
 * 
 * @param {string} email - User's email (used in authenticator app)
 * @returns {Object} { secret, otpauthUrl, qrCodeDataUrl }
 */
const generateSecret = async (email) => {
  // Generate a new secret
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME}:${email}`,
    issuer: ISSUER,
    length: 32, // 256 bits
  });

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url, {
    width: 256,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return {
    // Base32 secret (shown to user as manual entry option)
    secret: secret.base32,
    // OTP Auth URL (encoded in QR code)
    otpauthUrl: secret.otpauth_url,
    // QR code as data URL (display directly in <img> tag)
    qrCodeDataUrl,
  };
};

// ----------------------------------------
// Code Verification
// ----------------------------------------

/**
 * Verify a TOTP code
 * 
 * @param {string} secret - Base32 encoded secret
 * @param {string} token - 6-digit code from user
 * @returns {boolean} True if valid
 */
const verifyToken = (secret, token) => {
  // Remove any spaces or dashes from token
  const cleanToken = token.replaceAll(/[\s-]/g, '');

  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: cleanToken,
    ...TOTP_OPTIONS,
  });
};

/**
 * Verify a TOTP code with encrypted secret
 * 
 * @param {string} encryptedSecret - Encrypted secret from database
 * @param {string} token - 6-digit code from user
 * @returns {boolean} True if valid
 */
const verifyTokenEncrypted = (encryptedSecret, token) => {
  try {
    const secret = encryptionService.decrypt(encryptedSecret);
    return verifyToken(secret, token);
  } catch (error) {
    console.error('Error verifying encrypted token:', error);
    return false;
  }
};

// ----------------------------------------
// Secret Encryption
// ----------------------------------------

/**
 * Encrypt a TOTP secret for storage
 * 
 * @param {string} secret - Base32 secret
 * @returns {string} Encrypted secret
 */
const encryptSecret = (secret) => {
  return encryptionService.encrypt(secret);
};

/**
 * Decrypt a stored TOTP secret
 * 
 * @param {string} encryptedSecret - Encrypted secret
 * @returns {string} Decrypted base32 secret
 */
const decryptSecret = (encryptedSecret) => {
  return encryptionService.decrypt(encryptedSecret);
};

// ----------------------------------------
// Backup Codes
// ----------------------------------------

/**
 * Generate backup codes for a user
 * Returns both plain codes (to show user) and hashed codes (to store)
 * 
 * @param {number} count - Number of codes to generate (default: 10)
 * @returns {Object} { plainCodes, hashedCodes }
 */
const generateBackupCodes = (count = 10) => {
  const codes = encryptionService.generateBackupCodes(count);
  
  return {
    // Plain codes to show to user (only shown once!)
    plainCodes: codes.map(c => c.code),
    // Hashed codes to store in database
    hashedCodes: codes.map(c => ({
      code: c.hash,
      used: false,
    })),
  };
};

/**
 * Verify a backup code
 * 
 * @param {string} inputCode - Code entered by user
 * @param {Array} storedCodes - Array of { code: hash, used: boolean }
 * @returns {Object} { valid: boolean, index: number } - index of used code if valid
 */
const verifyBackupCode = (inputCode, storedCodes) => {
  // Clean input (remove dashes, uppercase)
  const cleanCode = inputCode.replaceAll('-', '').toUpperCase();

  for (let i = 0; i < storedCodes.length; i++) {
    const stored = storedCodes[i];
    
    // Skip already used codes
    if (stored.used) continue;

    // Compare with stored hash
    if (encryptionService.compareHash(cleanCode, stored.code)) {
      return { valid: true, index: i };
    }
  }

  return { valid: false, index: -1 };
};

/**
 * Count remaining unused backup codes
 * 
 * @param {Array} storedCodes - Array of { code: hash, used: boolean }
 * @returns {number} Count of unused codes
 */
const countRemainingBackupCodes = (storedCodes) => {
  return storedCodes.filter(c => !c.used).length;
};

// ----------------------------------------
// 2FA Setup Flow Helpers
// ----------------------------------------

/**
 * Check if a user has 2FA enabled
 * 
 * @param {Object} user - User document
 * @returns {boolean} True if 2FA is enabled
 */
const is2FAEnabled = (user) => {
  return user.twoFactorEnabled && user.twoFactorSecret;
};

/**
 * Check if a user is in the middle of 2FA setup
 * (has temp secret but not confirmed)
 * 
 * @param {Object} user - User document
 * @returns {boolean} True if setup in progress
 */
const is2FASetupInProgress = (user) => {
  return !user.twoFactorEnabled && user.twoFactorTempSecret;
};

// ----------------------------------------
// Exports
// ----------------------------------------

module.exports = {
  // Secret management
  generateSecret,
  encryptSecret,
  decryptSecret,
  
  // Token verification
  verifyToken,
  verifyTokenEncrypted,
  
  // Backup codes
  generateBackupCodes,
  verifyBackupCode,
  countRemainingBackupCodes,
  
  // Status helpers
  is2FAEnabled,
  is2FASetupInProgress,
};
