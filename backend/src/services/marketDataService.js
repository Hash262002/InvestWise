const axios = require('axios');
const redis = require('../config/redis');

const YFAPI_BASE = 'https://yfapi.net';
const API_KEY = process.env.YFAPI_KEY || 'yz8CkbTNHy6YqirJWFzVu8w714CaqqV07LpmwZLa';

// Cache duration in seconds
const CACHE_TTL = {
  QUOTE: 5 * 60,      // 5 minutes
  CHART: 15 * 60,     // 15 minutes
  SUMMARY: 5 * 60,    // 5 minutes
  SEARCH: 1 * 60 * 60 // 1 hour
};

// Axios instance with base configuration
const yafinanceClient = axios.create({
  baseURL: YFAPI_BASE,
  headers: {
    'X-API-KEY': API_KEY,
    'Accept': 'application/json'
  },
  timeout: 10000
});

// ============================================
// 1. QUOTE API - Get current price data
// ============================================
class MarketDataService {
  /**
   * Get quote data for one or multiple symbols
   * @param {string|string[]} symbols - Stock symbol(s) e.g., "RELIANCE.NS" or ["RELIANCE.NS", "INFOSYS.NS"]
   * @param {string} region - Region code "IN", "US", etc.
   * @returns {Promise<Object>} Quote data
   */
  static async getQuote(symbols, region = 'IN') {
    try {
      // Normalize symbols to array
      const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
      const cacheKey = `market:quote:${symbolArray.sort().join(',')}:${region}`;

      // Check cache first
      const cached = await this._getFromCache(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] Quote: ${symbolArray.join(',')}`);
        return cached;
      }

      console.log(`[Cache MISS] Fetching quote: ${symbolArray.join(',')}`);

      // Fetch from API
      const response = await yafinanceClient.get('/v6/finance/quote', {
        params: {
          symbols: symbolArray.join(','),
          region,
          lang: 'en'
        }
      });

      if (!response.data.quoteResponse.result) {
        throw new Error('Invalid API response');
      }

      const result = response.data.quoteResponse.result;
      
      // Format response
      const formattedResult = result.length === 1 ? result[0] : result;
      const formatted = this._formatQuoteResponse(formattedResult);

      // Cache the result
      await this._setCache(cacheKey, formatted, CACHE_TTL.QUOTE);

      return formatted;
    } catch (error) {
      console.error('[Market Data Error] getQuote:', error.message);
      throw error;
    }
  }

  /**
   * Get historical chart data
   * @param {string} symbol - Stock symbol
   * @param {string} range - Time range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, 10y, max
   * @param {string} interval - Candle interval: 1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
   * @returns {Promise<Object>} Chart data with OHLCV
   */
  static async getChart(symbol, range = '1mo', interval = '1d') {
    try {
      const cacheKey = `market:chart:${symbol}:${range}:${interval}`;

      // Check cache
      const cached = await this._getFromCache(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] Chart: ${symbol} ${range}`);
        return cached;
      }

      console.log(`[Cache MISS] Fetching chart: ${symbol} ${range} ${interval}`);

      // Fetch from API
      const response = await yafinanceClient.get('/v8/finance/chart/' + symbol, {
        params: {
          range,
          interval,
          region: 'IN',
          lang: 'en',
          events: 'div,split'
        }
      });

      if (!response.data.chart.result[0]) {
        throw new Error('No chart data available');
      }

      const result = response.data.chart.result[0];
      const formatted = this._formatChartResponse(result);

      // Cache the result
      await this._setCache(cacheKey, formatted, CACHE_TTL.CHART);

