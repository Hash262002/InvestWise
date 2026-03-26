// ========================================
// Holding Model
// ========================================
// A holding represents an individual investment within a portfolio.
// It tracks the asset (stock, mutual fund, ETF), quantity, cost basis,
// and current value.
// ========================================

const mongoose = require('mongoose');

// ========================================
// Schema Definition
// ========================================

const holdingSchema = new mongoose.Schema({
  // ----------------
  // Parent Reference
  // ----------------
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: [true, 'Holding must belong to a portfolio'],
    index: true,
  },

  // User reference for easier querying
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Holding must belong to a user'],
    index: true,
  },

  // ----------------
  // Asset Information
  // ----------------
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
    uppercase: true,
    trim: true,
    index: true,
  },

  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
  },

  // Type of asset
  assetType: {
    type: String,
    enum: ['stock', 'mutualFund', 'etf', 'bond', 'crypto', 'other'],
    default: 'stock',
  },

  // Exchange where the asset is traded
  exchange: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'NSE', // Default to NSE for Indian stocks
  },

  // Sector classification (for diversification analysis)
  sector: {
    type: String,
    trim: true,
    default: 'Unknown',
  },

  // Industry within the sector
  industry: {
    type: String,
    trim: true,
  },

  // ----------------
  // Position Details
  // ----------------
  
  // Number of shares/units held
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
  },

  // Average cost per share/unit
  averageCost: {
    type: Number,
    required: [true, 'Average cost is required'],
    min: [0, 'Average cost cannot be negative'],
  },

  // Total cost basis (quantity * averageCost)
  totalCost: {
    type: Number,
    default: 0,
  },

  // Currency
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },

  // ----------------
  // Market Data (Updated periodically)
  // ----------------
  marketData: {
    // Current price per share/unit
    currentPrice: {
      type: Number,
      default: 0,
    },

    // Previous closing price
    previousClose: {
      type: Number,
      default: 0,
    },

    // Day's price change
    dayChange: {
      amount: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },

    // 52-week high/low
    week52High: Number,
    week52Low: Number,

    // When market data was last updated
    lastUpdatedAt: {
      type: Date,
    },
  },

  // ----------------
  // Calculated Values
  // ----------------
  
  // Current market value (quantity * currentPrice)
  currentValue: {
    type: Number,
    default: 0,
  },

  // Unrealized gain/loss
  unrealizedGainLoss: {
    amount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },

  // ----------------
  // AI Analysis Results
  // ----------------
  analysis: {
    // Risk score for this holding (0-100)
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    // Risk level
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },

    // Concentration risk (if this holding is too large)
    concentrationRisk: {
      type: Boolean,
      default: false,
    },

    // Percentage of portfolio
    portfolioPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    // AI-generated notes
    notes: String,

    // Last analysis timestamp
    lastAnalyzedAt: Date,
  },

  // ----------------
  // Transaction History
  // ----------------
  // Keep track of buy/sell transactions
  transactions: [{
    type: {
      type: String,
      enum: ['buy', 'sell', 'dividend', 'split', 'bonus'],
      required: true,
    },
    
    date: {
      type: Date,
      default: Date.now,
    },
    
    quantity: {
      type: Number,
      required: true,
    },
    
    price: {
      type: Number,
      required: true,
    },
    
    // Total value of transaction
    amount: {
      type: Number,
      required: true,
    },
    
    // Any fees/commissions
    fees: {
      type: Number,
      default: 0,
    },
    
    notes: String,
  }],

  // ----------------
  // Status
  // ----------------
  isActive: {
    type: Boolean,
    default: true,
  },

  // When the holding was first added
  firstPurchaseDate: {
    type: Date,
  },

  // When the holding was fully sold (if applicable)
  soldDate: {
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

// Compound index for finding holdings in a portfolio
holdingSchema.index({ portfolio: 1, symbol: 1 }, { unique: true });

// For user's holdings across all portfolios
holdingSchema.index({ user: 1, symbol: 1 });

// For finding holdings by sector
holdingSchema.index({ portfolio: 1, sector: 1 });

// For market data updates
holdingSchema.index({ symbol: 1, 'marketData.lastUpdatedAt': 1 });

// ========================================
// Virtual Fields
// ========================================

// Gain/loss color indicator
holdingSchema.virtual('gainLossIndicator').get(function() {
  if (this.unrealizedGainLoss.amount > 0) return 'positive';
  if (this.unrealizedGainLoss.amount < 0) return 'negative';
  return 'neutral';
});

// Day change indicator
holdingSchema.virtual('dayChangeIndicator').get(function() {
  if (this.marketData.dayChange.amount > 0) return 'positive';
  if (this.marketData.dayChange.amount < 0) return 'negative';
  return 'neutral';
});

// ========================================
// Pre-save Middleware
// ========================================

holdingSchema.pre('save', async function(next) {
  try {
    // Calculate total cost
    this.totalCost = this.quantity * this.averageCost;

    // Initialize marketData if it doesn't exist
    if (!this.marketData) {
      this.marketData = {
        currentPrice: 0,
        previousClose: 0,
        dayChange: { amount: 0, percentage: 0 },
      };
    }

    // Calculate current value
    if (this.marketData.currentPrice) {
      this.currentValue = this.quantity * this.marketData.currentPrice;
      
      // Calculate unrealized gain/loss
      const gainLoss = this.currentValue - this.totalCost;
      this.unrealizedGainLoss = {
        amount: gainLoss,
        percentage: this.totalCost > 0 
          ? (gainLoss / this.totalCost) * 100 
          : 0,
      };
    } else {
      // If no current price, set current value to cost
      this.currentValue = this.totalCost;
      this.unrealizedGainLoss = {
        amount: 0,
        percentage: 0,
      };
    }

    // Set first purchase date if not set
    if (!this.firstPurchaseDate && this.transactions.length > 0) {
      const buyTransactions = this.transactions.filter(t => t.type === 'buy');
      if (buyTransactions.length > 0) {
        this.firstPurchaseDate = buyTransactions
          .sort((a, b) => a.date - b.date)[0].date;
      }
    }

    // Call next safely
    if (typeof next === 'function') {
      next();
    }
  } catch (error) {
    console.error('Error in Holding pre-save hook:', error);
    if (typeof next === 'function') {
      next(error);
    } else {
      throw error;
    }
  }
});

// ========================================
// Instance Methods
// ========================================

/**
 * Add a buy transaction
 * @param {Object} transaction - Transaction details
 */
holdingSchema.methods.addBuyTransaction = async function(transaction) {
  const { quantity, price, fees = 0, notes, date = new Date() } = transaction;
  
  // Calculate new average cost
  const totalOldCost = this.quantity * this.averageCost;
  const newPurchaseCost = quantity * price + fees;
  const newTotalQuantity = this.quantity + quantity;
  
  this.averageCost = newTotalQuantity > 0 
    ? (totalOldCost + newPurchaseCost) / newTotalQuantity 
    : 0;
  this.quantity = newTotalQuantity;
  
  // Add transaction record
  this.transactions.push({
    type: 'buy',
    date,
    quantity,
    price,
    amount: quantity * price,
    fees,
    notes,
  });
  
  return this.save();
};

/**
 * Add a sell transaction
 * @param {Object} transaction - Transaction details
 */
holdingSchema.methods.addSellTransaction = async function(transaction) {
  const { quantity, price, fees = 0, notes, date = new Date() } = transaction;
  
  if (quantity > this.quantity) {
    throw new Error('Cannot sell more than held quantity');
  }
  
  this.quantity -= quantity;
  
  // If fully sold, mark as inactive
  if (this.quantity === 0) {
    this.isActive = false;
    this.soldDate = date;
  }
  
  // Add transaction record
  this.transactions.push({
    type: 'sell',
    date,
    quantity,
    price,
    amount: quantity * price,
    fees,
    notes,
  });
  
  return this.save();
};

/**
 * Update market data
 * @param {Object} data - Market data from external API
 */
holdingSchema.methods.updateMarketData = async function(data) {
  const previousPrice = this.marketData.currentPrice || data.previousClose;
  
  this.marketData = {
    currentPrice: data.currentPrice,
    previousClose: data.previousClose,
    dayChange: {
      amount: data.currentPrice - (data.previousClose || previousPrice),
      percentage: data.previousClose 
        ? ((data.currentPrice - data.previousClose) / data.previousClose) * 100 
        : 0,
    },
    week52High: data.week52High,
    week52Low: data.week52Low,
    lastUpdatedAt: new Date(),
  };
  
  return this.save();
};

// ========================================
// Static Methods
// ========================================

/**
 * Find holdings by portfolio
 * @param {ObjectId} portfolioId - Portfolio ID
 * @returns {Promise<Holding[]>}
 */
holdingSchema.statics.findByPortfolio = function(portfolioId) {
  return this.find({ 
    portfolio: portfolioId, 
    isActive: true,
  }).sort({ currentValue: -1 });
};

/**
 * Find all unique symbols held by users (for batch price updates)
 * @returns {Promise<string[]>}
 */
holdingSchema.statics.findUniqueSymbols = async function() {
  const result = await this.distinct('symbol', { isActive: true });
  return result;
};

/**
 * Find holdings that need market data update
 * @param {number} minutesThreshold - Minutes since last update
 * @returns {Promise<Holding[]>}
 */
holdingSchema.statics.findNeedingPriceUpdate = function(minutesThreshold = 15) {
  const thresholdDate = new Date(Date.now() - minutesThreshold * 60 * 1000);
  
  return this.find({
    isActive: true,
    $or: [
      { 'marketData.lastUpdatedAt': { $lt: thresholdDate } },
      { 'marketData.lastUpdatedAt': { $exists: false } },
    ],
  });
};

// ========================================
// Export Model
// ========================================

const Holding = mongoose.model('Holding', holdingSchema);

module.exports = Holding;
