const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  assetType: {
    type: String,
    enum: ['stock', 'mutual_fund', 'etf', 'bond', 'crypto', 'other'],
    default: 'stock',
  },
  exchange: {
    type: String,
    trim: true,
  },
  sector: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
  },
  averageCost: {
    type: Number,
    required: true,
    min: [0, 'Average cost cannot be negative'],
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    enum: ['INR', 'USD', 'EUR', 'GBP'],
    default: 'INR',
  },
  marketData: {
    currentPrice: { type: Number, default: 0 },
    previousClose: { type: Number, default: 0 },
    dayChange: {
      amount: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    lastUpdated: Date,
  },
  currentValue: {
    type: Number,
    default: 0,
  },
  unrealizedGainLoss: {
    amount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  // AI Analysis data for this holding
  analysis: {
    sentiment: {
      type: String,
      enum: ['bullish', 'bearish', 'neutral', null],
      default: null,
    },
    recommendation: {
      type: String,
      enum: ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell', null],
      default: null,
    },
    summary: String,
    analyzedAt: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  transactions: [{
    type: {
      type: String,
      enum: ['buy', 'sell'],
      required: true,
    },
    quantity: Number,
    price: Number,
    date: Date,
    notes: String,
  }],
}, {
  timestamps: true,
});

const portfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Portfolio name is required'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['retirement', 'growth', 'income', 'trading', 'other'],
    default: 'other',
  },
  totalInvested: {
    type: Number,
    default: 0,
    min: 0,
  },
  currentValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  realizedGainLoss: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    enum: ['INR', 'USD', 'EUR', 'GBP'],
    default: 'INR',
  },
  // AI Analysis results
  analytics: {
    lastAnalysis: {
      summary: String,
      metrics: {
        totalReturn: Number,
        annualizedReturn: Number,
        volatility: Number,
        sharpeRatio: Number,
        maxDrawdown: Number,
      },
      riskAssessment: {
        riskLevel: {
          type: String,
          enum: ['low', 'moderate', 'high', 'very_high', null],
        },
        diversificationScore: { type: Number, min: 0, max: 100 },
        sectorConcentration: mongoose.Schema.Types.Mixed,
        warnings: [String],
      },
      recommendations: [{
        type: {
          type: String,
          enum: ['rebalance', 'buy', 'sell', 'hold', 'diversify'],
        },
        priority: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        description: String,
        symbol: String,
      }],
    },
    lastAnalyzedAt: Date,
    processingTime: Number,
    analysisStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', null],
      default: null,
    },
    analysisRequestId: String,
  },
  settings: {
    includeInDigest: { type: Boolean, default: true },
    rebalanceThreshold: { type: Number, default: 5 }, // percentage
    targetAllocation: mongoose.Schema.Types.Mixed,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  holdings: [holdingSchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
portfolioSchema.index({ user: 1, name: 1 });
portfolioSchema.index({ 'holdings.symbol': 1 });
portfolioSchema.index({ createdAt: 1 });
portfolioSchema.index({ 'analytics.lastAnalyzedAt': 1 });

// Virtual for unrealized gain/loss
portfolioSchema.virtual('unrealizedGainLoss').get(function() {
  const amount = this.currentValue - this.totalInvested;
  const percentage = this.totalInvested > 0 
    ? ((amount / this.totalInvested) * 100).toFixed(2) 
    : 0;
  return { amount, percentage: parseFloat(percentage) };
});

// Virtual for total return
portfolioSchema.virtual('totalReturn').get(function() {
  const unrealized = this.currentValue - this.totalInvested;
  return unrealized + this.realizedGainLoss;
});

// Virtual for number of holdings
portfolioSchema.virtual('holdingsCount').get(function() {
  return this.holdings.filter(h => h.isActive).length;
});

// Pre-save hook to calculate totals
portfolioSchema.pre('save', function(next) {
  if (this.holdings && this.holdings.length > 0) {
    // Calculate total invested
    this.totalInvested = this.holdings
      .filter(h => h.isActive)
      .reduce((sum, h) => sum + (h.totalCost || 0), 0);

    // Calculate current value
    this.currentValue = this.holdings
      .filter(h => h.isActive)
      .reduce((sum, h) => sum + (h.currentValue || h.totalCost || 0), 0);
  }
  next();
});

// Method to update holding prices
portfolioSchema.methods.updateHoldingPrices = async function(priceData) {
  for (const holding of this.holdings) {
    const price = priceData[holding.symbol];
    if (price) {
      holding.marketData.currentPrice = price.currentPrice;
      holding.marketData.previousClose = price.previousClose;
      holding.marketData.dayChange = {
        amount: price.change,
        percentage: price.changePercent,
      };
      holding.marketData.lastUpdated = new Date();
      holding.currentValue = holding.quantity * price.currentPrice;
      holding.unrealizedGainLoss = {
        amount: holding.currentValue - holding.totalCost,
        percentage: ((holding.currentValue - holding.totalCost) / holding.totalCost * 100).toFixed(2),
      };
    }
  }
  await this.save();
};

// Static method to find portfolios pending analysis
portfolioSchema.statics.findPendingAnalysis = function() {
  return this.find({
    'analytics.analysisStatus': 'pending',
    isActive: true,
  });
};

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;
