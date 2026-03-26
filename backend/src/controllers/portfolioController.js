const Portfolio = require('../models/Portfolio');
const logger = require('../utils/logger');
const { parse } = require('csv-parse/sync');

/**
 * Get all portfolios for current user
 * GET /api/portfolios
 */
const getPortfolios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-createdAt';

    const portfolios = await Portfolio.find({ user: req.userId, isActive: true })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-holdings.transactions');

    const total = await Portfolio.countDocuments({ user: req.userId, isActive: true });

    res.json({
      portfolios,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get portfolios error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch portfolios',
    });
  }
};

/**
 * Get single portfolio by ID
 * GET /api/portfolios/:id
 */
const getPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.userId,
      isActive: true,
    });

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    res.json({ portfolio });
  } catch (error) {
    logger.error('Get portfolio error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch portfolio',
    });
  }
};

/**
 * Create a new portfolio
 * POST /api/portfolios
 */
const createPortfolio = async (req, res) => {
  try {
    const { name, description, type, currency } = req.body;

    // Check for duplicate name
    const existing = await Portfolio.findOne({
      user: req.userId,
      name,
      isActive: true,
    });

    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A portfolio with this name already exists',
      });
    }

    const portfolio = new Portfolio({
      user: req.userId,
      name,
      description,
      type: type || 'other',
      currency: currency || req.user.preferences.currency || 'INR',
    });

    await portfolio.save();

    logger.info('Portfolio created', { userId: req.userId, portfolioId: portfolio._id });

    res.status(201).json({
      message: 'Portfolio created successfully',
      portfolio,
    });
  } catch (error) {
    logger.error('Create portfolio error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create portfolio',
    });
  }
};

/**
 * Update portfolio
 * PUT /api/portfolios/:id
 */
const updatePortfolio = async (req, res) => {
  try {
    const allowedUpdates = ['name', 'description', 'type', 'settings'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, isActive: true },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    logger.info('Portfolio updated', { userId: req.userId, portfolioId: portfolio._id });

    res.json({
      message: 'Portfolio updated successfully',
      portfolio,
    });
  } catch (error) {
    logger.error('Update portfolio error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update portfolio',
    });
  }
};

/**
 * Delete portfolio (soft delete)
 * DELETE /api/portfolios/:id
 */
const deletePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    logger.info('Portfolio deleted', { userId: req.userId, portfolioId: portfolio._id });

    res.json({
      message: 'Portfolio deleted successfully',
    });
  } catch (error) {
    logger.error('Delete portfolio error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete portfolio',
    });
  }
};

/**
 * Import holdings from CSV
 * POST /api/portfolios/:id/import
 */
const importHoldings = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.userId,
      isActive: true,
    });

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    const { holdings } = req.body;

    // Transform and add holdings
    const newHoldings = holdings.map(h => ({
      symbol: h.symbol.toUpperCase(),
      name: h.name,
      assetType: h.assetType || 'stock',
      exchange: h.exchange || '',
      sector: h.sector || '',
      quantity: parseFloat(h.quantity),
      averageCost: parseFloat(h.averageCost),
      totalCost: parseFloat(h.quantity) * parseFloat(h.averageCost),
      currency: h.currency || portfolio.currency,
      currentValue: parseFloat(h.quantity) * parseFloat(h.averageCost), // Will be updated with market data
      isActive: true,
    }));

    // Replace or merge holdings
    if (req.query.replace === 'true') {
      portfolio.holdings = newHoldings;
    } else {
      // Merge: update existing or add new
      for (const newHolding of newHoldings) {
        const existingIndex = portfolio.holdings.findIndex(
          h => h.symbol === newHolding.symbol && h.isActive
        );
        
        if (existingIndex >= 0) {
          // Update existing
          const existing = portfolio.holdings[existingIndex];
          const totalQuantity = existing.quantity + newHolding.quantity;
          const totalCost = existing.totalCost + newHolding.totalCost;
          
          portfolio.holdings[existingIndex].quantity = totalQuantity;
          portfolio.holdings[existingIndex].totalCost = totalCost;
          portfolio.holdings[existingIndex].averageCost = totalCost / totalQuantity;
          portfolio.holdings[existingIndex].currentValue = totalCost; // Update with market data later
        } else {
          // Add new
          portfolio.holdings.push(newHolding);
        }
      }
    }

    await portfolio.save();

    logger.info('Holdings imported', {
      userId: req.userId,
      portfolioId: portfolio._id,
      holdingsCount: newHoldings.length,
    });

    res.json({
      message: 'Holdings imported successfully',
      portfolio,
      imported: newHoldings.length,
    });
  } catch (error) {
    logger.error('Import holdings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to import holdings',
    });
  }
};

