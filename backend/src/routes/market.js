const express = require('express');
const router = express.Router();
const MarketDataService = require('../services/marketDataService');
const { protect } = require('../middleware/auth');

// ============================================
// Quote Endpoints - Current Price Data
// ============================================

/**
 * GET /api/market/quote/:symbol
 * Get current price and quote data for a symbol
 * Query params: region (default: IN)
 */
router.get('/quote/:symbol', protect, async (req, res) => {
  try {
    let { symbol } = req.params;
    const { region = 'IN' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol is required'
      });
    }

    // Auto-add .NS suffix for Indian region if not already present
    if (region === 'IN' && symbol && !symbol.includes('.')) {
      symbol = symbol + '.NS';
    }

    const quote = await MarketDataService.getQuote(symbol, region);

    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    console.error('Error fetching quote for', req.params.symbol, ':', error.message);
    console.error('Full error:', error);
    
    // Handle rate limiting (429) gracefully
    if (error.response?.status === 429) {
      return res.json({
        success: true,
        data: null,
        message: 'Stock data temporarily unavailable due to rate limiting. Please try again in a few moments.',
        cached: false
      });
    }
    
    // Return mock data for now to prevent UI crashes
    console.warn('Returning fallback price data due to API error');
    return res.json({
      success: true,
      data: {
        symbol: req.params.symbol,
        price: 0,
        changePercent: 0,
        change: 0,
        currency: 'INR'
      },
      message: 'Using fallback data - live prices temporarily unavailable',
      fallback: true
    });
  }
});

/**
 * POST /api/market/quote
 * Get quote data for multiple symbols
 * Body: { symbols: ["RELIANCE.NS", "INFOSYS.NS"], region: "IN" }
 */
router.post('/quote', protect, async (req, res) => {
  try {
    let { symbols, region = 'IN' } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Symbols array is required'
      });
    }

    // Limit to 10 symbols per request to avoid rate limiting
    if (symbols.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 symbols allowed per request'
      });
    }

    // Auto-add .NS suffix for Indian region if not already present
    const normalizedSymbols = symbols.map(sym => {
      if (region === 'IN' && sym && !sym.includes('.')) {
        return sym + '.NS';
      }
      return sym;
    });

    const quotes = await MarketDataService.getQuote(normalizedSymbols, region);

    res.json({
      success: true,
      data: quotes
    });
  } catch (error) {
    console.error('Error fetching quotes:', error.message);
    
    // Handle rate limiting (429) gracefully
    if (error.response?.status === 429) {
      return res.json({
        success: true,
        data: [],
        message: 'Stock data temporarily unavailable due to rate limiting. Please try again in a few moments.',
        cached: false
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quote data',
      error: error.message
    });
  }
});

// ============================================
// Chart Endpoints - Historical & Intraday Data
// ============================================

/**
 * GET /api/market/chart/:symbol
 * Get historical chart data
 * Query params: range (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, 10y, max)
 *               interval (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
 */
router.get('/chart/:symbol', protect, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1mo', interval = '1d' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol is required'
      });
    }

    // Validate range
    const validRanges = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y', '10y', 'max', 'ytd'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid range. Valid ranges: ${validRanges.join(', ')}`
      });
    }

    // Validate interval
    const validIntervals = ['1m', '5m', '15m', '30m', '1h', '1d', '1wk', '1mo'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interval. Valid intervals: ${validIntervals.join(', ')}`
      });
    }

    const chart = await MarketDataService.getChart(symbol, range, interval);

    res.json({
      success: true,
      data: chart
    });
  } catch (error) {
    console.error('Error fetching chart:', error.message);
    
    // Handle rate limiting (429) gracefully
    if (error.response?.status === 429) {
      return res.json({
        success: true,
        data: null,
        message: 'Chart data temporarily unavailable due to rate limiting. Please try again in a few moments.',
        cached: false
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data',
      error: error.message
    });
  }
});

// ============================================
// Market Summary Endpoints - Indices
// ============================================

/**
 * GET /api/market/summary
 * Get market summary (indices like SENSEX, NIFTY)
 * Query params: region (default: IN)
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const { region = 'IN' } = req.query;

    const summary = await MarketDataService.getMarketSummary(region);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching market summary:', error.message);
    
    // Handle rate limiting (429) gracefully
    if (error.response?.status === 429) {
      return res.json({
        success: true,
        data: [],
        message: 'Market data temporarily unavailable due to rate limiting. Please try again in a few moments.',
        cached: false
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market summary',
      error: error.message
    });
  }
});

// ============================================
// Search Endpoints - Asset Search
// ============================================

/**
 * GET /api/market/search
 * Search for assets (stocks, ETFs, mutual funds)
 * Query params: q (search query), region (default: IN)
 */
router.get('/search', protect, async (req, res) => {
  try {
    const { q, region = 'IN' } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    if (q.length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    const results = await MarketDataService.searchAssets(q, region);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching assets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search assets',
      error: error.message
    });
  }
});

// ============================================
// Health Check
// ============================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Market Data API is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
