#!/usr/bin/env node

/**
 * Finnhub API Explorer
 * Tests all major Finnhub APIs and displays results
 * API Key: provided by user
 */

const https = require('https');
const querystring = require('querystring');

const API_KEY = 'yz8CkbTNHy6YqirJWFzVu8w714CaqqV07LpmwZLa';
const BASE_URL = 'https://finnhub.io/api/v1';
const TEST_SYMBOL = 'AAPL';

// Helper function to make HTTP requests
function makeRequest(path, params = {}) {
  return new Promise((resolve, reject) => {
    params.token = API_KEY;
    const queryStr = querystring.stringify(params);
    const fullUrl = `${BASE_URL}${path}?${queryStr}`;
    
    https.get(fullUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function testApis() {
  console.log('='.repeat(80));
  console.log('FINNHUB API EXPLORER - Testing All Main APIs');
  console.log('='.repeat(80));
  console.log(`Test Symbol: ${TEST_SYMBOL}`);
  console.log(`API Key Status: Active\n`);

  const results = {};

  // 1. QUOTE - Real-time stock price
  console.log('\n1️⃣  QUOTE - Real-time Stock Price');
  console.log('-'.repeat(80));
  try {
    const quote = await makeRequest('/quote', { symbol: TEST_SYMBOL });
    results.quote = quote;
    console.log('✅ Success');
    console.log(`   Current Price: $${quote.c}`);
    console.log(`   Change: ${quote.d} (${quote.dp}%)`);
    console.log(`   Today's High: $${quote.h} | Low: $${quote.l}`);
    console.log(`   Open: $${quote.o} | Previous Close: $${quote.pc}`);
    if (quote.t) {
      console.log(`   Last Update: ${new Date(quote.t * 1000).toISOString()}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 2. SYMBOL LOOKUP - Search for symbols
  console.log('\n2️⃣  SYMBOL LOOKUP - Search for Symbols');
  console.log('-'.repeat(80));
  try {
    const search = await makeRequest('/search', { q: 'Apple' });
    results.symbolLookup = search;
    console.log('✅ Success');
    console.log(`   Found ${search.count} results for 'Apple'`);
    search.result.slice(0, 3).forEach((item, i) => {
      console.log(`   ${i+1}. ${item.displaySymbol} - ${item.description} (${item.type})`);
    });
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 3. COMPANY NEWS - Latest news
  console.log('\n3️⃣  COMPANY NEWS - Latest Company News');
  console.log('-'.repeat(80));
  try {
    const today = new Date();
    const from = new Date(today.getTime() - 30*24*60*60*1000).toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];
    const news = await makeRequest('/company-news', { 
      symbol: TEST_SYMBOL, 
      from, 
      to 
    });
    results.companyNews = news;
    console.log('✅ Success');
    console.log(`   Found ${news.length || 0} articles in last 30 days`);
    if (news.length > 0) {
      const article = news[0];
      console.log(`   Latest: "${article.headline}"`);
      console.log(`   Source: ${article.source}`);
      console.log(`   Published: ${new Date(article.datetime * 1000).toLocaleDateString()}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 4. COMPANY PROFILE 2 - Company info (Free version)
  console.log('\n4️⃣  COMPANY PROFILE 2 - Company Information');
  console.log('-'.repeat(80));
  try {
    const profile = await makeRequest('/stock/profile2', { symbol: TEST_SYMBOL });
    results.profile = profile;
    console.log('✅ Success');
    console.log(`   Name: ${profile.name}`);
    console.log(`   Exchange: ${profile.exchange}`);
    console.log(`   Currency: ${profile.currency}`);
    console.log(`   Market Cap: ${profile.marketCapitalization}M`);
    console.log(`   IPO Date: ${profile.ipo}`);
    console.log(`   Website: ${profile.weburl}`);
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 5. BASIC FINANCIALS - Key ratios
  console.log('\n5️⃣  BASIC FINANCIALS - Key Metrics & Ratios');
  console.log('-'.repeat(80));
  try {
    const financials = await makeRequest('/stock/metric', { 
      symbol: TEST_SYMBOL, 
      metric: 'all' 
    });
    results.basicFinancials = financials;
    console.log('✅ Success');
    if (financials.metric) {
      console.log('   Key Metrics:');
      const metrics = ['peRatio', 'pbRatio', 'dividendYieldPercent', 'roeFTM', 'debtToEquity', '52WeekHigh', '52WeekLow'];
      metrics.forEach(m => {
        if (financials.metric[m] !== undefined) {
          console.log(`   - ${m}: ${financials.metric[m]}`);
        }
      });
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 6. RECOMMENDATION TRENDS - Analyst ratings
  console.log('\n6️⃣  RECOMMENDATION TRENDS - Analyst Ratings');
  console.log('-'.repeat(80));
  try {
    const recommendations = await makeRequest('/stock/recommendation', { symbol: TEST_SYMBOL });
    results.recommendations = recommendations;
    console.log('✅ Success');
    if (recommendations.length > 0) {
      const latest = recommendations[0];
      console.log(`   Latest (${latest.period}):`);
      console.log(`   - Strong Buy: ${latest.strongBuy}`);
      console.log(`   - Buy: ${latest.buy}`);
      console.log(`   - Hold: ${latest.hold}`);
      console.log(`   - Sell: ${latest.sell}`);
      console.log(`   - Strong Sell: ${latest.strongSell}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 7. EPS SURPRISES - Earnings surprises
  console.log('\n7️⃣  EPS SURPRISES - Earnings Surprises History');
  console.log('-'.repeat(80));
  try {
    const earnings = await makeRequest('/stock/earnings', { symbol: TEST_SYMBOL });
    results.earnings = earnings;
    console.log('✅ Success');
    console.log(`   Found ${earnings.length || 0} historical earnings`);
    if (earnings.length > 0) {
      const latest = earnings[0];
      console.log(`   Latest Quarter (${latest.period}):`);
      console.log(`   - Actual EPS: ${latest.actual}`);
      console.log(`   - Estimated EPS: ${latest.estimate}`);
      console.log(`   - Surprise: ${latest.surprise} (${latest.surprisePercent}%)`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 8. PEERS - Competitor companies
  console.log('\n8️⃣  PEERS - Competitor Companies');
  console.log('-'.repeat(80));
  try {
    const peers = await makeRequest('/stock/peers', { symbol: TEST_SYMBOL });
    results.peers = peers;
    console.log('✅ Success');
    console.log(`   Found ${peers.length || 0} peer companies`);
    if (peers.length > 0) {
      console.log(`   Peers: ${peers.slice(0, 5).join(', ')}${peers.length > 5 ? '...' : ''}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 9. EARNINGS CALENDAR - Upcoming earnings
  console.log('\n9️⃣  EARNINGS CALENDAR - Earnings Schedule');
  console.log('-'.repeat(80));
  try {
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const to = new Date(today.getTime() + 90*24*60*60*1000).toISOString().split('T')[0];
    const calendar = await makeRequest('/calendar/earnings', { 
      from, 
      to, 
      symbol: TEST_SYMBOL 
    });
    results.earningsCalendar = calendar;
    console.log('✅ Success');
    if (calendar.earningsCalendar && calendar.earningsCalendar.length > 0) {
      console.log(`   Found ${calendar.earningsCalendar.length} upcoming earnings`);
      const next = calendar.earningsCalendar[0];
      console.log(`   Next Earnings: ${next.date}`);
      console.log(`   - EPS Estimate: ${next.epsEstimate}`);
      console.log(`   - Revenue Estimate: $${next.revenueEstimate}B`);
    } else {
      console.log('   No upcoming earnings in next 90 days');
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 10. INSIDER TRANSACTIONS - Insider activity
  console.log('\n🔟 INSIDER TRANSACTIONS - Insider Trading Activity');
  console.log('-'.repeat(80));
  try {
    const insiders = await makeRequest('/stock/insider-transactions', { 
      symbol: TEST_SYMBOL,
      limit: 5
    });
    results.insiderTransactions = insiders;
    console.log('✅ Success');
    if (insiders.data && insiders.data.length > 0) {
      console.log(`   Found ${insiders.data.length} recent insider transactions`);
      const latest = insiders.data[0];
      console.log(`   Latest: ${latest.name}`);
      console.log(`   - Type: ${latest.transactionCode === 'S' ? 'SELL' : latest.transactionCode === 'P' ? 'BUY' : 'OTHER'}`);
      console.log(`   - Shares: ${latest.change}`);
      console.log(`   - Date: ${new Date(latest.transactionDate).toLocaleDateString()}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 11. MARKET STATUS - Exchange status
  console.log('\n1️⃣1️⃣  MARKET STATUS - Stock Market Status');
  console.log('-'.repeat(80));
  try {
    const status = await makeRequest('/stock/market-status', { exchange: 'US' });
    results.marketStatus = status;
    console.log('✅ Success');
    console.log(`   US Market: ${status.isOpen ? 'OPEN' : 'CLOSED'}`);
    console.log(`   Session: ${status.session || 'N/A'}`);
    console.log(`   Timezone: ${status.timezone}`);
    if (status.holiday) {
      console.log(`   Holiday: ${status.holiday}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // Summary and recommendations
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY & RECOMMENDATIONS FOR INVESTWISE');
  console.log('='.repeat(80));
  displayRecommendations(results);
}

function displayRecommendations(results) {
  console.log(`
📊 DATA AVAILABLE FOR DISPLAY:

✅ REAL-TIME PRICING DATA:
   • Current Price (Quote API) - Display current holding prices with live updates
   • Day Change & Percentage - Show P&L indicators
   • 52-Week High/Low - Display from Basic Financials

✅ COMPANY FUNDAMENTALS:
   • Company Name, Exchange, Currency
   • Market Capitalization
   • IPO Date & Website
   • Key Financial Ratios (P/E, P/B, Dividend Yield, ROE, Debt-to-Equity)

✅ ANALYST INSIGHTS:
   • Recommendation Trends (Strong Buy/Buy/Hold/Sell counts)
   • EPS Surprises History (Show earning beats/misses)
   • Earnings Calendar (Upcoming earnings dates)
   • Insider Transactions (Show insider buy/sell activity)

✅ NEWS & SENTIMENT:
   • Latest Company News (Recent articles from last 30 days)
   • Market Status (Show if market is open/closed)

✅ COMPETITIVE ANALYSIS:
   • Peer Companies (Show competitors in same industry)

📈 RECOMMENDED IMPLEMENTATION FOR INVESTWISE:

TIER 1 - ESSENTIAL (Week 3):
   1. Quote API → Display current price & daily change for each holding
   2. Company Profile 2 → Show company details
   3. Recommendation Trends → Show analyst buy/sell ratings
   4. Market Status → Show market open/closed status

TIER 2 - ENHANCED (Week 4):
   5. Basic Financials → Show P/E ratio, dividend yield, market cap
   6. Earnings Calendar → Show upcoming earnings dates
   7. EPS Surprises → Historical earning performance

TIER 3 - ADVANCED (Week 5+):
   8. Insider Transactions → Show insider trading activity
   9. Company News → Display latest news
   10. Peers → Compare with competitors

🎯 DISPLAY STRATEGY:

For Portfolio/Holdings List:
   • Add "Current Price" column (from Quote)
   • Add "Change %" column (from Quote)
   • Add "52W High/Low" (from Basic Financials)
   • Add "Dividend Yield %" (from Basic Financials)

For Holding Detail Page:
   • Price Chart with live updates
   • Company information (Profile 2)
   • Key metrics (Financial ratios)
   • Analyst ratings (Recommendations)
   • Latest earnings & upcoming dates
   • Recent insider transactions
   • Company news feed

For Dashboard:
   • Market status indicator
   • Top holdings with price changes
   • Upcoming earnings this week
   • News feed
  `);
}

// Run the explorer
testApis().catch(console.error);
