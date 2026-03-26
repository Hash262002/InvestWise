// ========================================
// Encryption Service
// ========================================
// Handles encryption/decryption of sensitive data:
// - 2FA secrets (TOTP)
// - Backup codes
// Uses AES-256-GCM for authenticated encryption
// ========================================

const crypto = require('node:crypto');

// ----------------------------------------
// Configuration
// ----------------------------------------

// Encryption key (32 bytes for AES-256)
// In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;

// ----------------------------------------
// Key Derivation
// ----------------------------------------

/**
 * Derive an encryption key from the master key and a salt
 * Uses PBKDF2 for key derivation
 * 
 * @param {Buffer} salt - Random salt
 * @returns {Buffer} Derived key
 */
const deriveKey = (salt) => {
  return crypto.pbkdf2Sync(
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    salt,
    100000, // iterations
    32, // key length
    'sha256'
  );
};

// ----------------------------------------
// Encryption Functions
// ----------------------------------------

/**
 * Encrypt data using AES-256-GCM
 * 
 * Format: salt:iv:authTag:encryptedData (all base64)
 * 
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Encrypted data string
 */
const encrypt = (plaintext) => {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty data');
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from salt
  const key = deriveKey(salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine all parts: salt:iv:authTag:encrypted
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
};

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param {string} encryptedData - Encrypted data string (salt:iv:authTag:data)
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encryptedData) => {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty data');
  }

  // Split the encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltBase64, ivBase64, authTagBase64, encrypted] = parts;

  // Convert from base64
  const salt = Buffer.from(saltBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  // Derive key from salt
  const key = deriveKey(salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// ----------------------------------------
// Hashing Functions
// ----------------------------------------

/**
 * Hash a string using SHA-256
 * Used for hashing backup codes (one-way)
 * 
 * @param {string} data - Data to hash
 * @returns {string} Hex-encoded hash
 */
const hash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Compare a plaintext with a hash
 * Uses timing-safe comparison to prevent timing attacks
 * 
 * @param {string} plaintext - Plaintext to compare
 * @param {string} hashedValue - Expected hash
 * @returns {boolean} True if match
 */
const compareHash = (plaintext, hashedValue) => {
  const computedHash = hash(plaintext);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hashedValue, 'hex')
    );
  } catch {
    // Buffer length mismatch or invalid hex - return false
    return false;
  }
};

// ----------------------------------------
// Random Generation
// ----------------------------------------

/**
 * Generate a cryptographically secure random string
 * 
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Generate a backup code (8 characters, alphanumeric)
 * Format: XXXX-XXXX (for readability)
 * 
 * @returns {string} Backup code
 */
const generateBackupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
    if (i === 3) code += '-'; // Add dash in middle for readability
  }
  
  return code;
};

/**
 * Generate a set of backup codes
 * 
 * @param {number} count - Number of codes to generate
 * @returns {Array<{code: string, hash: string}>} Codes with their hashes
 */
const generateBackupCodes = (count = 10) => {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    const code = generateBackupCode();
    codes.push({
      code, // Plain code to show user once
      hash: hash(code), // Hash to store in database
    });
  }
  
  return codes;
};

// ----------------------------------------
// Exports
// ----------------------------------------

module.exports = {
  encrypt,
  decrypt,
  hash,
  compareHash,
  generateRandomString,
  generateBackupCode,
  generateBackupCodes,
};
