// ========================================
// Portfolio Model
// ========================================
// A portfolio is a collection of investments owned by a user.
// Users can have multiple portfolios (e.g., "Retirement", "Growth", "Dividend")
// Each portfolio contains holdings (stocks, mutual funds, etc.)
// ========================================

const mongoose = require('mongoose');

// ========================================
// Holding Subdocument Schema (Embedded)
// ========================================
// Holdings are now stored as embedded documents within portfolios
// instead of separate documents with references

const holdingSchema = new mongoose.Schema({
  // Asset Information
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
    uppercase: true,
    trim: true,
  },

  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
  },

  assetType: {
    type: String,
    enum: ['stock', 'mutualFund', 'etf', 'bond', 'crypto', 'other'],
    default: 'stock',
  },

  exchange: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'NSE',
  },

  sector: {
    type: String,
    trim: true,
    default: 'Unknown',
  },

  // Position Details
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
  },

  averageCost: {
    type: Number,
    required: [true, 'Average cost is required'],
    min: [0, 'Average cost cannot be negative'],
  },

  totalCost: {
    type: Number,
    default: 0,
  },

  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },

  // Market Data
  marketData: {
    currentPrice: {
      type: Number,
      default: 0,
    },
    previousClose: {
      type: Number,
      default: 0,
    },
    dayChange: {
      amount: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    lastUpdatedAt: {
      type: Date,
    },
  },

  // Calculated Values
  currentValue: {
    type: Number,
    default: 0,
  },

  unrealizedGainLoss: {
    amount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },

  // Analysis
  analysis: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    recommendation: {
      type: String,
      enum: ['add', 'reduce', 'hold', 'review'],
    },
    recommendationReason: {
      type: String,
    },
    portfolioWeightPct: {
      type: Number,
      default: 0,
    },
    concentrationRisk: {
      type: Boolean,
      default: false,
    },
    unrealizedPnl: {
      type: Number,
      default: 0,
    },
    unrealizedPnlPct: {
      type: Number,
      default: 0,
    },
    lastAnalyzedAt: {
      type: Date,
    },
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Transactions history
  transactions: [{
    type: {
      type: String,
      enum: ['buy', 'sell', 'transfer', 'dividend'],
    },
    date: Date,
    quantity: Number,
    price: Number,
    amount: Number,
    notes: String,
  }],

  // Timestamps for this holding
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true }); // Enable _id for subdocuments

// Auto-calculate totalCost on save
holdingSchema.pre('save', function() {
  this.totalCost = (this.quantity || 0) * (this.averageCost || 0);
  this.currentValue = (this.quantity || 0) * (this.marketData?.currentPrice || this.averageCost || 0);
});

// ========================================
// Portfolio Schema Definition
// ========================================

