# Finnhub API Analysis & Implementation Guide for InvestWise

**Date:** March 4, 2026  
**Project:** InvestWise - Portfolio Management Application  
**API Provider:** Finnhub  
**Total APIs Reviewed:** 11+ Core Financial APIs

---

## 🎯 Executive Summary

Finnhub provides **11 major free-tier financial data APIs** that are highly relevant for InvestWise. These APIs can supply real-time stock prices, company fundamentals, analyst ratings, earnings data, news, and market insights.

**Status:** API Key appears to need verification. Please confirm the key is correct on your Finnhub dashboard.

---

## 📊 API Breakdown - What Each API Provides

### 1. **QUOTE** ⭐ ESSENTIAL (High Usage, Free)
**Purpose:** Real-time stock prices and daily metrics

**Data Returned:**
- `c` - Current price
- `d` - Day change (absolute)
- `dp` - Day change percent
- `h` - Day high price
- `l` - Day low price
- `o` - Open price
- `pc` - Previous close price
- `t` - Last update timestamp

**Example Response:**
```json
{
  "c": 261.74,
  "d": 2.29,
  "dp": 0.88,
  "h": 263.31,
  "l": 260.68,
  "o": 261.07,
  "pc": 259.45,
  "t": 1582641000
}
```

**InvestWise Usage:**
- ✅ Display current price in holdings list
- ✅ Show P&L (profit/loss) with percentage
- ✅ Display day's high/low
- ✅ Refresh prices periodically (poll every 5-60 seconds)

**Implementation:**
```
GET /api/v1/quote?symbol=AAPL
Endpoint: /api/market/quote/:symbol
Cache: 5 minutes (short TTL for real-time feel)
Polling: Every 30 seconds for active holdings
```

---

### 2. **SYMBOL LOOKUP** (Free)
**Purpose:** Search and discover stock symbols

**Data Returned:**
- `count` - Number of results
- `result` - Array of matches containing:
  - `symbol` - Stock ticker (e.g., AAPL)
  - `displaySymbol` - Display format (e.g., AAPL.SW)
  - `description` - Company name
  - `type` - Security type (Common Stock, ETF, etc.)

**Example Response:**
```json
{
  "count": 4,
  "result": [
    {
      "description": "APPLE INC",
      "displaySymbol": "AAPL",
      "symbol": "AAPL",
      "type": "Common Stock"
    }
  ]
}
```

**InvestWise Usage:**
- ✅ Power the search box when adding new holdings
- ✅ Suggest symbols as user types
- ✅ Validate symbol before adding

**Implementation:**
```
GET /api/v1/search?q=apple
Endpoint: /api/market/search?q=
Cache: 1 hour (symbol data doesn't change often)
Use Case: Asset search in "Add Holding" dialog
```

---

### 3. **COMPANY PROFILE 2** (Free - Recommended over Premium Profile)
**Purpose:** Basic company information

**Data Returned:**
- `name` - Company name
- `ticker` - Stock ticker
- `exchange` - Listed exchange (NASDAQ, NYSE, etc.)
- `currency` - Trading currency
- `ipo` - IPO date
- `marketCapitalization` - Market cap in millions
- `phone` - Company phone
- `weburl` - Company website
- `finnhubIndustry` - Industry classification
- `logo` - Company logo URL
- `shareOutstanding` - Shares outstanding

**Example Response:**
```json
{
  "country": "US",
  "currency": "USD",
  "exchange": "NASDAQ/NMS (GLOBAL MARKET)",
  "ipo": "1980-12-12",
  "marketCapitalization": 1415993,
  "name": "Apple Inc",
  "phone": "14089961010",
  "shareOutstanding": 4375.48,
  "ticker": "AAPL",
  "weburl": "https://www.apple.com/"
}
```

**InvestWise Usage:**
- ✅ Display company details in holding info panel
- ✅ Show company logo
- ✅ Display market cap
- ✅ Link to company website
- ✅ Show industry classification

**Implementation:**
```
GET /api/v1/stock/profile2?symbol=AAPL
Endpoint: /api/company/:symbol/profile
Cache: 1 year (rarely changes)  
Use Case: Holding detail page header
```

---

### 4. **BASIC FINANCIALS** ⭐ IMPORTANT (High Usage, Free)
**Purpose:** Key financial ratios and metrics

**Data Returned:**
- `metric` - Key metrics (single value):
  - `peRatio` - Price-to-Earnings ratio
  - `pbRatio` - Price-to-Book ratio
  - `dividendYieldPercent` - Annual dividend yield
  - `roeFTM` - Return on Equity
  - `debtToEquity` - Debt-to-Equity ratio
  - `currentRatio` - Liquidity ratio
  - `52WeekHigh` / `52WeekLow` - Price range
