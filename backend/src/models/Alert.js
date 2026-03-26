// ========================================
// Alert Model
// ========================================
// Alerts allow users to be notified when certain conditions are met:
// - Price reaches a target (above or below)
// - Percentage change threshold
// - Portfolio value thresholds
// - News/sentiment triggers
// ========================================

const mongoose = require('mongoose');

// ========================================
// Schema Definition
// ========================================

const alertSchema = new mongoose.Schema({
  // ----------------
  // Owner Reference
  // ----------------
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Alert must belong to a user'],
    index: true,
  },

  // Optional portfolio reference (for portfolio-level alerts)
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    index: true,
  },

  // ----------------
  // Alert Configuration
  // ----------------
  
  // Type of alert
  alertType: {
    type: String,
    enum: [
      'priceAbove',      // Price goes above target
      'priceBelow',      // Price goes below target
      'percentageUp',    // Price increases by X%
      'percentageDown',  // Price decreases by X%
      'portfolioValue',  // Portfolio value threshold
      'news',            // News sentiment alert
    ],
    required: [true, 'Alert type is required'],
  },

  // Name/description for this alert
  name: {
    type: String,
    required: [true, 'Alert name is required'],
    trim: true,
    maxlength: [200, 'Alert name cannot exceed 200 characters'],
  },

  // ----------------
  // Target Asset (for price/percentage alerts)
  // ----------------
  asset: {
    symbol: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: String,
    exchange: String,
  },

  // ----------------
  // Condition Parameters
  // ----------------
  condition: {
    // Target price (for priceAbove/priceBelow)
    targetPrice: {
      type: Number,
      min: 0,
    },

    // Percentage threshold (for percentageUp/percentageDown)
    percentageThreshold: {
      type: Number,
      min: 0,
      max: 100,
    },

    // Reference price for percentage calculations
    referencePrice: {
      type: Number,
      min: 0,
    },

    // Portfolio value threshold
    portfolioValueThreshold: {
      type: Number,
      min: 0,
    },

    // Comparison operator
    comparison: {
      type: String,
      enum: ['above', 'below', 'equals'],
    },

    // Time window for percentage change (in hours)
    timeWindowHours: {
      type: Number,
      default: 24,
    },
  },

  // ----------------
  // Notification Settings
  // ----------------
  notifications: {
    // Send push notification (WebSocket)
    push: {
      type: Boolean,
      default: true,
    },

    // Send email notification
    email: {
      type: Boolean,
      default: false,
    },

    // Include in daily digest
    digest: {
      type: Boolean,
      default: true,
    },
  },

  // ----------------
  // Alert Behavior
  // ----------------
  
  // How often can this alert fire
  frequency: {
    type: String,
    enum: [
      'once',       // Fire once, then deactivate
      'daily',      // At most once per day
      'always',     // Every time condition is met (with cooldown)
    ],
    default: 'once',
  },

  // Cooldown period between alerts (in minutes)
  cooldownMinutes: {
    type: Number,
    default: 60,
    min: 5,
    max: 1440, // Max 24 hours
  },

  // ----------------
  // Status Tracking
  // ----------------
  status: {
    type: String,
    enum: ['active', 'triggered', 'paused', 'expired'],
    default: 'active',
    index: true,
  },

  // Last time the alert was triggered
  lastTriggeredAt: {
    type: Date,
  },

  // Number of times triggered
  triggerCount: {
    type: Number,
    default: 0,
  },

  // Expiration date (optional)
  expiresAt: {
    type: Date,
    index: true,
  },

  // ----------------
  // Trigger History
  // ----------------
  triggerHistory: [{
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
    
    // The actual value that triggered the alert
    triggerValue: Number,
    
    // Notification channels used
    notificationsSent: {
      push: Boolean,
      email: Boolean,
    },
    
    // Any error in notification delivery
    error: String,
  }],

  // ----------------
  // Metadata
  // ----------------
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },

  // Is this alert active
  isActive: {
    type: Boolean,
    default: true,
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ========================================
// Indexes
// ========================================

// For finding active alerts by symbol (price monitoring)
alertSchema.index({ 'asset.symbol': 1, status: 1 });

// For user's alerts list
alertSchema.index({ user: 1, status: 1 });

// For finding expired alerts
alertSchema.index({ expiresAt: 1, status: 1 });

// For finding alerts that can be triggered (not in cooldown)
alertSchema.index({ status: 1, lastTriggeredAt: 1 });

// ========================================
// Virtual Fields
// ========================================

// Check if alert is in cooldown period
alertSchema.virtual('isInCooldown').get(function() {
  if (!this.lastTriggeredAt) return false;
  
  const cooldownEnd = new Date(
    this.lastTriggeredAt.getTime() + this.cooldownMinutes * 60 * 1000
  );
  
  return cooldownEnd > new Date();
});

// Time until cooldown ends (in seconds)
alertSchema.virtual('cooldownRemaining').get(function() {
  if (!this.lastTriggeredAt) return 0;
  
  const cooldownEnd = new Date(
    this.lastTriggeredAt.getTime() + this.cooldownMinutes * 60 * 1000
  );
  
  const remaining = cooldownEnd - new Date();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
});

// Check if alert is expired
alertSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// ========================================
// Instance Methods
// ========================================

/**
 * Check if alert condition is met
 * @param {number} currentValue - Current price or value to check
 * @returns {boolean}
 */
alertSchema.methods.checkCondition = function(currentValue) {
  const { condition, alertType } = this;

  switch (alertType) {
    case 'priceAbove':
      return currentValue >= condition.targetPrice;
    
    case 'priceBelow':
      return currentValue <= condition.targetPrice;
    
    case 'percentageUp':
      if (!condition.referencePrice) return false;
      const percentUp = ((currentValue - condition.referencePrice) / condition.referencePrice) * 100;
      return percentUp >= condition.percentageThreshold;
    
    case 'percentageDown':
      if (!condition.referencePrice) return false;
      const percentDown = ((condition.referencePrice - currentValue) / condition.referencePrice) * 100;
      return percentDown >= condition.percentageThreshold;
    
    case 'portfolioValue':
      if (condition.comparison === 'above') {
        return currentValue >= condition.portfolioValueThreshold;
      } else if (condition.comparison === 'below') {
        return currentValue <= condition.portfolioValueThreshold;
      }
      return false;
    
    default:
      return false;
  }
};

/**
 * Check if alert can be triggered (not in cooldown, not expired)
 * @returns {boolean}
 */
alertSchema.methods.canTrigger = function() {
  // Check if active
  if (this.status !== 'active') return false;
  
  // Check if expired
  if (this.isExpired) return false;
  
  // Check cooldown
  if (this.isInCooldown) return false;
  
  // For 'once' frequency, check if already triggered
  if (this.frequency === 'once' && this.triggerCount > 0) return false;
  
  return true;
};

/**
 * Trigger the alert
 * @param {number} triggerValue - The value that triggered the alert
 * @param {Object} notificationResult - Result of sending notifications
 */
alertSchema.methods.trigger = async function(triggerValue, notificationResult = {}) {
  // Update trigger tracking
  this.lastTriggeredAt = new Date();
  this.triggerCount += 1;
  
  // Add to history
  this.triggerHistory.push({
    triggeredAt: new Date(),
    triggerValue,
    notificationsSent: notificationResult,
  });
  
  // Keep only last 50 triggers in history
  if (this.triggerHistory.length > 50) {
    this.triggerHistory = this.triggerHistory.slice(-50);
  }
  
  // Update status for 'once' frequency alerts
  if (this.frequency === 'once') {
    this.status = 'triggered';
    this.isActive = false;
  }
  
  return this.save();
};

/**
 * Pause the alert
 */
alertSchema.methods.pause = async function() {
  this.status = 'paused';
  return this.save();
};

/**
 * Resume the alert
 */
alertSchema.methods.resume = async function() {
  if (this.status === 'paused') {
    this.status = 'active';
    return this.save();
  }
  return this;
};

/**
 * Update the reference price (for percentage alerts)
 * @param {number} newPrice - New reference price
 */
alertSchema.methods.updateReferencePrice = async function(newPrice) {
  this.condition.referencePrice = newPrice;
  return this.save();
};

// ========================================
// Static Methods
// ========================================

/**
 * Find all active alerts for a symbol
 * @param {string} symbol - Asset symbol
 * @returns {Promise<Alert[]>}
 */
alertSchema.statics.findActiveBySymbol = function(symbol) {
  return this.find({
    'asset.symbol': symbol.toUpperCase(),
    status: 'active',
    isActive: true,
  }).populate('user', 'email firstName');
};

/**
 * Find all active alerts for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Alert[]>}
 */
alertSchema.statics.findByUser = function(userId) {
  return this.find({
    user: userId,
    isActive: true,
  }).sort({ createdAt: -1 });
};

/**
 * Find all symbols that have active alerts (for monitoring)
 * @returns {Promise<string[]>}
 */
alertSchema.statics.findMonitoredSymbols = async function() {
  const result = await this.distinct('asset.symbol', {
    status: 'active',
    isActive: true,
    alertType: { $in: ['priceAbove', 'priceBelow', 'percentageUp', 'percentageDown'] },
  });
  return result.filter(s => s); // Remove nulls
};

/**
 * Expire old alerts
 * @returns {Promise<number>} Number of expired alerts
 */
alertSchema.statics.expireOldAlerts = async function() {
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: 'expired', isActive: false },
    }
  );
  return result.modifiedCount;
};

// ========================================
// Pre-save Middleware
// ========================================

alertSchema.pre('save', function(next) {
  // Auto-expire if past expiration date
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.status = 'expired';
    this.isActive = false;
  }
  
  next();
});

// ========================================
// Export Model
// ========================================

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
