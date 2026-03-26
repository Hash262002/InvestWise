const express = require('express');
const router = express.Router();

const { authenticate, optionalAuth } = require('../middleware/auth');

// Market data service placeholder
// In production, integrate with Finnhub or similar API

/**
 * @route   GET /api/market/quote/:symbol
 * @desc    Get stock quote
 * @access  Public (with optional auth for rate limits)
 */
router.get('/quote/:symbol', optionalAuth, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // TODO: Integrate with Finnhub API
    // For now, return mock data
    res.json({
      symbol: symbol.toUpperCase(),
      price: 150.00,
      change: 2.50,
      changePercent: 1.69,
      high: 152.00,
      low: 148.50,
      open: 149.00,
      previousClose: 147.50,
      volume: 1234567,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch quote',
    });
  }
});

/**
 * @route   GET /api/market/search
 * @desc    Search for symbols
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query is required',
      });
    }

    // TODO: Integrate with Finnhub symbol search
    // For now, return mock data
    res.json({
      results: [
        { symbol: 'AAPL', name: 'Apple Inc', type: 'stock', exchange: 'NASDAQ' },
        { symbol: 'GOOGL', name: 'Alphabet Inc', type: 'stock', exchange: 'NASDAQ' },
      ],
      count: 2,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search symbols',
    });
  }
});

/**
 * @route   GET /api/market/indices
 * @desc    Get major market indices
 * @access  Public
 */
router.get('/indices', async (req, res) => {
  try {
    // TODO: Integrate with real market data
    // Mock Indian market indices
    res.json({
      indices: [
        {
          symbol: '^NSEI',
          name: 'NIFTY 50',
          value: 22450.50,
          change: 125.30,
          changePercent: 0.56,
        },
        {
          symbol: '^BSESN',
          name: 'SENSEX',
          value: 73850.25,
          change: 410.75,
          changePercent: 0.56,
        },
        {
          symbol: '^NSEBANK',
          name: 'NIFTY Bank',
          value: 48250.00,
          change: -85.50,
          changePercent: -0.18,
        },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch indices',
    });
  }
});

/**
 * @route   GET /api/market/trending
 * @desc    Get trending stocks
 * @access  Public
 */
router.get('/trending', async (req, res) => {
  try {
    const region = req.query.region || 'IN';
    
    // TODO: Integrate with real trending data
    res.json({
      region,
      gainers: [
        { symbol: 'TATASTEEL.NS', name: 'Tata Steel', change: 3.5 },
        { symbol: 'RELIANCE.NS', name: 'Reliance Industries', change: 2.8 },
      ],
      losers: [
        { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', change: -1.2 },
        { symbol: 'TCS.NS', name: 'TCS', change: -0.8 },
      ],
      mostActive: [
        { symbol: 'SBIN.NS', name: 'State Bank of India', volume: 5000000 },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch trending stocks',
    });
  }
});

module.exports = router;
