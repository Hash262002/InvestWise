// marketDataService.js - Finnhub Integration Service
// Handles all Finnhub API calls with caching and error handling

const axios = require('axios');
const Cache = require('lru-cache');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Cache configuration with different TTLs
const cache = new Cache({
  max: 1000,           // Max items in cache
  ttl: 1000 * 60 * 5   // Default 5 min TTL
});

const CACHE_TTL = {
  quote: 5 * 60,              // 5 minutes - real-time pricing
  profile: 1 * 24 * 60 * 60,  // 1 day - company info
  fundamentals: 24 * 60 * 60, // 24 hours - financial ratios
  recommendations: 7 * 24 * 60 * 60,  // 7 days - analyst ratings
  earnings: 6 * 60 * 60,      // 6 hours - earnings schedule
  news: 1 * 60 * 60,          // 1 hour - news articles
  insiders: 24 * 60 * 60,     // 24 hours - insider trades
  peers: 30 * 24 * 60 * 60,   // 30 days - peer companies
  marketStatus: 1 * 60         // 1 minute - market open/close
};

// ============================================================================
// 1. QUOTE API - Real-time Stock Prices
// ============================================================================

async function getQuote(symbol) {
  const cacheKey = `quote:${symbol}`;
  
  // Check cache
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: {
        symbol,
        token: FINNHUB_API_KEY
      }
    });

    const data = {
      symbol,
      currentPrice: response.data.c,      // Current price
      dayChange: response.data.d,         // Change amount
      dayChangePercent: response.data.dp, // Change percentage
      dayHigh: response.data.h,           // Day high
      dayLow: response.data.l,            // Day low
      open: response.data.o,              // Open price
      previousClose: response.data.pc,    // Previous close
      timestamp: response.data.t,         // Last update timestamp
      updatedAt: new Date().toISOString()
    };

    // Cache with short TTL for real-time feel
    cache.set(cacheKey, data, { ttl: CACHE_TTL.quote });
    return data;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch quote for ${symbol}`);
  }
}

// Get quotes for multiple symbols
async function getQuotes(symbols) {
  const promises = symbols.map(symbol => 
    getQuote(symbol).catch(err => ({
      symbol,
      error: err.message
    }))
  );
  
  const results = await Promise.all(promises);
  
  // Separate successful results from errors
  return {
    prices: results.filter(r => !r.error).reduce((acc, r) => {
      acc[r.symbol] = r;
      return acc;
    }, {}),
    errors: results.filter(r => r.error)
  };
}

// ============================================================================
// 2. COMPANY PROFILE 2 API - Company Information
// ============================================================================

async function getCompanyProfile(symbol) {
  const cacheKey = `profile:${symbol}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/profile2`, {
      params: {
        symbol,
        token: FINNHUB_API_KEY
      }
    });

    const data = {
      symbol,
      name: response.data.name,
      exchange: response.data.exchange,
      currency: response.data.currency,
      country: response.data.country,
      marketCapitalization: response.data.marketCapitalization,
      marketCapCurrency: response.data.marketCapCurrency,
      ipoDate: response.data.ipo,
      phone: response.data.phone,
      website: response.data.weburl,
      industry: response.data.finnhubIndustry,
      logo: response.data.logo,
      shareOutstanding: response.data.shareOutstanding
    };

    cache.set(cacheKey, data, { ttl: CACHE_TTL.profile });
    return data;
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch profile for ${symbol}`);
  }
}

// ============================================================================
// 3. BASIC FINANCIALS API - Key Metrics & Ratios
// ============================================================================

async function getFinancialMetrics(symbol) {
  const cacheKey = `fundamentals:${symbol}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/metric`, {
      params: {
        symbol,
        metric: 'all',
        token: FINNHUB_API_KEY
      }
    });

    const metrics = response.data.metric || {};
    
    const data = {
      symbol,
      // Valuation metrics
      peRatio: metrics.peRatio,
      pbRatio: metrics.pbRatio,
      // Profitability
      roeFTM: metrics.roeFTM,
      currentRatio: metrics.currentRatio,
      // Income
      dividendYieldPercent: metrics.dividendYieldPercent,
      // Leverage
      debtToEquity: metrics.debtToEquity,
      // Price ranges
      high52Week: metrics['52WeekHigh'],
      low52Week: metrics['52WeekLow'],
      avgVolume: metrics['10DayAverageTradingVolume'],
      // Margins
      operatingMargin: metrics.operatingMarginTTM,
      netMargin: metrics.netMarginTTM
    };

    cache.set(cacheKey, data, { ttl: CACHE_TTL.fundamentals });
    return data;
  } catch (error) {
    console.error(`Error fetching financials for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch financials for ${symbol}`);
  }
}

// ============================================================================
// 4. RECOMMENDATION TRENDS API - Analyst Ratings
// ============================================================================

