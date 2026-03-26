const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: 50,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  preferences: {
    emailNotifications: {
      dailyDigest: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: false },
    },
    riskTolerance: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate',
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP'],
      default: 'INR',
    },
  },
  security: {
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    passwordChangedAt: Date,
    lastLogin: Date,
    lastLoginIP: String,
  },
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
  passwordResetToken: String,
  passwordResetExpires: Date,
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    userAgent: String,
    ip: String,
  }],
  backupCodes: [{
    code: String,
    used: { type: Boolean, default: false },
  }],
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.refreshTokens;
      delete ret.backupCodes;
      delete ret.__v;
      return ret;
    },
  },
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ createdAt: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.security.passwordChangedAt = new Date();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return this.security.lockUntil && this.security.lockUntil > Date.now();
};

// Increment failed login attempts
userSchema.methods.incrementFailedAttempts = async function() {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

  this.security.failedLoginAttempts += 1;

  if (this.security.failedLoginAttempts >= MAX_ATTEMPTS) {
    this.security.lockUntil = new Date(Date.now() + LOCK_TIME);
  }

  await this.save();
};

// Reset failed login attempts on successful login
userSchema.methods.resetFailedAttempts = async function() {
  this.security.failedLoginAttempts = 0;
  this.security.lockUntil = undefined;
  this.security.lastLogin = new Date();
  await this.save();
};

// Check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(jwtTimestamp) {
  if (this.security.passwordChangedAt) {
    const changedTimestamp = parseInt(this.security.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);

module.exports = User;