const portfolioSchema = new mongoose.Schema({
  // ----------------
  // Owner Reference
  // ----------------
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Portfolio must belong to a user'],
    index: true, // Index for faster queries by user
  },

  // ----------------
  // Portfolio Info
  // ----------------
  name: {
    type: String,
    required: [true, 'Portfolio name is required'],
    trim: true,
    minlength: [2, 'Portfolio name must be at least 2 characters'],
    maxlength: [100, 'Portfolio name cannot exceed 100 characters'],
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },

  // Portfolio type/category
  type: {
    type: String,
    enum: ['growth', 'income', 'balanced', 'retirement', 'trading', 'other'],
    default: 'other',
  },

  // ----------------
  // Embedded Holdings
  // ----------------
  holdings: [holdingSchema],
  
  // Total invested amount (cost basis)
  totalInvested: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Current market value (updated periodically)
  currentValue: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Total realized gains/losses from sold holdings
  realizedGainLoss: {
    type: Number,
    default: 0,
  },

  // Currency for this portfolio
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },

  // ----------------
  // AI Analysis Results
  // ----------------
  // Cached analysis results from AI service
  analysis: {
    // Overall risk score (0-100)
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    // Risk level category
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    
    // Diversification score (0-100)
    diversificationScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    // AI-generated summary
    summary: {
      type: String,
    },
    
    // Sector allocation breakdown
    sectorAllocation: {
      type: Map,
      of: Number, // Percentage in each sector
    },

    // Portfolio-level metrics from AI
    portfolioMetrics: {
      totalValue: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      totalPnl: { type: Number, default: 0 },
      totalReturnPct: { type: Number, default: 0 },
      holdingsCount: { type: Number, default: 0 },
    },
    
    // AI-generated recommendations
    recommendations: [{
      type: {
        type: String,
        enum: ['add', 'reduce', 'rebalance', 'hold', 'review'],
      },
      message: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // When was the last analysis performed
    lastAnalyzedAt: Date,
  },

  // ----------------
  // Performance Tracking
  // ----------------
  performance: {
    // Daily change
    dayChange: {
      amount: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    
    // Since inception
    totalReturn: {
      amount: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    
    // Historical snapshots for charts
    // Stored as separate collection for large datasets
    lastUpdatedAt: Date,
  },

  // ----------------
  // Settings
  // ----------------
  settings: {
    // Whether to include in daily digest
    includeInDigest: {
      type: Boolean,
      default: true,
    },
    
    // Target allocation (for rebalancing alerts)
    targetAllocation: {
      type: Map,
      of: Number, // Target percentage for each sector/asset class
    },
    
    // Rebalancing threshold (percentage deviation to trigger alert)
    rebalanceThreshold: {
      type: Number,
      default: 5, // 5% deviation
      min: 1,
      max: 20,
    },
  },

  // ----------------
  // Status
  // ----------------
  isActive: {
    type: Boolean,
    default: true,
  },

  // Soft delete support
  deletedAt: {
    type: Date,
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ========================================
// Indexes
// ========================================

// Compound index for user's portfolios (sorted by name)
portfolioSchema.index({ user: 1, name: 1 });

// For listing active portfolios
portfolioSchema.index({ user: 1, isActive: 1 });

// For finding portfolios needing analysis
portfolioSchema.index({ 'analysis.lastAnalyzedAt': 1 });

// ========================================
// Virtual Fields
// ========================================

// Calculate unrealized gain/loss
portfolioSchema.virtual('unrealizedGainLoss').get(function() {
  return this.currentValue - this.totalInvested;
});

// Calculate unrealized gain/loss percentage
portfolioSchema.virtual('unrealizedGainLossPercentage').get(function() {
  if (this.totalInvested === 0) return 0;
  return ((this.currentValue - this.totalInvested) / this.totalInvested) * 100;
});

// Holdings count (calculated from embedded array)
portfolioSchema.virtual('holdingsCount').get(function() {
  return this.holdings?.length || 0;
});

// ========================================
// Instance Methods
// ========================================

/**
 * Recalculate portfolio totals from embedded holdings
 * Call this after adding/updating/removing holdings
 */
portfolioSchema.methods.recalculateTotals = function() {
  let totalInvested = 0;
  let currentValue = 0;

  // Calculate from embedded holdings array
  if (this.holdings && Array.isArray(this.holdings)) {
    this.holdings.forEach(holding => {
      if (holding.isActive) {
        totalInvested += holding.totalCost;
        currentValue += holding.currentValue;
      }
    });
  }

  this.totalInvested = totalInvested;
  this.currentValue = currentValue;
  
  // Initialize performance object if it doesn't exist
  if (!this.performance) {
    this.performance = {
      dayChange: { amount: 0, percentage: 0 },
      totalReturn: { amount: 0, percentage: 0 },
    };
  }
  
  this.performance.totalReturn = {
    amount: currentValue - totalInvested,
    percentage: totalInvested > 0 
      ? ((currentValue - totalInvested) / totalInvested) * 100 
      : 0,
  };
  this.performance.lastUpdatedAt = new Date();

  // Return promise for async compatibility
  return Promise.resolve(this.save());
};

/**
 * Check if portfolio needs reanalysis
 * @param {number} hoursThreshold - Hours since last analysis
 * @returns {boolean}
 */
portfolioSchema.methods.needsAnalysis = function(hoursThreshold = 24) {
  if (!this.analysis.lastAnalyzedAt) return true;
  
  const hoursSinceAnalysis = 
    (Date.now() - this.analysis.lastAnalyzedAt.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceAnalysis > hoursThreshold;
};

/**
 * Soft delete the portfolio
 */
portfolioSchema.methods.softDelete = async function() {
  this.isActive = false;
  this.deletedAt = new Date();
  return this.save();
};

// ========================================
// Static Methods
// ========================================

/**
 * Find all active portfolios for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Portfolio[]>}
 */
portfolioSchema.statics.findByUser = function(userId) {
  return this.find({ 
    user: userId, 
    isActive: true,
  }).sort({ name: 1 });
};

/**
 * Find portfolios needing analysis update
 * @param {number} hoursThreshold - Hours since last analysis
 * @returns {Promise<Portfolio[]>}
 */
portfolioSchema.statics.findNeedingAnalysis = function(hoursThreshold = 24) {
  const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  
  return this.find({
    isActive: true,
    $or: [
      { 'analysis.lastAnalyzedAt': { $lt: thresholdDate } },
      { 'analysis.lastAnalyzedAt': { $exists: false } },
    ],
  });
};

// ========================================
// Pre-save Middleware
// ========================================

// Update performance metrics and recalculate totals before saving
portfolioSchema.pre('save', async function() {
  try {
    console.log('Portfolio pre-save hook called');
    
    // Initialize performance object if it doesn't exist
    if (!this.performance) {
      this.performance = {
        dayChange: { amount: 0, percentage: 0 },
        totalReturn: { amount: 0, percentage: 0 },
      };
    }

    // Recalculate totals from embedded holdings
    let totalInvested = 0;
    let currentValue = 0;

    if (this.holdings && Array.isArray(this.holdings)) {
      this.holdings.forEach(holding => {
        if (holding.isActive !== false) {
          holding.totalCost = (holding.quantity || 0) * (holding.averageCost || 0);
          holding.currentValue = (holding.quantity || 0) * (holding.marketData?.currentPrice || holding.averageCost || 0);
          
          totalInvested += holding.totalCost;
          currentValue += holding.currentValue;
        }
      });
    }

    this.totalInvested = totalInvested;
    this.currentValue = currentValue;

    if (this.isModified('holdings') || this.isModified('currentValue') || this.isModified('totalInvested')) {
      this.performance.totalReturn = {
        amount: currentValue - totalInvested,
        percentage: totalInvested > 0
          ? ((currentValue - totalInvested) / totalInvested) * 100
          : 0,
      };
      this.performance.lastUpdatedAt = new Date();
    }
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    throw error;
  }
});

// ========================================
// Export Model
// ========================================

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;
