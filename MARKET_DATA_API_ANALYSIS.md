# Yahoo Finance API (yfapi.net) - Implementation Guide for InvestWise

## 📊 API Overview

Using **yfapi.net** (not finnhub, but Yahoo Finance) which provides better coverage for Indian stocks and mutual funds.

**API Key**: `yz8CkbTNHy6YqirJWFzVu8w714CaqqV07LpmwZLa`

---

## 🔑 Working APIs Tested

### 1. **Quote API** ✅ WORKS - RECOMMENDED FOR LIVE PRICES
```
GET /v6/finance/quote?region=IN&lang=en&symbols=RELIANCE.NS,INFOSYS.NS,TCS.NS
```

**Returned Data from RELIANCE.NS:**
```json
{
  "symbol": "RELIANCE.NS",
  "price": 1346.5,
  "change": -11.5,
  "changePercent": -0.84677124,
  "dayHigh": 1352.8,
  "dayLow": 1307.0,
  "volume": 27963805,
  "fiftyTwoWeekHigh": 1611.8,
  "fiftyTwoWeekLow": 1114.85,
  "pe": 21.887192,
  "bid": 1346.1,
  "ask": 1346.5,
  "regularMarketOpen": 1357.25,
  "dividendRate": 5.76,
  "dividentYield": 0.42
}
```

**What to Display in UI:**
- ✅ Current Price
- ✅ Change Amount (with color: red/green)
- ✅ Change % (with color: red/green)
- ✅ 52-week High/Low
- ✅ Day High/Low
- ✅ Volume
- ✅ P/E Ratio
- ✅ Bid/Ask Prices (optional)
- ✅ Dividend Rate & Yield

**Rate Limit**: ~100 requests/minute
**Latency**: 15-minute delay (free tier)

---

### 2. **Chart API** ✅ WORKS - FOR HISTORICAL AND INTRADAY DATA
```
GET /v8/finance/chart/AAPL?range=1mo&interval=1d&events=div,split
```

**Supports These Ranges:**
- `1d` - Last 1 day (5-minute intervals)
- `5d` - Last 5 days (1-hour intervals)  
- `1mo` - Last 1 month (1-day intervals) ✅ RECOMMENDED
- `3mo` - Last 3 months (1-day intervals)
- `6mo` - Last 6 months (1-day intervals)
- `1y` - Last 1 year (1-week intervals)
- `5y` - Last 5 years (1-week intervals)
- `10y` - Last 10 years (1-month intervals)
- `max` - All available history
- `ytd` - Year to date

**Returned Data Example (RELIANCE.NS):**
```json
{
  "meta": {
    "symbol": "RELIANCE.NS",
    "regularMarketPrice": 1346.2,
    "regularMarketTime": 1772616754,
    "dataGranularity": "5m",
    "fiftyTwoWeekHigh": 1611.8,
    "fiftyTwoWeekLow": 1114.85,
    "regularMarketVolume": 123456,
    "longName": "Reliance Industries Limited",
    "shortName": "Reliance Industries"
  },
  "timestamp": [1770215400, 1770301800, ...],
  "close": [1346.5, 1345.2, ...],
  "high": [1352.8, 1351.5, ...],
  "low": [1307.0, 1305.8, ...],
  "open": [1357.25, 1346.5, ...],
  "volume": [27963805, 26534210, ...],
  "comparisons": [
    {
      "symbol": "MSFT",
      "close": [414.19, 393.67, ...],
      "high": [419.8, 408.3, ...],
      "low": [409.24, 392.32, ...]
    }
  ]
}
```

**What to Display in UI:**
- ✅ Line Chart (close prices)
- ✅ Candlestick Chart (OHLC data)
- ✅ Volume Chart (bars)
- ✅ Price with time series
- ✅ Comparison with other stocks (2-3 comparison stocks)
- ✅ Change % from period start

---

### 3. **Market Summary API** ✅ WORKS - FOR MARKET INDICES
```
GET /v6/finance/quote/marketSummary?lang=en&region=IN
```

**Returns:**
```json
[
  {
    "symbol": "^BSESN",
    "shortName": "S&P BSE SENSEX",
    "regularMarketPrice": 79358.86,
    "regularMarketChange": -879.99,
    "regularMarketChangePercent": -1.0968,
    "regularMarketTime": "2:47PM IST"
  },
  {
    "symbol": "^NSEI",
    "shortName": "NIFTY 50",
    "regularMarketPrice": 24525.81,
    "regularMarketChange": -339.90,
    "regularMarketChangePercent": -1.3669
  }
]
```

**What to Display:**
- ✅ Dashboard banner showing BSE/NIFTY status
- ✅ Market sentiment (green/red)
- ✅ Index points and %change

---

## 📱 Implementation Strategy for InvestWise

### **Week 3: Phase 1 - Basic Implementation**

#### **Step 1: Create Market Data Service**
```javascript
// backend/src/services/marketDataService.js
Features needed:
- getQuote(symbol) - Fetch single/multiple prices
- getChart(symbol, range='1mo') - Get historical data
- getMarketSummary() - Get indices
- Cache with 5-minute TTL (or 15 min based on API)
```