      return formatted;
    } catch (error) {
      console.error('[Market Data Error] getChart:', error.message);
      throw error;
    }
  }

  /**
   * Get market summary (indices like SENSEX, NIFTY)
   * @param {string} region - Region code
   * @returns {Promise<Object[]>} Array of market indices
   */
  static async getMarketSummary(region = 'IN') {
    try {
      const cacheKey = `market:summary:${region}`;

      // Check cache
      const cached = await this._getFromCache(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] Market Summary: ${region}`);
        return cached;
      }

      console.log(`[Cache MISS] Fetching market summary: ${region}`);

      // Fetch from API
      const response = await yafinanceClient.get('/v6/finance/quote/marketSummary', {
        params: {
          lang: 'en',
          region
        }
      });

      if (!response.data.marketSummaryResponse.result) {
        throw new Error('Invalid market summary response');
      }

      const result = response.data.marketSummaryResponse.result;
      const formatted = this._formatMarketSummary(result);

      // Cache the result
      await this._setCache(cacheKey, formatted, CACHE_TTL.SUMMARY);

      return formatted;
    } catch (error) {
      console.error('[Market Data Error] getMarketSummary:', error.message);
      throw error;
    }
  }

  /**
   * Search for assets (stocks, etfs, mutual funds)
   * @param {string} query - Search query (company name or symbol)
   * @param {string} region - Region code
   * @returns {Promise<Object[]>} Search results
   */
  static async searchAssets(query, region = 'IN') {
    try {
      if (!query || query.length < 1) {
        return [];
      }

      const cacheKey = `market:search:${query}:${region}`;

      // Check cache
      const cached = await this._getFromCache(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] Search: ${query}`);
        return cached;
      }

      console.log(`[Cache MISS] Searching: ${query}`);

      // Fetch from API
      const response = await yafinanceClient.get('/v10/finance/search', {
        params: {
          q: query,
          region,
          lang: 'en'
        }
      });

      if (!response.data.quotes) {
        return [];
      }

      const formatted = this._formatSearchResults(response.data.quotes);

      // Cache the result
      await this._setCache(cacheKey, formatted, CACHE_TTL.SEARCH);

      return formatted;
    } catch (error) {
      console.error('[Market Data Error] searchAssets:', error.message);
      throw error;
    }
  }

  // ============================================
  // CACHE HELPERS
  // ============================================

  static async _getFromCache(key) {
    try {
      if (!redis.isConnected) return null;
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('[Cache Error] Reading cache:', error.message);
      return null;
    }
  }

  static async _setCache(key, value, ttl) {
    try {
      if (!redis.isConnected) return;
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.warn('[Cache Error] Writing cache:', error.message);
    }
  }

  // ============================================
  // RESPONSE FORMATTERS
  // ============================================

  static _formatQuoteResponse(data) {
    if (Array.isArray(data)) {
      return data.map(item => this._formatSingleQuote(item));
    }
    return this._formatSingleQuote(data);
  }

  static _formatSingleQuote(item) {
    return {
      symbol: item.symbol,
      longName: item.longName || item.shortName,
      shortName: item.shortName,
      price: item.regularMarketPrice,
      currency: item.currency,
      change: parseFloat(item.regularMarketChange.toFixed(2)),
      changePercent: parseFloat(item.regularMarketChangePercent.toFixed(2)),
      dayHigh: item.regularMarketDayHigh,
      dayLow: item.regularMarketDayLow,
      dayRange: `${item.regularMarketDayLow} - ${item.regularMarketDayHigh}`,
      volume: item.regularMarketVolume,
      volumeAvg: item.averageDailyVolume3Month,
      bid: item.bid || null,
      ask: item.ask || null,
      pe: item.trailingPE ? parseFloat(item.trailingPE.toFixed(2)) : null,
      eps: item.epsTrailingTwelveMonths || null,
      dividendRate: item.dividendRate || null,
      dividendYield: item.dividendYield || null,
      fiftyTwoWeekHigh: item.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: item.fiftyTwoWeekLow,
      fiftyTwoWeekRange: `${item.fiftyTwoWeekLow} - ${item.fiftyTwoWeekHigh}`,
      fiftyTwoWeekChange: item.fiftyTwoWeekChange || null,
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent || null,
      marketState: item.marketState,
      exchange: item.exchange,
      exchangeName: item.fullExchangeName,
      prevClose: item.regularMarketPreviousClose,
      open: item.regularMarketOpen,
      timestamp: item.regularMarketTime * 1000 // Convert to milliseconds
    };
  }

  static _formatChartResponse(data) {
    const meta = data.meta;
    const timestamps = data.timestamp || [];
    const closes = data.close || [];
    const opens = data.open || [];
    const highs = data.high || [];
    const lows = data.low || [];
    const volumes = data.volume || [];

    // Build OHLCV array
    const candles = timestamps.map((ts, idx) => ({
      timestamp: ts * 1000, // Convert to milliseconds
      open: opens[idx],
      high: highs[idx],
      low: lows[idx],
      close: closes[idx],
      volume: volumes[idx]
    }));

    return {
      symbol: meta.symbol,
      longName: meta.longName,
      currency: meta.currency,
      currentPrice: meta.regularMarketPrice,
      dataGranularity: meta.dataGranularity,
      range: data.range || 'unknown',
      interval: meta.dataGranularity,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      candles,
      comparisons: this._formatComparisons(data.comparisons || [])
    };
  }

  static _formatComparisons(comparisons) {
    return (comparisons || []).map(comp => ({
      symbol: comp.symbol,
      candles: (comp.timestamp || []).map((ts, idx) => ({
        timestamp: ts * 1000,
        open: comp.open?.[idx],
        high: comp.high?.[idx],
        low: comp.low?.[idx],
        close: comp.close?.[idx],
        volume: comp.adjclose?.[idx]
      }))
    }));
  }

  static _formatMarketSummary(data) {
    return data.map(item => {
      // Handle both raw object format and primitive format
      const price = typeof item.regularMarketPrice === 'object' 
        ? item.regularMarketPrice.raw 
        : item.regularMarketPrice;
      const change = typeof item.regularMarketChange === 'object'
        ? item.regularMarketChange.raw
        : item.regularMarketChange;
      const changePercent = typeof item.regularMarketChangePercent === 'object'
        ? item.regularMarketChangePercent.raw
        : item.regularMarketChangePercent;
      const timestamp = typeof item.regularMarketTime === 'object'
        ? (item.regularMarketTime.raw * 1000)
        : (item.regularMarketTime * 1000);

      return {
        symbol: item.symbol,
        shortName: item.shortName,
        longName: item.longName,
        price: price || 0,
        change: change || 0,
        changePercent: changePercent || 0,
        exchange: item.exchange || '',
        exchangeName: item.fullExchangeName || '',
        quoteType: item.quoteType || '',
        marketState: item.marketState || 'REGULAR',
        timestamp: timestamp || Date.now()
      };
    });
  }

  static _formatSearchResults(quotes) {
    return quotes.slice(0, 10).map(item => ({
      symbol: item.symbol,
      name: item.longname || item.shortname,
      exchange: item.exchDisp,
      type: item.typeDisp,
      typeCode: item.type,
      region: item.region
    }));
  }
}

module.exports = MarketDataService;