async function getRecommendationTrends(symbol) {
  const cacheKey = `recommendations:${symbol}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/recommendation`, {
      params: {
        symbol,
        token: FINNHUB_API_KEY
      }
    });

    // Get latest recommendation
    const latest = response.data[0] || {};
    
    const data = {
      symbol,
      period: latest.period,
      strongBuy: latest.strongBuy || 0,
      buy: latest.buy || 0,
      hold: latest.hold || 0,
      sell: latest.sell || 0,
      strongSell: latest.strongSell || 0,
      // Calculated metrics
      totalAnalysts: (latest.strongBuy || 0) + (latest.buy || 0) + 
                    (latest.hold || 0) + (latest.sell || 0) + (latest.strongSell || 0),
      bullishCount: (latest.strongBuy || 0) + (latest.buy || 0),
      bearishCount: (latest.sell || 0) + (latest.strongSell || 0),
      // Calculate rating
      consensusRating: calculateRating(latest),
      historicalData: response.data.slice(0, 12)  // Last 12 months
    };

    cache.set(cacheKey, data, { ttl: CACHE_TTL.recommendations });
    return data;
  } catch (error) {
    console.error(`Error fetching recommendations for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch recommendations for ${symbol}`);
  }
}

function calculateRating(recommendation) {
  const total = (recommendation.strongBuy || 0) + (recommendation.buy || 0) + 
                (recommendation.hold || 0) + (recommendation.sell || 0) + 
                (recommendation.strongSell || 0);
  
  if (total === 0) return 'NO_RATING';
  
  const bullishPercent = ((recommendation.strongBuy || 0) + (recommendation.buy || 0)) / total;
  
  if (bullishPercent >= 0.75) return 'STRONG_BUY';
  if (bullishPercent >= 0.60) return 'BUY';
  if (bullishPercent >= 0.40) return 'HOLD';
  if (bullishPercent >= 0.25) return 'SELL';
  return 'STRONG_SELL';
}

// ============================================================================
// 5. EARNINGS SURPRISES API - Historical EPS Surprises
// ============================================================================

async function getEarningsSurprises(symbol) {
  const cacheKey = `earnings:${symbol}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/earnings`, {
      params: {
        symbol,
        limit: 20,  // Get last 20 earnings
        token: FINNHUB_API_KEY
      }
    });

    const data = (response.data || []).map(earning => ({
      symbol,
      period: earning.period,
      quarter: earning.quarter,
      year: earning.year,
      actual: earning.actual,
      estimate: earning.estimate,
      surprise: earning.surprise,
      surprisePercent: earning.surprisePercent,
      beat: (earning.surprise || 0) > 0  // True if beat estimate
    }));

    cache.set(cacheKey, data, { ttl: CACHE_TTL.earnings });
    return data;
  } catch (error) {
    console.error(`Error fetching earnings for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch earnings for ${symbol}`);
  }
}

// ============================================================================
// 6. EARNINGS CALENDAR API - Upcoming Earnings Dates
// ============================================================================

async function getEarningsCalendar(symbols, daysAhead = 90) {
  const fromDate = new Date().toISOString().split('T')[0];
  const toDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const cacheKey = `earningsCalendar:${symbols.join(',')}:${fromDate}:${toDate}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/calendar/earnings`, {
      params: {
        from: fromDate,
        to: toDate,
        token: FINNHUB_API_KEY
      }
    });

    const calendar = (response.data.earningsCalendar || [])
      .filter(event => symbols.includes(event.symbol))
      .map(event => ({
        symbol: event.symbol,
        date: event.date,
        epsEstimate: event.epsEstimate,
        epsActual: event.epsActual,
        revenueEstimate: event.revenueEstimate,
        revenueActual: event.revenueActual,
        hour: event.hour,  // bmo, amc, dmh
        quarter: event.quarter,
        year: event.year,
        isDue: new Date(event.date) <= new Date()
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    cache.set(cacheKey, calendar, { ttl: CACHE_TTL.earnings });
    return calendar;
  } catch (error) {
    console.error(`Error fetching earnings calendar:`, error.message);
    throw new Error('Failed to fetch earnings calendar');
  }
}

// ============================================================================
// 7. COMPANY NEWS API - Latest News
// ============================================================================

async function getCompanyNews(symbol, days = 30) {
  const cacheKey = `news:${symbol}:${days}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    const response = await axios.get(`${FINNHUB_BASE_URL}/company-news`, {
      params: {
        symbol,
        from: fromDate,
        to: toDate,
        token: FINNHUB_API_KEY
      }
    });

    const news = (response.data || []).map(article => ({
      id: article.id,
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      datetime: article.datetime,
      publishedAt: new Date(article.datetime * 1000).toISOString(),
      url: article.url,
      image: article.image,
      relatedSymbols: (article.related || '').split(',').filter(s => s)
    }));

    cache.set(cacheKey, news, { ttl: CACHE_TTL.news });
    return news;
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch news for ${symbol}`);
  }
}