#### **Step 2: Create API Endpoints**
```
GET /api/market/quote/:symbol
GET /api/market/chart/:symbol?range=1mo
GET /api/market/summary
GET /api/market/search?q=reliance
```

#### **Step 3: Frontend Components**
```
1. HoldingRow - Show current price + change%
2. HoldingDetail - Show price chart, volumes, 52-week range
3. PortfolioHeader - Show market indices (BSE, NIFTY)
4. PriceAlert - Show bid/ask and dividend info
```

---

## 📊 What Data Should We Display?

### **In Holdings List (HoldingsList.tsx):**
```
| Symbol | Company | Qty | Avg Cost | Current Price | Change % | P&L |
|--------|---------|-----|----------|---------------|----------|-----|
| RELIANCE.NS | Reliance | 10 | 1300 | 1346.50 | -0.85% | +465 |
```
- Current price (auto-refresh every 5 min)
- Change % (color-coded: green/red)
- Today's P&L

### **In Holding Detail Page:**
```
📈 RELIANCE INDUSTRIES LIMITED
Current Price: ₹1,346.50
Change: -₹11.50 (-0.85%)
52-Week: ₹1114.85 - ₹1611.80
Day Range: ₹1307.0 - ₹1352.80

Volume: 27,963,805
P/E Ratio: 21.89
Dividend Yield: 0.42%

[1-Month Price Chart]
[Candlestick Chart with Volume]
[Compare with: INFOSYS, TCS]
```

### **Portfolio Dashboard:**
```
Portfolio Performance
├─ Current Value: ₹500,000
├─ Invested: ₹450,000
├─ Gain/Loss: +₹50,000 (+11.1%)
├─ Market Status:
│  ├─ SENSEX: 79,358 (-1.10%) 🔴
│  └─ NIFTY: 24,525 (-1.37%) 🔴
```

---

## 🔄 Caching Strategy

**Finnhub API Limits**: 60 requests/minute, 500K calls/month

**Implementation:**
```javascript
// Cache Durations
const CACHE_TTL = {
  QUOTE: 5 * 60,      // 5 minutes
  CHART: 15 * 60,     // 15 minutes
  SUMMARY: 5 * 60,    // 5 minutes
  SEARCH: 1 * 60 * 60 // 1 hour
};

// Cache Key Pattern
- `market:quote:RELIANCE.NS`
- `market:chart:RELIANCE.NS:1mo`
- `market:summary:IN`
```

**When to Invalidate:**
- Quote cache: Every 5 minutes (polling)
- Chart cache: On request (user clicks chart)
- Summary: Every 5 minutes

---

## 🚀 Implementation Sequence

### **Priority 1 - Core Features**
1. ✅ Add market data service
2. ✅ Create `/api/market/quote` endpoint
3. ✅ Display current price in HoldingRow
4. ✅ Show price change % with styling

### **Priority 2 - Charts & Details**
1. Add chart service
2. Create `/api/market/chart` endpoint
3. Display price charts in HoldingDetail
4. Add candlestick/volume charts

### **Priority 3 - Extended Data**
1. Market summary in dashboard
2. Bid/Ask prices
3. Dividend information
4. 52-week high/low visualization

### **Priority 4 - Advanced Features**
1. Stock search with autocomplete
2. Portfolio performance tracking
3. Price alerts (Week 4+)
4. Real-time WebSocket updates (Week 4+)

---

## 🔗 API Reference

### **Quote API Format**
```bash
curl -X GET 'https://yfapi.net/v6/finance/quote?region=IN&lang=en&symbols=RELIANCE.NS' \
  -H 'X-API-KEY: yz8CkbTNHy6YqirJWFzVu8w714CaqqV07LpmwZLa'
```

### **Chart API Format**
```bash
curl -X GET 'https://yfapi.net/v8/finance/chart/RELIANCE.NS?range=1mo&interval=1d' \
  -H 'X-API-KEY: yz8CkbTNHy6YqirJWFzVu8w714CaqqV07LpmwZLa'
```

### **Market Summary Format**
```bash
curl -X GET 'https://yfapi.net/v6/finance/quote/marketSummary?lang=en&region=IN' \
  -H 'X-API-KEY: yz8CkbTNHy6YqirJWFzVu8w714CaqqV07LpmwZLa'
```

---

## ⚠️ Important Notes

1. **Free Tier Rate Limits**: 15-minute delayed data
2. **Symbol Format**: Use `.NS` for NSE, `.BO` for BSE stocks
3. **Caching is Critical**: Don't fetch on every render
4. **Error Handling**: Gracefully handle API failures
5. **Testing**: Use Redis for cache testing

---

## 📋 Next Steps

1. Create `marketDataService.js` with all three APIs
2. Implement Redis caching layer
3. Add routes to backend (`/api/market/*`)
4. Test with cURL first
5. Integrate into React components
6. Add real-time polling (5-minute intervals)