- `series` - Time-series data (historical):
  - `annual` / `quarterly` - Historical values with periods

**Example Response:**
```json
{
  "metric": {
    "10DayAverageTradingVolume": 53717320,
    "52WeekHigh": 414.5,
    "52WeekLow": 206.86,
    "peRatio": 24.5,
    "pbRatio": 42.3,
    "dividendYieldPercent": 0.43,
    "roeFTM": 85.6,
    "debtToEquity": 1.8
  },
  "series": {
    "annual": {
      "currentRatio": [...],
      "netMargin": [...]
    }
  }
}
```

**InvestWise Usage:**
- ✅ Display P/E ratio (valuation)
- ✅ Show 52-week high/low
- ✅ Display dividend yield
- ✅ Show debt-to-equity (financial health)
- ✅ Display ROE (profitability)

**Implementation:**
```
GET /api/v1/stock/metric?symbol=AAPL&metric=all
Endpoint: /api/company/:symbol/fundamentals
Cache: 24 hours (daily data)
Use Case: Holding detail page - Financials section
```

---

### 5. **RECOMMENDATION TRENDS** ⭐ KEY (Free)
**Purpose:** Analyst buy/sell/hold ratings

**Data Returned:**
- Array of rating periods with:
  - `period` - Period date (YYYY-MM-DD)
  - `strongBuy` - Count of Strong Buy ratings
  - `buy` - Count of Buy ratings
  - `hold` - Count of Hold ratings
  - `sell` - Count of Sell ratings
  - `strongSell` - Count of Strong Sell ratings

**Example Response:**
```json
[
  {
    "buy": 24,
    "hold": 7,
    "period": "2025-03-01",
    "sell": 0,
    "strongBuy": 13,
    "strongSell": 0,
    "symbol": "AAPL"
  }
]
```

**InvestWise Usage:**
- ✅ Show analyst consensus rating
- ✅ Display rating distribution (pie/bar chart)
- ✅ Calculate bullish vs bearish %
- ✅ Show trend over time

**Implementation:**
```
GET /api/v1/stock/recommendation?symbol=AAPL
Endpoint: /api/company/:symbol/recommendations
Cache: 7 days (updated monthly by analysts)
Use Case: Holding detail - Analyst Sentiment section
Display: "13 Strong Buy, 24 Buy, 7 Hold" gauge
```

---

### 6. **EARNINGS SURPRISES** (High Usage, Free - Last 4 Quarters)
**Purpose:** Historical earnings performance (beats/misses)

**Data Returned:**
- Array of quarterly earnings with:
  - `actual` - Actual EPS reported
  - `estimate` - Previously estimated EPS
  - `surprise` - Actual minus estimate
  - `surprisePercent` - Percentage difference
  - `period` - Period end date
  - `quarter`, `year` - Fiscal quarter/year

**Example Response:**
```json
[
  {
    "actual": 1.88,
    "estimate": 1.9744,
    "period": "2023-03-31",
    "quarter": 1,
    "surprise": -0.0944,
    "surprisePercent": -4.7812,
    "symbol": "AAPL",
    "year": 2023
  }
]
```

**InvestWise Usage:**
- ✅ Show earnings beat/miss history
- ✅ Indicate if company typically beats expectations
- ✅ Display %age of beats vs misses
- ✅ Show consistency/volatility

**Implementation:**
```
GET /api/v1/stock/earnings?symbol=AAPL
Endpoint: /api/company/:symbol/earnings-history
Cache: 1 day
Use Case: Holding detail - Earnings Performance
Display: Last 4 quarters with beat/miss indicators
```

---

### 7. **EARNINGS CALENDAR** (Free - 1 month history, future)
**Purpose:** Upcoming and past earnings dates

**Data Returned:**
- `earningsCalendar` - Array of earnings events:
  - `date` - Earnings announcement date
  - `symbol` - Stock symbol
  - `epsEstimate` - EPS estimate
  - `epsActual` - Actual EPS (if already reported)
  - `revenueEstimate` - Revenue estimate ($B)
  - `revenueActual` - Actual revenue
  - `hour` - Timing (bmo=before open, amc=after close, dmh=during)
  - `quarter`, `year` - Period

**Example Response:**
```json
{
  "earningsCalendar": [
    {
      "date": "2025-04-30",
      "symbol": "AAPL",
      "epsEstimate": 1.23,
      "hour": "amc",
      "quarter": 2,
      "revenueEstimate": 90.5,
      "year": 2025
    }
  ]
}
```