/**
 * Parse CSV file and return holdings
 * POST /api/portfolios/parse-csv
 */
const parseCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No CSV file uploaded',
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Map CSV columns to holdings format
    const holdings = records.map((record, index) => {
      // Support various column name formats
      const symbol = record.symbol || record.Symbol || record.SYMBOL || record.ticker || record.Ticker;
      const name = record.name || record.Name || record.NAME || record.company || record.Company || symbol;
      const quantity = record.quantity || record.Quantity || record.QUANTITY || record.qty || record.Qty || '0';
      const averageCost = record.average_cost || record.averageCost || record.AverageCost || 
                          record.avg_cost || record.avgCost || record.price || record.Price || '0';
      const sector = record.sector || record.Sector || record.SECTOR || '';
      const assetType = record.asset_type || record.assetType || record.type || record.Type || 'stock';

      if (!symbol) {
        throw new Error(`Row ${index + 1}: Missing symbol`);
      }

      return {
        symbol: symbol.toUpperCase().trim(),
        name: name.trim(),
        quantity: parseFloat(quantity) || 0,
        averageCost: parseFloat(averageCost) || 0,
        sector: sector.trim(),
        assetType: assetType.toLowerCase().trim(),
      };
    }).filter(h => h.quantity > 0); // Filter out zero quantity

    res.json({
      message: 'CSV parsed successfully',
      holdings,
      total: holdings.length,
    });
  } catch (error) {
    logger.error('Parse CSV error:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: `Failed to parse CSV: ${error.message}`,
    });
  }
};

/**
 * Add single holding
 * POST /api/portfolios/:id/holdings
 */
const addHolding = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.userId,
      isActive: true,
    });

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    const { symbol, name, quantity, averageCost, sector, assetType, exchange } = req.body;

    const holding = {
      symbol: symbol.toUpperCase(),
      name,
      assetType: assetType || 'stock',
      exchange: exchange || '',
      sector: sector || '',
      quantity: parseFloat(quantity),
      averageCost: parseFloat(averageCost),
      totalCost: parseFloat(quantity) * parseFloat(averageCost),
      currency: portfolio.currency,
      currentValue: parseFloat(quantity) * parseFloat(averageCost),
      isActive: true,
    };

    portfolio.holdings.push(holding);
    await portfolio.save();

    logger.info('Holding added', {
      userId: req.userId,
      portfolioId: portfolio._id,
      symbol: holding.symbol,
    });

    res.status(201).json({
      message: 'Holding added successfully',
      holding: portfolio.holdings[portfolio.holdings.length - 1],
    });
  } catch (error) {
    logger.error('Add holding error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add holding',
    });
  }
};

/**
 * Remove holding
 * DELETE /api/portfolios/:id/holdings/:holdingId
 */
const removeHolding = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.userId,
      isActive: true,
    });

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    const holdingIndex = portfolio.holdings.findIndex(
      h => h._id.toString() === req.params.holdingId
    );

    if (holdingIndex === -1) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Holding not found',
      });
    }

    portfolio.holdings[holdingIndex].isActive = false;
    await portfolio.save();

    logger.info('Holding removed', {
      userId: req.userId,
      portfolioId: portfolio._id,
      holdingId: req.params.holdingId,
    });

    res.json({
      message: 'Holding removed successfully',
    });
  } catch (error) {
    logger.error('Remove holding error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove holding',
    });
  }
};

module.exports = {
  getPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  importHoldings,
  parseCSV,
  addHolding,
  removeHolding,
};
