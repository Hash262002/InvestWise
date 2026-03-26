// ========================================
// User Model
// ========================================
// This model represents a user in the InvestWise system.
// It includes fields for:
// - Basic profile information
// - Authentication (password, tokens)
// - Two-Factor Authentication (2FA)
// - Security tracking
// ========================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ========================================
// Schema Definition
// ========================================

const userSchema = new mongoose.Schema({
  // ----------------
  // Profile Fields
  // ----------------
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },

  // ----------------
  // Authentication
  // ----------------
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include password in queries by default
  },
  
  // Refresh tokens for JWT rotation
  // We store hashed refresh tokens to allow multiple devices
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7, // Auto-delete after 7 days
    },
  }],

  // ----------------
  // Two-Factor Authentication (2FA)
  // ----------------
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  
  // Encrypted TOTP secret for Google Authenticator
  // Stored encrypted using AES-256-GCM
  twoFactorSecret: {
    type: String,
    select: false, // Don't include in queries by default
  },
  
  // Encrypted backup codes for 2FA recovery
  // Array of hashed codes, each can be used once
  backupCodes: [{
    code: String, // Hashed backup code
    used: {
      type: Boolean,
      default: false,
    },
  }],
  
  // Temporary storage during 2FA setup
  // Used between enable-2fa and confirm-2fa
  twoFactorTempSecret: {
    type: String,
    select: false,
  },

  // ----------------
  // User Preferences
  // ----------------
  preferences: {
    // Risk tolerance for AI recommendations
    riskTolerance: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate',
    },
    
    // Email notification settings
    emailNotifications: {
      dailyDigest: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: false },
    },
    
    // Default currency for display
    currency: {
      type: String,
      default: 'INR',
    },
  },

  // ----------------
  // Security Tracking
  // ----------------
  security: {
    // Failed login attempts counter
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    
    // Account lockout until this time
    lockUntil: {
      type: Date,
    },
    
    // Last successful login
    lastLogin: {
      type: Date,
    },
    
    // Last password change
    passwordChangedAt: {
      type: Date,
    },
    
    // Password reset token (hashed)
    passwordResetToken: String,
    passwordResetExpires: Date,
  },

  // ----------------
  // Account Status
  // ----------------
  isActive: {
    type: Boolean,
    default: true,
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  
  emailVerificationToken: String,
  emailVerificationExpires: Date,

}, {
  // Schema options
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ========================================
// Indexes
// ========================================
// Indexes improve query performance for frequently searched fields
// Note: email index is already created by the unique: true option above

userSchema.index({ 'security.lockUntil': 1 }); // For checking locked accounts
userSchema.index({ createdAt: -1 }); // For sorting by creation date

// ========================================
// Virtual Fields
// ========================================
// Virtual fields are computed properties that aren't stored in DB

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Check if account is currently locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// ========================================
// Pre-save Middleware
// ========================================
// Runs before saving the document

userSchema.pre('save', async function() {
  // Only hash password if it was modified
  if (!this.isModified('password')) {
    return;
  }

  // Generate salt (random data added to password before hashing)
  // Higher number = more secure but slower (10-12 is recommended)
  const salt = await bcrypt.genSalt(12);
  
  // Hash the password
  this.password = await bcrypt.hash(this.password, salt);
  
  // Initialize security object if it doesn't exist
  if (!this.security) {
    this.security = {};
  }
  
  // Update password changed timestamp
  this.security.passwordChangedAt = new Date();
});

// ========================================
// Instance Methods
// ========================================
// Methods available on document instances

/**
 * Compare entered password with stored hash
 * @param {string} candidatePassword - Password to check
 * @returns {Promise<boolean>} - True if password matches
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  // 'this.password' might not be available if select: false
  // Make sure to use .select('+password') in the query
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Increment failed login attempts and lock if necessary
 */
userSchema.methods.incrementLoginAttempts = async function() {
  // If previous lock has expired, reset attempts
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        'security.failedLoginAttempts': 1,
        'security.lockUntil': null,
      },
    });
  }

  // Increment failed attempts
  const updates = { $inc: { 'security.failedLoginAttempts': 1 } };
  
  // Lock account after 5 failed attempts for 15 minutes
  if (this.security.failedLoginAttempts + 1 >= 5) {
    updates.$set = {
      'security.lockUntil': new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  return this.updateOne(updates);
};

/**
 * Reset failed login attempts on successful login
 */
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: {
      'security.failedLoginAttempts': 0,
      'security.lockUntil': null,
      'security.lastLogin': new Date(),
    },
  });
};

/**
 * Check if password was changed after a given timestamp
 * Used to invalidate tokens after password change
 * @param {number} timestamp - JWT iat timestamp
 * @returns {boolean}
 */
userSchema.methods.changedPasswordAfter = function(timestamp) {
  if (this.security.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.security.passwordChangedAt.getTime() / 1000,
      10
    );
    return timestamp < changedTimestamp;
  }
  return false;
};

// ========================================
// Static Methods
// ========================================
// Methods available on the Model itself

/**
 * Find user by email with password included
 * @param {string} email - User email
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// ========================================
// Export Model
// ========================================

const User = mongoose.model('User', userSchema);

module.exports = User;