**InvestWise Usage:**
- ✅ Show next earnings date
- ✅ Display earnings calendar in holdings
- ✅ Highlight upcoming earnings with alerts
- ✅ Show expected EPS/Revenue vs actual

**Implementation:**
```
GET /api/v1/calendar/earnings?from=2025-03-01&to=2025-06-30&symbol=AAPL
Endpoint: /api/company/:symbol/earnings-calendar
Cache: 6 hours
Use Case: Upcoming Earnings widget, Holding alerts
Display: "AAPL reports on April 30 (after hours)"
```

---

### 8. **COMPANY NEWS** (High Usage, Free - 1 year history)
**Purpose:** Latest news articles about companies

**Data Returned:**
- Array of news articles:
  - `headline` - Article headline
  - `summary` - Article summary
  - `source` - News source (Reuters, Bloomberg, etc.)
  - `datetime` - Publication time (UNIX timestamp)
  - `url` - Link to full article
  - `image` - Thumbnail image URL
  - `related` - Related companies mentioned
  - `id` - News article ID

**Example Response:**
```json
[
  {
    "category": "company news",
    "datetime": 1569550360,
    "headline": "Apple launches new product line",
    "id": 25286,
    "image": "https://example.com/image.jpg",
    "related": "AAPL",
    "source": "Reuters",
    "summary": "Apple announced...",
    "url": "https://reuters.com/..."
  }
]
```

**InvestWise Usage:**
- ✅ Display latest company news in holding detail
- ✅ Show news feed widget on dashboard
- ✅ Show news thumbnail + headline
- ✅ Link to full articles

**Implementation:**
```
GET /api/v1/company-news?symbol=AAPL&from=2025-01-01&to=2025-03-04
Endpoint: /api/company/:symbol/news
Cache: 1 hour
Use Case: Holding details - News section, Dashboard news feed
Display: "3 new articles about AAPL in last 7 days"
```

---

### 9. **PEERS** (Free)
**Purpose:** Competitor/peer companies in same industry

**Data Returned:**
- Array of peer company symbols:
  - Similar companies in same sector/industry
  - Can group by: sector, industry, sub-industry

**Example Response:**
```json
[
  "AAPL",    // Note: includes itself
  "MSFT",    // Microsoft
  "NVDA",    // NVIDIA
  "META",    // Meta
  "GOOGL"    // Google
]
```

**InvestWise Usage:**
- ✅ Show competitor comparison
- ✅ Quick-add competitors to portfolio
- ✅ Compare metrics across peers
- ✅ Identify alternative holdings

**Implementation:**
```
GET /api/v1/stock/peers?symbol=AAPL
Endpoint: /api/company/:symbol/peers
Cache: 1 month
Use Case: Holding detail - Competitors section
Display: "Compare with: MSFT, NVDA, META, GOOGL..."
```

---

### 10. **MARKET STATUS** (Free - New)
**Purpose:** Is the stock market open or closed?

**Data Returned:**
- `isOpen` - Boolean (market open?)
- `session` - Current session (pre-market, regular, post-market, null)
- `exchange` - Exchange code (US, L, etc.)
- `t` - Current timestamp
- `timezone` - Exchange timezone
- `holiday` - Holiday info if applicable

**Example Response:**
```json
{
  "exchange": "US",
  "isOpen": true,
  "session": "regular",
  "t": 1588639480,
  "timezone": "America/New_York"
}
```

**InvestWise Usage:**
- ✅ Show market open/closed indicator
- ✅ Prevent realtime price updates when closed
- ✅ Show next market open time
- ✅ Indicate pre-market/post-market sessions

**Implementation:**
```
GET /api/v1/stock/market-status?exchange=US
Endpoint: /api/market/status
Cache: 1 minute
Use Case: Dashboard header, Price update logic
Display: "Market CLOSED | Opens tomorrow 9:30 AM ET"
```

---

### 11. **INSIDER TRANSACTIONS** (Free - New)
**Purpose:** Insider buying/selling activity

**Data Returned:**
- `data` - Array of insider trades:
  - `name` - Insider's name
  - `share` - Total shares held after transaction
  - `change` - Shares bought/sold (+buy, -sell)
  - `transactionCode` - P, S, M, etc. (P=Buy, S=Sell)
  - `transactionDate` - When trade occurred
  - `transactionPrice` - Average price
  - `filingDate` - When filed with SEC

**Example Response:**
```json
{
  "data": [
    {
      "name": "Kirkhorn Zachary",
      "share": 57234,
      "change": -1250,
      "filingDate": "2021-03-19",
      "transactionDate": "2021-03-17",
      "transactionCode": "S",
      "transactionPrice": 655.81
    }
  ]
}
```

