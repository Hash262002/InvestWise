const axios = require('axios');
const logger = require('../utils/logger');

const YFINANCE_API_URL = 'https://yfapi.net';
const API_KEY = process.env.YFINANCE_API_KEY || 'yz8CkbTNHy6YqirJWFzVu8w714CaqqV07LpmwZLa';

// Create axios instance with default config
const yfinanceClient = axios.create({
  baseURL: YFINANCE_API_URL,
  headers: {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Get real-time quote data for symbols
 * @param {string|string[]} symbols - Stock symbol(s) (e.g., 'AAPL' or ['AAPL', 'GOOGL'])
 * @param {string} region - Region (US, IN, etc.)
 * @returns {Promise<Object>} Quote response
 */
async function getQuote(symbols, region = 'US') {
  try {
    // Convert array to comma-separated string
    const symbolsStr = Array.isArray(symbols) ? symbols.join(',') : symbols;
    
    logger.info(`Fetching quote for symbols: ${symbolsStr}, region: ${region}`);
    
    const response = await yfinanceClient.get('/v6/finance/quote', {
      params: {
        symbols: symbolsStr,
        region: region,
        lang: 'en',
      },
    });

    if (response.data?.quoteResponse?.error) {
      throw new Error(response.data.quoteResponse.error);
    }

    return response.data?.quoteResponse?.result || [];
  } catch (error) {
    logger.error('YFinance getQuote error:', {
      error: error.message,
      symbols,
      region,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

/**
 * Get chart/historical data for a symbol
 * @param {string} ticker - Stock ticker symbol
 * @param {string} interval - Interval (1m, 5m, 15m, 1d, 1wk, 1mo)
 * @param {string} range - Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, 10y, ytd, max)
 * @returns {Promise<Object>} Chart data
 */
async function getChartData(ticker, interval = '1d', range = '1y') {
  try {
    logger.info(`Fetching chart data for ${ticker}, interval: ${interval}, range: ${range}`);
    
    const response = await yfinanceClient.get(`/v8/finance/chart/${ticker}`, {
      params: {
        interval: interval,
        range: range,
        region: 'IN',
        lang: 'en',
      },
    });

    if (response.data?.chart?.error) {
      throw new Error(response.data.chart.error);
    }

    return response.data?.chart?.result?.[0] || null;
  } catch (error) {
    logger.error('YFinance getChartData error:', {
      error: error.message,
      ticker,
      interval,
      range,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Autocomplete search for symbols
 * @param {string} query - Search query
 * @param {string} region - Region (US, IN, etc.)
 * @returns {Promise<Array>} Search results
 */
async function searchSymbols(query, region = 'IN') {
  try {
    if (!query || query.length < 1) {
      throw new Error('Search query is required');
    }

    logger.info(`Searching symbols for query: ${query}, region: ${region}`);
    
    const response = await yfinanceClient.get('/v6/finance/autocomplete', {
      params: {
        query: query,
        region: region,
        lang: 'en',
      },
    });

    return response.data?.ResultSet?.Result || [];
  } catch (error) {
    logger.error('YFinance searchSymbols error:', {
      error: error.message,
      query,
      region,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Get market summary (indices)
 * @param {string} region - Region (US, IN, etc.)
 * @returns {Promise<Array>} Market summary
 */
async function getMarketSummary(region = 'IN') {
  try {
    logger.info(`Fetching market summary for region: ${region}`);
    
    const response = await yfinanceClient.get('/v6/finance/quote/marketSummary', {
      params: {
        region: region,
        lang: 'en',
      },
    });

    if (response.data?.marketSummaryResponse?.error) {
      throw new Error(response.data.marketSummaryResponse.error);
    }

    return response.data?.marketSummaryResponse?.result || [];
  } catch (error) {
    logger.error('YFinance getMarketSummary error:', {
      error: error.message,
      region,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Get options data for a symbol
 * @param {string} symbol - Stock symbol
 * @param {number} date - Optional expiration date
 * @returns {Promise<Object>} Options data
 */
async function getOptions(symbol, date = null) {
  try {
    logger.info(`Fetching options for symbol: ${symbol}`);
    
    const params = {};
    if (date) params.date = date;

    const response = await yfinanceClient.get(`/v7/finance/options/${symbol}`, {
      params: params,
    });

    if (response.data?.optionChain?.error) {
      throw new Error(response.data.optionChain.error);
    }

    return response.data?.optionChain?.result?.[0] || null;
  } catch (error) {
    logger.error('YFinance getOptions error:', {
      error: error.message,
      symbol,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Format quote data for frontend
 * @param {Object} quote - Raw quote data from API
 * @returns {Object} Formatted quote
 */
function formatQuote(quote) {
  return {
    symbol: quote.symbol,
    name: quote.longName || quote.shortName || quote.symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    high: quote.regularMarketDayHigh,
    low: quote.regularMarketDayLow,
    open: quote.regularMarketOpen,
    previousClose: quote.regularMarketPreviousClose,
    volume: quote.regularMarketVolume,
    marketCap: quote.marketCap,
    peRatio: quote.trailingPE,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
    currency: quote.currency,
    exchange: quote.fullExchangeName || quote.exchange,
    timestamp: new Date(quote.regularMarketTime * 1000).toISOString(),
  };
}

module.exports = {
  getQuote,
  getChartData,
  searchSymbols,
  getMarketSummary,
  getOptions,
  formatQuote,
};
