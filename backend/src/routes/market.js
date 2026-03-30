const express = require('express');
const router = express.Router();

const { authenticate, optionalAuth } = require('../middleware/auth');
const { getQuote, searchSymbols, getMarketSummary, getChartData, formatQuote } = require('../services/yfinanceService');
const logger = require('../utils/logger');

/**
 * @route   GET /api/market/quote/:symbol
 * @desc    Get real-time stock quote from YFinance
 * @access  Public (with optional auth for rate limits)
 */
router.get('/quote/:symbol', optionalAuth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const region = req.query.region || 'IN';
    
    logger.info(`Fetching quote for symbol: ${symbol}, region: ${region}`);
    
    const quotes = await getQuote(symbol, region);
    
    if (!quotes || quotes.length === 0) {
      return res.status(404).json({
        error: 'Symbol Not Found',
        message: `No data found for symbol: ${symbol}`,
      });
    }

    const formattedQuotes = quotes.map(quote => formatQuote(quote));
    
    res.json({
      data: formattedQuotes[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching quote:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch quote',
    });
  }
});

/**
 * @route   GET /api/market/search
 * @desc    Search for symbols using YFinance autocomplete
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const region = req.query.region || 'IN';
    
    if (!q || q.length < 1) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query is required',
      });
    }

    logger.info(`Searching symbols for query: ${q}, region: ${region}`);
    
    const results = await searchSymbols(q, region);
    
    const formattedResults = results.map(result => ({
      symbol: result.symbol,
      name: result.name,
      type: result.typeDisp || result.type,
      exchange: result.exchDisp || result.exch,
    }));

    res.json({
      results: formattedResults,
      count: formattedResults.length,
      query: q,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error searching symbols:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to search symbols',
    });
  }
});

/**
 * @route   GET /api/market/indices
 * @desc    Get major market indices (real-time data)
 * @access  Public
 */
router.get('/indices', async (req, res) => {
  try {
    const region = req.query.region || 'IN';
    
    logger.info(`Fetching indices for region: ${region}`);
    
    // Get Indian market indices
    const indicesSymbols = ['^NSEI', '^BSESN', '^NSEBANK'];
    const indicesQuotes = await getQuote(indicesSymbols, region);
    
    if (!indicesQuotes || indicesQuotes.length === 0) {
      // Fallback to mock data if API fails
      return res.json({
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
        source: 'mock',
      });
    }

    const indices = indicesQuotes.map(quote => ({
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || quote.symbol,
      value: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      exchange: quote.fullExchangeName || quote.exchange,
      currency: quote.currency,
    }));

    res.json({
      indices,
      timestamp: new Date().toISOString(),
      source: 'yfinance',
    });
  } catch (error) {
    logger.error('Error fetching indices:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch indices',
    });
  }
});

/**
 * @route   GET /api/market/chart/:symbol
 * @desc    Get historical chart data
 * @access  Public
 */
router.get('/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d', range = '1y' } = req.query;
    
    logger.info(`Fetching chart data for symbol: ${symbol}, interval: ${interval}, range: ${range}`);
    
    const chartData = await getChartData(symbol, interval, range);
    
    if (!chartData) {
      return res.status(404).json({
        error: 'Symbol Not Found',
        message: `No chart data found for symbol: ${symbol}`,
      });
    }

    const timestamps = chartData.timestamp || [];
    const prices = chartData.indicators?.quote?.[0] || {};
    
    res.json({
      symbol: chartData.meta?.symbol || symbol,
      currency: chartData.meta?.currency,
      regularMarketPrice: chartData.meta?.regularMarketPrice,
      previousClose: chartData.meta?.previousClose,
      timestamps,
      prices: {
        opens: prices.open || [],
        closes: prices.close || [],
        highs: prices.high || [],
        lows: prices.low || [],
        volumes: prices.volume || [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching chart data:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch chart data',
    });
  }
});

module.exports = router;
