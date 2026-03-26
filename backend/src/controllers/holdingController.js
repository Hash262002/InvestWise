// ========================================
// Holding Controller
// ========================================
// Handles HTTP requests for holding operations:
// - POST /api/portfolios/:id/holdings - Add holding to portfolio
// - PUT /api/holdings/:id - Update holding details
// - DELETE /api/holdings/:id - Remove holding from portfolio
// ========================================

const Portfolio = require('../models/Portfolio');
const Holding = require('../models/Holding');

// ----------------------------------------
// Add holding to portfolio
// ----------------------------------------
/**
 * Add a new holding (investment) to a portfolio as an embedded document
 * 
 * @route POST /api/portfolios/:id/holdings
 * @access Protected
 * @body { symbol, name, assetType, exchange, sector, quantity, averageCost }
 */
const addHolding = async (req, res, next) => {
  try {
    const { id: portfolioId } = req.params;
    const userId = req.user.userId;
    const { symbol, name, assetType = 'stock', exchange = 'NSE', sector = 'Unknown', quantity, averageCost } = req.body;

    // Validation
    if (!symbol || symbol.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Symbol is required',
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Asset name is required',
      });
    }

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity is required',
      });
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number',
      });
    }

    if (averageCost === undefined || averageCost === null) {
      return res.status(400).json({
        status: 'error',
        message: 'Average cost is required',
      });
    }

    if (Number.isNaN(averageCost) || averageCost < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Average cost must be a non-negative number',
      });
    }

    // Fetch portfolio and verify ownership
    const portfolio = await Portfolio.findById(portfolioId);

    if (!portfolio) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found',
      });
    }

    if (portfolio.user.toString() !== userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to add holdings to this portfolio',
      });
    }

    // Check if holding with same symbol already exists in this portfolio
    const symbolUpperCase = symbol.toUpperCase().trim();
    const existingHolding = portfolio.holdings?.find(h => h.symbol === symbolUpperCase);

    if (existingHolding) {
      return res.status(409).json({
        status: 'error',
        message: `You already have ${symbolUpperCase} in this portfolio. Update the existing holding instead.`,
      });
    }

    // Calculate total cost
    const totalCost = Number.parseFloat(quantity) * Number.parseFloat(averageCost);

    // Create new embedded holding object
    const newHolding = {
      symbol: symbolUpperCase,
      name: name.trim(),
      assetType: ['stock', 'mutualFund', 'etf', 'bond', 'crypto', 'other'].includes(assetType) ? assetType : 'stock',
      exchange: exchange.toUpperCase().trim() || 'NSE',
      sector: sector.trim() || 'Unknown',
      quantity: Number.parseFloat(quantity),
      averageCost: Number.parseFloat(averageCost),
      totalCost: totalCost,
      currency: portfolio.currency,
      marketData: {
        currentPrice: 0,
        previousClose: 0,
        dayChange: { amount: 0, percentage: 0 },
      },
      currentValue: totalCost,
      unrealizedGainLoss: { amount: 0, percentage: 0 },
      analysis: { concentrationRisk: false },
      isActive: true,
      transactions: [],
    };

    // Add holding to portfolio's embedded array
    portfolio.holdings.push(newHolding);

    // Save portfolio (which will trigger pre-save to recalculate totals)
    await portfolio.save();

    // Return the created holding with its _id
    const addedHolding = portfolio.holdings[portfolio.holdings.length - 1];

    res.status(201).json({
      status: 'success',
      message: 'Holding added successfully',
      data: {
        id: addedHolding._id,
        portfolioId: portfolio._id,
        symbol: addedHolding.symbol,
        name: addedHolding.name,
        assetType: addedHolding.assetType,
        exchange: addedHolding.exchange,
        sector: addedHolding.sector,
        quantity: addedHolding.quantity,
        averageCost: addedHolding.averageCost,
        totalCost: addedHolding.totalCost,
        currentPrice: addedHolding.marketData?.currentPrice || 0,
        currentValue: addedHolding.currentValue || totalCost,
        unrealizedGainLoss: {
          amount: 0,
          percentage: 0,
        },
        createdAt: addedHolding.createdAt,
      },
    });
  } catch (error) {
    console.error('Error adding holding:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add holding',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Update holding (embedded in portfolio)
// ----------------------------------------
/**
 * Update a holding's quantity and averageCost (embedded in portfolio)
 * 
 * @route PUT /api/portfolios/:id/holdings/:holdingId
 * @access Protected
 * @body { quantity, averageCost }
 */
const updateHolding = async (req, res, next) => {
  try {
    const { id: portfolioId, holdingId } = req.params;
    const userId = req.user.userId;
    const { quantity, averageCost } = req.body;

    // Fetch portfolio
    const portfolio = await Portfolio.findById(portfolioId);

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
        message: 'You do not have permission to update holdings in this portfolio',
      });
    }

    // Find holding in embedded array
    const holding = portfolio.holdings?.id(holdingId);

    if (!holding) {
      return res.status(404).json({
        status: 'error',
        message: 'Holding not found in this portfolio',
      });
    }

    // Store old values for recalculation
    const oldTotalCost = holding.totalCost;

    // Update quantity if provided
    if (quantity !== undefined && quantity !== null) {
      if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Quantity must be a positive number',
        });
      }
      holding.quantity = Number.parseFloat(quantity);
    }

    // Update average cost if provided
    if (averageCost !== undefined && averageCost !== null) {
      if (Number.isNaN(averageCost) || averageCost < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Average cost must be a non-negative number',
        });
      }
      holding.averageCost = Number.parseFloat(averageCost);
    }

    // Recalculate total cost
    const newTotalCost = holding.quantity * holding.averageCost;
    holding.totalCost = newTotalCost;

    // Update current value (if we don't have a real price, use cost)
    if (!holding.marketData?.currentPrice || holding.marketData.currentPrice === 0) {
      holding.currentValue = newTotalCost;
    } else {
      holding.currentValue = holding.quantity * holding.marketData.currentPrice;
    }

    // Save portfolio (pre-save hook will recalculate portfolio totals)
    await portfolio.save();

    const gainLoss = holding.currentValue - holding.totalCost;
    const gainLossPercentage = holding.totalCost > 0 
      ? ((gainLoss / holding.totalCost) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      status: 'success',
      message: 'Holding updated successfully',
      data: {
        id: holding._id,
        portfolioId: portfolio._id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
        exchange: holding.exchange,
        sector: holding.sector,
        quantity: holding.quantity,
        averageCost: holding.averageCost,
        totalCost: holding.totalCost,
        currentPrice: holding.marketData?.currentPrice || 0,
        currentValue: holding.currentValue,
        unrealizedGainLoss: {
          amount: gainLoss,
          percentage: Number.parseFloat(gainLossPercentage),
        },
        updatedAt: holding.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating holding:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update holding',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Delete holding (embedded in portfolio)
// ----------------------------------------
/**
 * Delete a holding from a portfolio (embedded document)
 * 
 * @route DELETE /api/portfolios/:portfolioId/holdings/:holdingId
 * @access Protected
 */
const deleteHolding = async (req, res, next) => {
  try {
    const { id: portfolioId, holdingId } = req.params;
    const userId = req.user.userId;

    // Fetch portfolio
    const portfolio = await Portfolio.findById(portfolioId);

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
        message: 'You do not have permission to delete holdings from this portfolio',
      });
    }

    // Find holding in embedded array
    const holding = portfolio.holdings?.id(holdingId);

    if (!holding) {
      return res.status(404).json({
        status: 'error',
        message: 'Holding not found in this portfolio',
      });
    }

    // Store holding data before deletion
    const holdingSymbol = holding.symbol;
    const holdingName = holding.name;
    const holdingCost = holding.totalCost;

    // Remove holding from embedded array
    holding.deleteOne();

    // Save portfolio (pre-save hook will recalculate portfolio totals)
    await portfolio.save();

    res.status(200).json({
      status: 'success',
      message: 'Holding deleted successfully',
      data: {
        id: holdingId,
        symbol: holdingSymbol,
        name: holdingName,
        removedCost: holdingCost,
        portfolioId: portfolio._id,
        updatedTotalInvested: portfolio.totalInvested,
        updatedCurrentValue: portfolio.currentValue,
      },
    });
  } catch (error) {
    console.error('Error deleting holding:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete holding',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Add multiple holdings (batch)
// ----------------------------------------
/**
 * Add multiple holdings to a portfolio in a single request (as embedded documents)
 * @route POST /api/portfolios/:id/holdings/batch
 * @access Protected
 * @body Array of holdings: [{ symbol, name, quantity, averageCost, assetType?, exchange?, sector? }, ...]
 */
const addHoldingsBatch = async (req, res, next) => {
  try {
    const { id: portfolioId } = req.params;
    const userId = req.user.userId;
    const items = Array.isArray(req.body) ? req.body : req.body.holdings;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Holdings array is required' 
      });
    }

    // Fetch portfolio
    const portfolio = await Portfolio.findById(portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Portfolio not found' 
      });
    }

    if (portfolio.user.toString() !== userId.toString()) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'You do not have permission to add holdings to this portfolio' 
      });
    }

    const results = [];
    const holdingsToAdd = [];

    // Validate and prepare all holdings for insertion
    for (const raw of items) {
      const symbol = raw.symbol ? String(raw.symbol).toUpperCase().trim() : null;
      const name = raw.name ? String(raw.name).trim() : null;
      const quantity = raw.quantity !== undefined ? Number.parseFloat(raw.quantity) : null;
      const averageCost = raw.averageCost !== undefined ? Number.parseFloat(raw.averageCost) : null;
      const assetType = raw.assetType || 'stock';
      const exchange = raw.exchange || 'NSE';
      const sector = raw.sector || 'Unknown';

      // Validation
      if (!symbol || !name || quantity === null || averageCost === null) {
        results.push({ 
          symbol: symbol || raw.symbol || 'UNKNOWN', 
          status: 'error', 
          message: 'Missing required fields (symbol, name, quantity, averageCost)' 
        });
        continue;
      }

      if (Number.isNaN(quantity) || quantity <= 0) {
        results.push({ 
          symbol, 
          status: 'error', 
          message: 'Quantity must be a positive number' 
        });
        continue;
      }

      if (Number.isNaN(averageCost) || averageCost < 0) {
        results.push({ 
          symbol, 
          status: 'error', 
          message: 'Average cost must be a non-negative number' 
        });
        continue;
      }

      // Check if holding with same symbol already exists in embedded array
      const existing = portfolio.holdings?.find(h => h.symbol === symbol);
      if (existing) {
        results.push({ 
          symbol, 
          status: 'skipped', 
          message: 'Already exists in portfolio' 
        });
        continue;
      }

      // Calculate total cost
      const totalCost = quantity * averageCost;

      // Create embedded holding object
      const newHolding = {
        symbol,
        name,
        assetType: ['stock', 'mutualFund', 'etf', 'bond', 'crypto', 'other'].includes(assetType) ? assetType : 'stock',
        exchange: exchange.toString().toUpperCase(),
        sector,
        quantity,
        averageCost,
        totalCost,
        currency: portfolio.currency,
        marketData: {
          currentPrice: 0,
          previousClose: 0,
          dayChange: { amount: 0, percentage: 0 },
        },
        currentValue: totalCost,
        unrealizedGainLoss: { amount: 0, percentage: 0 },
        analysis: { concentrationRisk: false },
        isActive: true,
        transactions: [],
      };

      holdingsToAdd.push({ newHolding, symbol, totalCost });
      results.push({ symbol, status: 'queued' });
    }

    // Add all validated holdings to portfolio's embedded array
    const createdHoldings = [];
    if (holdingsToAdd.length > 0) {
      for (const { newHolding, symbol } of holdingsToAdd) {
        portfolio.holdings.push(newHolding);
        const addedHolding = portfolio.holdings[portfolio.holdings.length - 1];
        createdHoldings.push({ symbol, id: addedHolding._id });
      }

      // Save portfolio once (pre-save hook will recalculate totals)
      await portfolio.save();
    }

    // Update results with success status
    if (createdHoldings.length > 0) {
      let idx = 0;
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'queued') {
          results[i] = { 
            symbol: results[i].symbol, 
            status: 'created', 
            id: createdHoldings[idx++].id 
          };
        }
      }
    }

    res.status(201).json({ 
      status: 'success', 
      message: `Batch import completed: ${createdHoldings.length} holdings added`,
      data: {
        importedCount: createdHoldings.length,
        portfolio: {
          id: portfolio._id,
          totalInvested: portfolio.totalInvested,
          currentValue: portfolio.currentValue,
          holdingsCount: portfolio.holdings.length,
        },
        results,
      }
    });
  } catch (error) {
    console.error('Error in batch add holdings:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to import holdings', 
      error: error.message 
    });
  }
};

// ========================================
// Exports
// ========================================

module.exports = {
  addHolding,
  updateHolding,
  deleteHolding,
  addHoldingsBatch,
};