// ============================================================================
// 8. INSIDER TRANSACTIONS API - Insider Trading Activity
// ============================================================================

async function getInsiderTransactions(symbol, limit = 10) {
  const cacheKey = `insiders:${symbol}:${limit}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/insider-transactions`, {
      params: {
        symbol,
        limit,
        token: FINNHUB_API_KEY
      }
    });

    const transactions = (response.data.data || []).map(tx => ({
      symbol,
      name: tx.name,
      title: tx.title,
      change: tx.change,  // Positive = buy, Negative = sell
      share: tx.share,    // Total shares held after transaction
      transactionCode: tx.transactionCode,  // P=purchase, S=sale, M=misc
      transactionType: tx.change > 0 ? 'BUY' : 'SELL',
      transactionDate: tx.transactionDate,
      transactionPrice: tx.transactionPrice,
      filingDate: tx.filingDate
    }));

    cache.set(cacheKey, transactions, { ttl: CACHE_TTL.insiders });
    return transactions;
  } catch (error) {
    console.error(`Error fetching insider transactions for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch insider transactions for ${symbol}`);
  }
}

// ============================================================================
// 9. PEERS API - Competitor Companies
// ============================================================================

async function getPeers(symbol) {
  const cacheKey = `peers:${symbol}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/peers`, {
      params: {
        symbol,
        token: FINNHUB_API_KEY
      }
    });

    // Filter out the symbol itself from peers
    const peers = (response.data || []).filter(p => p !== symbol);

    cache.set(cacheKey, peers, { ttl: CACHE_TTL.peers });
    return peers;
  } catch (error) {
    console.error(`Error fetching peers for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch peers for ${symbol}`);
  }
}

// ============================================================================
// 10. MARKET STATUS API - Is Market Open?
// ============================================================================

async function getMarketStatus(exchange = 'US') {
  const cacheKey = `marketStatus:${exchange}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/market-status`, {
      params: {
        exchange,
        token: FINNHUB_API_KEY
      }
    });

    const data = {
      exchange: response.data.exchange,
      isOpen: response.data.isOpen,
      session: response.data.session,  // pre-market, regular, post-market
      timestamp: response.data.t,
      timezone: response.data.timezone,
      holiday: response.data.holiday
    };

    cache.set(cacheKey, data, { ttl: CACHE_TTL.marketStatus });
    return data;
  } catch (error) {
    console.error(`Error fetching market status:`, error.message);
    throw new Error('Failed to fetch market status');
  }
}

// ============================================================================
// 11. SYMBOL LOOKUP API - Search for Symbols
// ============================================================================

async function searchSymbols(query) {
  const cacheKey = `search:${query}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/search`, {
      params: {
        q: query,
        token: FINNHUB_API_KEY
      }
    });

    const results = (response.data.result || []).map(result => ({
      symbol: result.symbol,
      displaySymbol: result.displaySymbol,
      description: result.description,
      type: result.type
    }));

    cache.set(cacheKey, results, { ttl: 60 * 60 });  // 1 hour
    return results;
  } catch (error) {
    console.error(`Error searching symbols for "${query}":`, error.message);
    throw new Error(`Failed to search symbols for "${query}"`);
  }
}

// ============================================================================
// COMPOSITE API - Get All Data for a Holding
// ============================================================================

async function getAllHoldingData(symbol) {
  try {
    const [profile, quote, financials, recommendations, earnings, news, insiders, peers] = 
      await Promise.all([
        getCompanyProfile(symbol).catch(e => ({ error: e.message })),
        getQuote(symbol).catch(e => ({ error: e.message })),
        getFinancialMetrics(symbol).catch(e => ({ error: e.message })),
        getRecommendationTrends(symbol).catch(e => ({ error: e.message })),
        getEarningsSurprises(symbol).catch(e => ({ error: e.message })),
        getCompanyNews(symbol, 30).catch(e => ({ error: e.message })),
        getInsiderTransactions(symbol, 5).catch(e => ({ error: e.message })),
        getPeers(symbol).catch(e => ({ error: e.message }))
      ]);

    return {
      symbol,
      profile,
      quote,
      financials,
      recommendations,
      earnings,
      news,
      insiders,
      peers,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error getting all data for ${symbol}:`, error.message);
    throw new Error(`Failed to get all data for ${symbol}`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Individual APIs
  getQuote,
  getQuotes,
  getCompanyProfile,
  getFinancialMetrics,
  getRecommendationTrends,
  getEarningsSurprises,
  getEarningsCalendar,
  getCompanyNews,
  getInsiderTransactions,
  getPeers,
  getMarketStatus,
  searchSymbols,
  
  // Composite API
  getAllHoldingData,
  
  // Utilities
  clearCache: () => cache.clear(),
  cacheSize: () => cache.size,
  calculateRating
};