**InvestWise Usage:**
- ✅ Show executive/insider buying (bullish signal)
- ✅ Show insider selling (warning signal)
- ✅ Display insider activity feed
- ✅ Indicate transaction size/significance

**Implementation:**
```
GET /api/v1/stock/insider-transactions?symbol=AAPL&limit=5
Endpoint: /api/company/:symbol/insider-trades
Cache: 1 day
Use Case: Holding detail - Insider Activity section
Display: "CEO bought 1000 shares | CFO sold 500 shares"
```

---

## 🎯 InvestWise Data Display Recommendations

### **TIER 1: ESSENTIAL (Week 3 - MVP)**
Implement these 4 APIs for core functionality:

| API | Display Location | Data Points | Priority |
|-----|-----------------|-------------|----------|
| **Quote** | Holdings List | Price, Change%, High/Low | 🔴 CRITICAL |
| **Company Profile 2** | Holding Header | Logo, Name, Exchange | 🔴 CRITICAL |
| **Market Status** | Dashboard Header | Market Open/Closed | 🟠 HIGH |
| **Recommendation Trends** | Holding Detail | Buy/Hold/Sell Ratings | 🟠 HIGH |

**Holding Card Example:**
```
┌─────────────────────────────────┐
│ AAPL  Apple Inc.        [$261.74]  │
│ +$2.29 (+0.88%)              ↗️   │
│ Day High: $263.31 | Low: $260.68   │
│ Analyst Rating: 13 Strong Buy ⭐⭐  │
└─────────────────────────────────┘
```

---

### **TIER 2: ENHANCED (Week 4)**
Add 3 more APIs for deeper insights:

| API | Display Location | Data Points | Priority |
|-----|-----------------|-------------|----------|
| **Basic Financials** | Holding Details | P/E, Div Yield, 52W High/Low | 🟡 MEDIUM |
| **Earnings Calendar** | Dashboard Widget | Next Earnings Date | 🟡 MEDIUM |
| **Earnings Surprises** | Holding Details | Beat/Miss History | 🟡 MEDIUM |

**Holding Detail Example:**
```
📊 FUNDAMENTALS
├─ P/E Ratio: 24.5 (Market: 22.1)
├─ Dividend Yield: 0.43%
├─ 52W Range: $206.86 - $414.50
├─ Market Cap: $1.4T
└─ Debt/Equity: 1.8

📅 EARNINGS
└─ Next Report: April 30, 2025 (After Hours)
   Expected EPS: $1.23 | Revenue: $90.5B

📊 EARNINGS HISTORY
├─ Q1 2025: Beat by 4.2%
├─ Q4 2024: Miss by 2.1%
├─ Q3 2024: Beat by 1.8%
└─ Q2 2024: Beat by 3.5%
```

---

### **TIER 3: ADVANCED (Week 5+)**
Add remaining APIs for premium features:

| API | Display Location | Data Points | Priority |
|-----|-----------------|-------------|----------|
| **Company News** | News Feed Panel | Headlines, Sources | 🟢 NICE-TO-HAVE |
| **Insider Transactions** | Activity Feed | Insider Buys/Sells | 🟢 NICE-TO-HAVE |
| **Peers** | Comparison Widget | Competitor Holdings | 🟢 NICE-TO-HAVE |

---

## 🔧 Backend Architecture

### **Recommended Microservice Structure**

```javascript
// services/marketDataService.js
const marketDataService = {
  
  // Retrieve current prices for multiple symbols
  async getQuotes(symbols) {
    // Call Quote API for each symbol
    // Cache results (5 min TTL)
    // Return: { AAPL: { c: 261.74, d: 2.29, ... }, ... }
  },
  
  // Get company fundamental data
  async getCompanyData(symbol) {
    return {
      profile: {...},        // from Profile2
      financials: {...},     // from BasicFinancials
      recommendations: {...} // from Trends
    }
  },
  
  // Get earnings schedule
  async getEarningsCalendar(symbols, fromDate, toDate) {
    // Call EarningsCalendar API
    // Cache 6 hours
  },
  
  // Get news feed
  async getNews(symbol, days = 30) {
    // Call CompanyNews
    // Cache 1 hour
  },
  
  searchSymbols(query) {
    // Call SymbolLookup
    // Cache 1 hour
  }
}
```

### **Caching Strategy**

```
Real-Time Data (Quote):       5 minutes
Fundamental Data:              24 hours
Analyst Ratings:               7 days
Earnings Calendar:             6 hours
News:                          1 hour
Company Profile:               1 year
Market Status:                 1 minute
Insider Transactions:          1 day
Peer Companies:                1 month
```

