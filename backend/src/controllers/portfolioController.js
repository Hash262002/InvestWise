// ========================================
// Portfolio Controller
// ========================================
// Handles HTTP requests for portfolio operations:
// - GET /api/portfolios - List user's portfolios
// - POST /api/portfolios - Create new portfolio
// - GET /api/portfolios/:id - Get single portfolio
// - PUT /api/portfolios/:id - Update portfolio
// - DELETE /api/portfolios/:id - Delete portfolio
// ========================================

const Portfolio = require('../models/Portfolio');

// ----------------------------------------
// Get all portfolios for logged-in user
// ----------------------------------------
/**
 * Get all user's portfolios with summary data
 * 
 * @route GET /api/portfolios
 * @access Protected
 */
const getPortfolios = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Fetch all portfolios for this user, sorted by creation date
    const portfolios = await Portfolio.find({ user: userId })
      .select('user name description type totalInvested currentValue realizedGainLoss currency createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Calculate additional metrics for each portfolio
    const portfoliosWithMetrics = portfolios.map(portfolio => {
      const gainLoss = portfolio.currentValue - portfolio.totalInvested;
      const gainLossPercentage = portfolio.totalInvested > 0 
        ? ((gainLoss / portfolio.totalInvested) * 100).toFixed(2)
        : 0;

      return {
        id: portfolio._id,
        name: portfolio.name,
        description: portfolio.description,
        type: portfolio.type,
        totalInvested: portfolio.totalInvested || 0,
        currentValue: portfolio.currentValue || 0,
        gainLoss: gainLoss || 0,
        gainLossPercentage: Number.parseFloat(gainLossPercentage),
        currency: portfolio.currency,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt,
      };
    });

    res.status(200).json({
      status: 'success',
      data: portfoliosWithMetrics,
    });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch portfolios',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Create a new portfolio
// ----------------------------------------
/**
 * Create a new portfolio for the user
 * 
 * @route POST /api/portfolios
 * @access Protected
 * @body { name, description, type, currency }
 */
const createPortfolio = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, description, type = 'other', currency = 'INR' } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Portfolio name is required',
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Portfolio name must be between 2 and 100 characters',
      });
    }

    // Create new portfolio
    const portfolio = new Portfolio({
      user: userId,
      name: name.trim(),
      description: description ? description.trim() : '',
      type: ['growth', 'income', 'balanced', 'retirement', 'trading', 'other'].includes(type) 
        ? type 
        : 'other',
      currency: currency.toUpperCase() || 'INR',
      totalInvested: 0,
      currentValue: 0,
      realizedGainLoss: 0,
    });

    await portfolio.save();

    res.status(201).json({
      status: 'success',
      message: 'Portfolio created successfully',
      data: {
        id: portfolio._id,
        name: portfolio.name,
        description: portfolio.description,
        type: portfolio.type,
        currency: portfolio.currency,
        totalInvested: portfolio.totalInvested,
        currentValue: portfolio.currentValue,
        gainLoss: 0,
        gainLossPercentage: 0,
        createdAt: portfolio.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create portfolio',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Get single portfolio with holdings
// ----------------------------------------
/**
 * Get a single portfolio with all its embedded holdings
 * 
 * @route GET /api/portfolios/:id
 * @access Protected
 */
const getPortfolioById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Fetch portfolio with embedded holdings
    const portfolio = await Portfolio.findById(id).populate('user', 'firstName lastName email');

    if (!portfolio) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found',
      });
    }

    // Check ownership
    if (portfolio.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to access this portfolio',
      });
    }

    // Format embedded holdings data
    const formattedHoldings = (portfolio.holdings || []).map(holding => ({
      _id: holding._id,
      symbol: holding.symbol,
      name: holding.name,
      assetType: holding.assetType,
      exchange: holding.exchange,
      sector: holding.sector,
      quantity: holding.quantity,
      averageCost: holding.averageCost,
      totalCost: holding.totalCost || 0,
      currentPrice: holding.marketData?.currentPrice || 0,
      currentValue: holding.currentValue || 0,
      unrealizedGainLoss: holding.unrealizedGainLoss || { amount: 0, percentage: 0 },
      riskLevel: holding.analysis?.riskLevel || 'medium',
      riskScore: holding.analysis?.riskScore || 0,
      createdAt: holding.createdAt,
    }));

    // Calculate portfolio metrics
    const gainLoss = portfolio.currentValue - portfolio.totalInvested;
    const gainLossPercentage = portfolio.totalInvested > 0 
      ? ((gainLoss / portfolio.totalInvested) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        id: portfolio._id,
        name: portfolio.name,
        description: portfolio.description,
        type: portfolio.type,
        currency: portfolio.currency,
        totalInvested: portfolio.totalInvested || 0,
        currentValue: portfolio.currentValue || 0,
        gainLoss: gainLoss || 0,
        gainLossPercentage: Number.parseFloat(gainLossPercentage),
        holdingsCount: formattedHoldings.length,
        riskScore: portfolio.analysis?.riskScore || 0,
        riskLevel: portfolio.analysis?.riskLevel || 'medium',
        diversificationScore: portfolio.analysis?.diversificationScore || 0,
        holdings: formattedHoldings,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch portfolio',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Update portfolio
// ----------------------------------------
/**
 * Update portfolio details (name, description, type)
 * 
 * @route PUT /api/portfolios/:id
 * @access Protected
 * @body { name, description, type }
 */
const updatePortfolio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, description, type } = req.body;

    // Fetch portfolio
    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found',
      });
    }

    // Check ownership
    if (portfolio.user.toString() !== userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this portfolio',
      });
    }

    // Update fields
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Portfolio name cannot be empty',
        });
      }
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({
          status: 'error',
          message: 'Portfolio name must be between 2 and 100 characters',
        });
      }
      portfolio.name = name.trim();
    }

    if (description !== undefined) {
      portfolio.description = description ? description.trim() : '';
    }

    if (type !== undefined && ['growth', 'income', 'balanced', 'retirement', 'trading', 'other'].includes(type)) {
      portfolio.type = type;
    }

    await portfolio.save();

    const gainLoss = portfolio.currentValue - portfolio.totalInvested;
    const gainLossPercentage = portfolio.totalInvested > 0 
      ? ((gainLoss / portfolio.totalInvested) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      status: 'success',
      message: 'Portfolio updated successfully',
      data: {
        id: portfolio._id,
        name: portfolio.name,
        description: portfolio.description,
        type: portfolio.type,
        currency: portfolio.currency,
        totalInvested: portfolio.totalInvested || 0,
        currentValue: portfolio.currentValue || 0,
        gainLoss: gainLoss || 0,
        gainLossPercentage: Number.parseFloat(gainLossPercentage),
        updatedAt: portfolio.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating portfolio:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update portfolio',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Delete portfolio
// ----------------------------------------
/**
 * Delete a portfolio and all its embedded holdings
 * 
 * @route DELETE /api/portfolios/:id
 * @access Protected
 */
const deletePortfolio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Fetch portfolio
    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found',
      });
    }

    // Check ownership
    if (portfolio.user.toString() !== userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this portfolio',
      });
    }

    // Delete the portfolio (holdings are embedded, so they're deleted automatically)
    await Portfolio.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Portfolio deleted successfully',
      data: {
        id: portfolio._id,
        name: portfolio.name,
      },
    });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete portfolio',
      error: error.message,
    });
  }
};

// ========================================
// Exports
// ========================================

module.exports = {
  getPortfolios,
  createPortfolio,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
};
