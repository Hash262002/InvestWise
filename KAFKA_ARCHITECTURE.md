# InvestWise - Kafka Architecture & Message Flow

## 📋 Table of Contents
1. [Overview](#1-overview)
2. [Kafka Topics](#2-kafka-topics)
3. [Complete Message Flow](#3-complete-message-flow)
4. [Message Schemas](#4-message-schemas)
5. [Services Summary](#5-services-summary)
6. [Deduplication & Rate Limiting](#6-deduplication--rate-limiting)

---

## 1. Overview

InvestWise uses Apache Kafka for event-driven communication between microservices. The architecture supports:
- Real-time portfolio analysis triggered by user actions
- AI-powered risk assessment with alert thresholds
- Continuous price monitoring with smart notifications
- Deduplication to prevent notification spam

---

## 2. Kafka Topics

```
┌─────────────────────┬──────────────────┬──────────────────────┬──────────────────────────┐
│ TOPIC               │ PRODUCER         │ CONSUMER(S)          │ TRIGGER                  │
├─────────────────────┼──────────────────┼──────────────────────┼──────────────────────────┤
│ portfolio.analyze   │ Backend          │ AI Service           │ User clicks "Analyze"    │
│                     │                  │                      │ OR Portfolio updated     │
├─────────────────────┼──────────────────┼──────────────────────┼──────────────────────────┤
│ analysis.result     │ AI Service       │ Backend              │ AI finishes analysis     │
│                     │                  │ Alert Service        │ & saves to MongoDB       │
├─────────────────────┼──────────────────┼──────────────────────┼──────────────────────────┤
│ price.updates       │ Price Feed       │ Alert Service        │ Polling external APIs    │
│                     │ (Worker/Cron)    │                      │ (every 30-60 sec)        │
├─────────────────────┼──────────────────┼──────────────────────┼──────────────────────────┤
│ alerts.notification │ Alert Service    │ Backend              │ Price breaches AI        │
│                     │                  │ (Notification)       │ threshold (deduplicated) │
└─────────────────────┴──────────────────┴──────────────────────┴──────────────────────────┘
```

---

## 3. Complete Message Flow

### Flow 1: Portfolio Analysis (User-Triggered)

```
     User clicks "Analyze Portfolio" OR Updates Portfolio (Add/Remove/Edit Holding)
                                   │
                                   ▼
     ┌──────────────────────────────────────────────────────────────────┐
     │                        BACKEND SERVICE                           │
     │  • Validates request                                             │
     │  • Gathers all holdings with current data                       │
     │  • Produces Kafka message                                        │
     └────────────────────────────────┬─────────────────────────────────┘
                                      │ PRODUCE
                                      ▼
                       ┌───────────────────────────────┐
                       │   TOPIC: portfolio.analyze    │
                       └───────────────────────────────┘
                                      │ CONSUME
                                      ▼
     ┌──────────────────────────────────────────────────────────────────┐
     │                         AI SERVICE                               │
     │  ────────────────────────────────────────────────────────────   │
     │  1. Consume holdings data                                        │
     │  2. Fetch current market conditions                             │
     │  3. QUANTITATIVE: Calculate metrics (concentration, volatility) │
     │  4. QUALITATIVE: Call Ollama LLM for insights per holding       │
     │  5. Generate alert thresholds (sellBelow, sellAbove, buyBelow)  │
     │  6. SAVE full analysis to MongoDB (PortfolioAnalysis)           │
     │  7. Produce completion message with full details                │
     └────────────────────────────────┬─────────────────────────────────┘
                                      │ PRODUCE
                                      ▼
                       ┌───────────────────────────────┐
                       │   TOPIC: analysis.result      │
                       └───────────────────────────────┘
                                      │ CONSUME
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
     ┌──────────────────────────┐       ┌──────────────────────────┐
     │     BACKEND SERVICE      │       │     ALERT SERVICE        │
     │  ──────────────────────  │       │  ──────────────────────  │
     │  1. Update each Holding  │       │  1. Extract alert        │
     │     with riskScore,      │       │     thresholds           │
     │     riskLevel            │       │  2. Cache in Redis:      │
     │  2. Create Notification  │       │     threshold:{userId}:  │
     │     record in DB         │       │     {symbol}             │
     │  3. Push via WebSocket:  │       │                          │
     │     "Analysis Ready!"    │       │                          │
     └──────────────────────────┘       └──────────────────────────┘
```

### Flow 2: Price Monitoring & Alert Triggering

```
     ┌──────────────────────────────────────────────────────────────────┐
     │           PRICE FEED WORKER (Polling every 30-60 sec)           │
     │  ────────────────────────────────────────────────────────────   │
     │  1. Get all unique symbols being tracked (from Redis)           │
     │  2. Fetch LIVE prices from external APIs:                       │
     │     • Yahoo Finance API (stocks)                                │
     │     • NSE/BSE APIs                                              │
     │     • MFAPI.in (mutual funds)                                   │
     │  3. Produce price update messages                               │
     └────────────────────────────────┬─────────────────────────────────┘
                                      │ PRODUCE
                                      ▼
                       ┌───────────────────────────────┐
                       │    TOPIC: price.updates       │
                       └───────────────────────────────┘
                                      │ CONSUME
                                      ▼
     ┌──────────────────────────────────────────────────────────────────┐
     │                       ALERT SERVICE                              │
     │  ────────────────────────────────────────────────────────────   │
     │  1. Receive price update for symbol                             │
     │                                                                  │
     │  2. Fetch AI thresholds from Redis:                             │
     │     threshold:{userId}:{symbol} → { sellBelow, sellAbove, ... } │
     │                                                                  │
     │  3. COMPARE current price with AI thresholds:                   │
     │     ┌────────────────────────────────────────────────────────┐  │
     │     │ Example: AI said "sellBelow: 180" for ONGC             │  │
     │     │ Current price: ₹175                                    │  │
     │     │ 175 < 180 → THRESHOLD BREACHED!                        │  │
     │     └────────────────────────────────────────────────────────┘  │
     │                                                                  │
     │  4. CHECK DEDUPLICATION (Redis):                                │
     │     Key: alert:sent:{userId}:{symbol}:{alertType}:{date}        │
     │     ┌────────────────────────────────────────────────────────┐  │
     │     │ IF key exists     → SKIP (already notified today)      │  │
     │     │ IF key NOT exists → Continue to step 5                 │  │
     │     └────────────────────────────────────────────────────────┘  │
     │                                                                  │
     │  5. CHECK RATE LIMIT (Redis):                                   │
     │     Key: alert:count:{userId}:{date}                            │
     │     ┌────────────────────────────────────────────────────────┐  │
     │     │ IF count >= 10   → SKIP (max notifications reached)    │  │
     │     │ IF count < 10    → Continue to step 6                  │  │
     │     └────────────────────────────────────────────────────────┘  │
     │                                                                  │
     │  6. PRODUCE notification message                                │
     │  7. SET dedup key with 24hr TTL                                 │
     │  8. INCREMENT daily count                                       │
     │                                                                  │
     └────────────────────────────────┬─────────────────────────────────┘
                                      │ PRODUCE (only if all checks pass)
                                      ▼
                       ┌───────────────────────────────┐
                       │  TOPIC: alerts.notification   │
                       └───────────────────────────────┘
                                      │ CONSUME
                                      ▼
     ┌──────────────────────────────────────────────────────────────────┐
     │              BACKEND SERVICE (Notification Handler)              │
     │  ────────────────────────────────────────────────────────────   │
     │  1. Store notification in MongoDB (Notifications collection)    │
     │  2. Push to user via WebSocket (real-time toast/bell)          │
     │  3. Optionally queue email (batched, not immediate)            │
     └──────────────────────────────────────────────────────────────────┘
```

---

## 4. Message Schemas

### 4.1 `portfolio.analyze`

**Producer:** Backend  
**Consumer:** AI Service  
**Trigger:** User clicks "Analyze" OR Portfolio updated

```json
{
  "eventId": "evt_abc123",
  "eventType": "ANALYZE_REQUESTED",
  "timestamp": "2026-02-08T10:30:00Z",
  "trigger": "USER_CLICK | PORTFOLIO_UPDATED",
  "userId": "user_123",
  "portfolioId": "portfolio_456",
  "holdings": [
    {
      "holdingId": "hold_001",
      "symbol": "ONGC.NS",
      "name": "Oil and Natural Gas Corporation",
      "type": "STOCK",
      "sector": "Energy",
      "quantity": 50,
      "avgBuyPrice": 195,
      "currentPrice": 185
    },
    {
      "holdingId": "hold_002",
      "symbol": "120503",
      "name": "Axis Bluechip Fund - Direct Growth",
      "type": "MUTUALFUND",
      "sector": "Diversified",
      "quantity": 500,
      "avgBuyPrice": 45.50,
      "currentPrice": 48.20
    }
  ]
}
```

### 4.2 `analysis.result`

**Producer:** AI Service  
**Consumer:** Backend, Alert Service  
**Trigger:** AI completes analysis and saves to MongoDB

```json
{
  "eventId": "evt_def456",
  "eventType": "ANALYSIS_COMPLETED",
  "timestamp": "2026-02-08T10:32:00Z",
  "userId": "user_123",
  "portfolioId": "portfolio_456",
  "analysisId": "analysis_789",
  
  "overallAnalysis": {
    "overallRiskScore": 45,
    "riskLevel": "MEDIUM",
    "totalValue": 185000,
    "totalInvested": 175000,
    "overallPnL": 5.71,
    "diversificationScore": 62,
    "sectorConcentration": {
      "Energy": 35,
      "Banking": 25,
      "IT": 20,
      "Diversified (MF)": 20
    },
    "keyRisks": [
      "High concentration in Energy sector (35%)",
      "Single stock ONGC represents 25% of portfolio"
    ],
    "topRecommendations": [
      "Reduce ONGC position to below 15%",
      "Add IT sector exposure for balance"
    ]
  },

  "holdingsAnalysis": [
    {
      "holdingId": "hold_001",
      "symbol": "ONGC.NS",
      "name": "Oil and Natural Gas Corporation",
      "type": "STOCK",
      "sector": "Energy",
      "quantity": 50,
      "avgBuyPrice": 195,
      "currentPrice": 185,
      "investedValue": 9750,
      "currentValue": 9250,
      "pnl": -5.13,
      "portfolioWeight": 25.0,
      
      "riskScore": 72,
      "riskLevel": "HIGH",
      "insight": "High exposure to oil price volatility. Energy transition poses long-term headwind. Currently trading below buy price indicating downward momentum.",
      
      "alertThresholds": {
        "sellBelow": {
          "price": 180,
          "reason": "Stop-loss to limit further losses",
          "severity": "HIGH"
        },
        "sellAbove": {
          "price": 220,
          "reason": "Take profit at resistance level",
          "severity": "MEDIUM"
        },
        "buyBelow": null
      },
      
      "recommendation": {
        "action": "REDUCE",
        "message": "Reduce position to below 15% of portfolio",
        "priority": "HIGH"
      }
    },
    {
      "holdingId": "hold_002",
      "symbol": "HDFCBANK.NS",
      "name": "HDFC Bank Ltd",
      "type": "STOCK",
      "sector": "Banking",
      "quantity": 30,
      "avgBuyPrice": 1600,
      "currentPrice": 1720,
      "investedValue": 48000,
      "currentValue": 51600,
      "pnl": 7.5,
      "portfolioWeight": 27.9,
      
      "riskScore": 28,
      "riskLevel": "LOW",
      "insight": "Strong fundamentals, sector leader with consistent growth. Well-diversified loan book. Rising interest rates favoring banking sector.",
      
      "alertThresholds": {
        "sellBelow": {
          "price": 1500,
          "reason": "Below key support level indicates trend reversal",
          "severity": "MEDIUM"
        },
        "sellAbove": null,
        "buyBelow": {
          "price": 1600,
          "reason": "Good accumulation zone near your average price",
          "severity": "LOW"
        }
      },
      
      "recommendation": {
        "action": "HOLD",
        "message": "Continue holding, strong performer",
        "priority": "LOW"
      }
    },
    {
      "holdingId": "hold_003",
      "symbol": "INFY.NS",
      "name": "Infosys Ltd",
      "type": "STOCK",
      "sector": "IT",
      "quantity": 25,
      "avgBuyPrice": 1450,
      "currentPrice": 1520,
      "investedValue": 36250,
      "currentValue": 38000,
      "pnl": 4.83,
      "portfolioWeight": 20.5,
      
      "riskScore": 35,
      "riskLevel": "LOW",
      "insight": "Stable large-cap IT with global diversification. Strong order book and cash position. Rupee depreciation provides tailwind for export revenues.",
      
      "alertThresholds": {
        "sellBelow": {
          "price": 1350,
          "reason": "Below 200-day moving average support",
          "severity": "MEDIUM"
        },
        "sellAbove": {
          "price": 1800,
          "reason": "Historical resistance zone - book partial profits",
          "severity": "LOW"
        },
        "buyBelow": {
          "price": 1400,
          "reason": "Attractive entry point near support",
          "severity": "LOW"
        }
      },
      
      "recommendation": {
        "action": "HOLD",
        "message": "Maintain position, consider adding on dips",
        "priority": "LOW"
      }
    },
    {
      "holdingId": "hold_004",
      "symbol": "120503",
      "name": "Axis Bluechip Fund - Direct Growth",
      "type": "MUTUALFUND",
      "sector": "Diversified",
      "quantity": 500,
      "avgBuyPrice": 45.50,
      "currentPrice": 48.20,
      "investedValue": 22750,
      "currentValue": 24100,
      "pnl": 5.93,
      "portfolioWeight": 13.0,
      
      "riskScore": 22,
      "riskLevel": "LOW",
      "insight": "Well-diversified large-cap fund with consistent track record. Provides automatic diversification across top companies. Low expense ratio (0.5%).",
      
      "alertThresholds": {
        "sellBelow": {
          "price": 42,
          "reason": "NAV drop >10% indicates market correction",
          "severity": "LOW"
        },
        "sellAbove": null,
        "buyBelow": {
          "price": 46,
          "reason": "Good SIP accumulation zone",
          "severity": "LOW"
        }
      },
      
      "recommendation": {
        "action": "ACCUMULATE",
        "message": "Continue SIP, increase allocation for diversification",
        "priority": "MEDIUM"
      }
    },
    {
      "holdingId": "hold_005",
      "symbol": "119551",
      "name": "Parag Parikh Flexi Cap Fund - Direct Growth",
      "type": "MUTUALFUND",
      "sector": "Flexi Cap",
      "quantity": 300,
      "avgBuyPrice": 52.00,
      "currentPrice": 56.80,
      "investedValue": 15600,
      "currentValue": 17040,
      "pnl": 9.23,
      "portfolioWeight": 9.2,
      
      "riskScore": 30,
      "riskLevel": "LOW",
      "insight": "Unique fund with international diversification (Alphabet, Microsoft holdings). Value-oriented approach with long-term track record. Provides natural hedge against rupee depreciation.",
      
      "alertThresholds": {
        "sellBelow": {
          "price": 48,
          "reason": "Significant NAV correction - review fund performance",
          "severity": "MEDIUM"
        },
        "sellAbove": null,
        "buyBelow": {
          "price": 54,
          "reason": "Accumulate more at current levels",
          "severity": "LOW"
        }
      },
      
      "recommendation": {
        "action": "ACCUMULATE",
        "message": "Excellent fund for long-term, increase SIP amount",
        "priority": "MEDIUM"
      }
    }
  ],

  "sectorAnalysis": [
    {
      "sector": "Energy",
      "weight": 25.0,
      "avgRiskScore": 72,
      "holdings": ["ONGC.NS"],
      "insight": "Overweight in volatile sector. Consider reducing to 15%.",
      "marketOutlook": "CAUTIOUS"
    },
    {
      "sector": "Banking",
      "weight": 27.9,
      "avgRiskScore": 28,
      "holdings": ["HDFCBANK.NS"],
      "insight": "Well-positioned with quality stock. Sector benefiting from rate cycle.",
      "marketOutlook": "POSITIVE"
    },
    {
      "sector": "IT",
      "weight": 20.5,
      "avgRiskScore": 35,
      "holdings": ["INFY.NS"],
      "insight": "Good defensive allocation. Global tech spending remains strong.",
      "marketOutlook": "NEUTRAL"
    },
    {
      "sector": "Diversified (MF)",
      "weight": 22.2,
      "avgRiskScore": 26,
      "holdings": ["120503", "119551"],
      "insight": "Excellent diversification via mutual funds. Continue SIPs.",
      "marketOutlook": "POSITIVE"
    }
  ],

  "actionSummary": {
    "immediateActions": [
      {
        "priority": "HIGH",
        "action": "REDUCE",
        "symbol": "ONGC.NS",
        "message": "Sell 20 shares to bring weight below 15%"
      }
    ],
    "watchlist": [
      {
        "symbol": "HDFCBANK.NS",
        "condition": "If drops below ₹1500",
        "action": "Review position"
      },
      {
        "symbol": "INFY.NS",
        "condition": "If drops below ₹1400",
        "action": "Consider adding more"
      }
    ],
    "sipRecommendations": [
      {
        "symbol": "119551",
        "name": "Parag Parikh Flexi Cap Fund",
        "currentSIP": null,
        "recommendedSIP": 5000,
        "reason": "Best risk-adjusted returns in portfolio"
      }
    ]
  }
}
```

### 4.3 `price.updates`

**Producer:** Price Feed Worker  
**Consumer:** Alert Service  
**Trigger:** Every 30-60 seconds (polling)

```json
{
  "eventId": "evt_price_001",
  "timestamp": "2026-02-08T14:15:00Z",
  "symbol": "ONGC.NS",
  "price": 175,
  "previousClose": 185,
  "changePercent": -5.4,
  "volume": 1500000
}
```

### 4.4 `alerts.notification`

**Producer:** Alert Service  
**Consumer:** Backend (Notification Handler)  
**Trigger:** Price breaches AI threshold (after deduplication checks)

```json
{
  "eventId": "evt_alert_001",
  "timestamp": "2026-02-08T14:15:30Z",
  "userId": "user_123",
  "portfolioId": "portfolio_456",
  "symbol": "ONGC.NS",
  "alertType": "SELL_BELOW",
  "severity": "HIGH",
  "currentPrice": 175,
  "threshold": {
    "type": "sellBelow",
    "value": 180
  },
  "aiReason": "Stop-loss to limit further losses",
  "message": "🔴 ONGC.NS dropped below ₹180 (AI threshold). Current: ₹175"
}
```

---

## 5. Services Summary

| Service | Technology | Responsibilities |
|---------|------------|------------------|
| **Backend** | Node.js + Express | REST API, Auth, Kafka producer (`portfolio.analyze`), Kafka consumer (`analysis.result`, `alerts.notification`), WebSocket server |
| **AI Service** | Python + FastAPI | Kafka consumer (`portfolio.analyze`), Analysis engine, Ollama LLM calls, Kafka producer (`analysis.result`), MongoDB write |
| **Alert Service** | Node.js | Kafka consumer (`analysis.result`, `price.updates`), Threshold caching (Redis), Deduplication logic, Kafka producer (`alerts.notification`) |
| **Price Feed Worker** | Node.js (Cron) | External API polling (Yahoo Finance, MFAPI.in), Kafka producer (`price.updates`) |

### Consumer Groups

| Group ID | Service | Consumes From |
|----------|---------|---------------|
| `ai-service-group` | AI Service | `portfolio.analyze` |
| `backend-group` | Backend | `analysis.result`, `alerts.notification` |
| `alert-service-group` | Alert Service | `analysis.result`, `price.updates` |

---

## 6. Deduplication & Rate Limiting

### Redis Keys for Deduplication

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION DEDUPLICATION (Redis)                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

1. DEDUP KEY (prevents same alert being sent twice in a day):
   ─────────────────────────────────────────────────────────
   Key:    alert:sent:{userId}:{symbol}:{alertType}:{date}
   Value:  { sentAt, price, threshold }
   TTL:    24 hours (86400 seconds)
   
   Example: alert:sent:user_123:ONGC.NS:sellBelow:2026-02-08


2. RATE LIMIT KEY (max 10 notifications per user per day):
   ─────────────────────────────────────────────────────────
   Key:    alert:count:{userId}:{date}
   Value:  Integer (incremented on each notification)
   TTL:    24 hours
   
   Example: alert:count:user_123:2026-02-08


3. THRESHOLD CACHE (fast lookup during price checks):
   ─────────────────────────────────────────────────────────
   Key:    threshold:{userId}:{symbol}
   Value:  { sellBelow, sellAbove, buyBelow, analysisId }
   TTL:    7 days (until next analysis)
   
   Example: threshold:user_123:ONGC.NS
```

### Alert Service Logic Flow

```
WHEN price update received for symbol:
│
├── 1. Get all users tracking this symbol from Redis
│
├── 2. For each user:
│   │
│   ├── Fetch threshold from Redis: threshold:{userId}:{symbol}
│   │
│   ├── Compare current price with thresholds:
│   │   ├── IF price < sellBelow → alertType = "SELL_BELOW"
│   │   ├── IF price > sellAbove → alertType = "SELL_ABOVE"
│   │   └── IF price < buyBelow  → alertType = "BUY_BELOW"
│   │
│   ├── IF threshold breached:
│   │   │
│   │   ├── Check dedup: EXISTS alert:sent:{userId}:{symbol}:{alertType}:{date}
│   │   │   └── IF exists → SKIP (already notified)
│   │   │
│   │   ├── Check rate limit: GET alert:count:{userId}:{date}
│   │   │   └── IF >= 10 → SKIP (max reached)
│   │   │
│   │   ├── PRODUCE to alerts.notification topic
│   │   │
│   │   ├── SET alert:sent:{userId}:{symbol}:{alertType}:{date} with 24hr TTL
│   │   │
│   │   └── INCR alert:count:{userId}:{date}
│   │
│   └── ELSE: No action needed
│
└── Done
```

---

## 7. MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `users` | User accounts, 2FA, preferences |
| `portfolios` | Portfolio metadata |
| `holdings` | Individual holdings (updated with riskScore, riskLevel after analysis) |
| `portfolioAnalyses` | Full AI analysis results (historical) |
| `notifications` | User notifications (with read status) |
| `auditLogs` | Request logging |

---

## 8. External APIs Used

| API | Purpose | Rate Limit |
|-----|---------|------------|
| Yahoo Finance | Stock prices (NSE/BSE) | ~2000/hour |
| MFAPI.in | Mutual fund NAVs | Unlimited (FREE) |
| NSE/BSE APIs | Indian stock data | Varies |

---

## Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              4 KAFKA TOPICS                                              │
├─────────────────────┬──────────────────┬──────────────────────┬─────────────────────────┤
│ portfolio.analyze   │ Backend          │ AI Service           │ User action            │
│ analysis.result     │ AI Service       │ Backend, Alert Svc   │ Analysis done          │
│ price.updates       │ Price Worker     │ Alert Service        │ Every 30-60 sec        │
│ alerts.notification │ Alert Service    │ Backend              │ Threshold breached     │
└─────────────────────┴──────────────────┴──────────────────────┴─────────────────────────┘

DEDUPLICATION: Redis keys with 24hr TTL
RATE LIMIT: Max 10 notifications per user per day
```