---

## 📱 Frontend Components to Build

### **1. Holdings List - with Live Prices**
```jsx
<div className="holdings-list">
  {holdings.map(h => (
    <div className="holding-card">
      <div className="price-info">
        <span>{h.symbol} - {h.price.c}</span>
        <span className={h.price.d > 0 ? 'gain' : 'loss'}>
          {h.price.d.toFixed(2)} ({h.price.dp.toFixed(2)}%)
        </span>
      </div>
      <div className="52w-range">
        {h.financials['52WeekLow']} → {h.financials['52WeekHigh']}
      </div>
      <div className="analyst-sentiment">
        ⭐⭐⭐ {buyCount} Strong Buy, {buyCount} Buy
      </div>
    </div>
  ))}
</div>
```

### **2. Holding Detail Page**
- Header: Logo, Company Name, Current Price, Change
- Tabs:
  - **Overview**: Price Chart, News Feed
  - **Fundamentals**: P/E, Dividend, Market Cap, Debt/Equity
  - **Analyst Ratings**: Buy/Hold/Sell distribution
  - **Earnings**: Calendar + History
  - **News**: Latest articles
  - **Insiders**: Insider transactions

### **3. Market Status Indicator**
```jsx
<div className="market-status">
  {status.isOpen ? (
    <span className="open">🟢 Market Open</span>
  ) : (
    <span className="closed">⚫ Market Closed</span>
  )}
</div>
```

---

## ✅ Implementation Checklist

### **Week 3 (Essential)**
- [ ] Create `marketDataService.js` with Quote, Profile2, MarketStatus APIs
- [ ] Add `/api/market/quote/:symbol` endpoint
- [ ] Update Holdings list component with live prices
- [ ] Display analyst recommendations
- [ ] Add market status indicator to dashboard
- [ ] Implement caching layer
- [ ] Add error handling for failed requests

### **Week 4 (Enhanced)**
- [ ] Add `/api/company/:symbol/fundamentals` endpoint
- [ ] Display financial ratios in holding detail
- [ ] Add earnings calendar widget
- [ ] Show earnings surprises history
- [ ] Add price chart (use Finnhub data for candlestick)

### **Week 5+ (Advanced)**
- [ ] Add news feed component
- [ ] Display insider transactions
- [ ] Add peer company comparison
- [ ] Advanced charting (volume, multiple indicators)
- [ ] Real-time price alerts

---

## 🐛 Troubleshooting

### **API Key Invalid**
- Go to https://finnhub.io/dashboard
- Copy the API key exactly (no spaces)
- Verify it's not accidentally wrapped/quoted
- Check if key has been rotated

### **Empty Responses**
- AAPL/MSFT work best as test symbols
- Some APIs return empty on weekends/holidays
- Check market status before testing
- Some data requires Premium access

### **Rate Limits**
- Free tier: 30 requests/second
- Cache aggressively to avoid hitting limits
- Group multiple requests where possible

---

## 📚 Additional Resources

- Full API Docs: https://finnhub.io/docs/api
- Rate Limits: https://finnhub.io/docs/api/rate-limit
- Symbol Lists: Get supported symbols via `/stock/symbol` endpoint
- Test Symbols: AAPL, MSFT, NVDA, GOOGL, META, TSLA

---

## 🎉 Summary

**Finnhub provides 11 APIs perfect for InvestWise:**

1. ⭐ **Quote** - Real-time prices (CRITICAL)
2. ⭐ **Company Profile 2** - Company info (CRITICAL)
3. ⭐ **Market Status** - Market open/closed (HIGH)
4. ⭐ **Recommendation Trends** - Analyst ratings (HIGH)
5. 🟡 **Basic Financials** - Key ratios (MEDIUM)
6. 🟡 **Earnings Calendar** - Earnings dates (MEDIUM)
7. 🟡 **Earnings Surprises** - Beat/miss history (MEDIUM)
8. 🟢 **Company News** - News feed (NICE-TO-HAVE)
9. 🟢 **Insider Transactions** - Insider activity (NICE-TO-HAVE)
10. 🟢 **Peers** - Competitor comparison (NICE-TO-HAVE)
11. 🟢 **Symbol Lookup** - Search assets (NICE-TO-HAVE)

**Recommended Rollout:**
- **Weeks 3-4:** Implement Tier 1 & 2 (4 + 3 APIs)
- **Week 5+:** Add Tier 3 (remaining 4 APIs)
- **MVP can launch with just Tier 1** (Quote + Profile + Status + Recommendations)
