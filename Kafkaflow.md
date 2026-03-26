FINAL KAFKA ARCHITECTURE (4 Topics - No News Digest)
  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           INVESTWISE - FINAL KAFKA ARCHITECTURE                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘

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
└─────────────────────┴──────────────────┴──────────────────────┴──────────────────────────┘   COMPLETE MESSAGE FLOW
  ═══════════════════════════════════════════════════════════════════════════════════════════
FLOW 1: PORTFOLIO ANALYSIS (User-Triggered)
═══════════════════════════════════════════════════════════════════════════════════════════

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


═══════════════════════════════════════════════════════════════════════════════════════════
FLOW 2: PRICE MONITORING & ALERT TRIGGERING
═══════════════════════════════════════════════════════════════════════════════════════════

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
     └──────────────────────────────────────────────────────────────────┘     MESSAGE SCHEMAS
 1. profolio.analyze  {
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
}   2. Analysis.result  {
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
      "insight": "High exposure to oil price volatility. Energy transition poses long-term headwind.",
      
      "alertThresholds": {
        "sellBelow": { "price": 180, "reason": "Stop-loss to limit losses", "severity": "HIGH" },
        "sellAbove": { "price": 220, "reason": "Take profit at resistance", "severity": "MEDIUM" },
        "buyBelow": null
      },
      
      "recommendation": { "action": "REDUCE", "message": "Reduce to below 15%", "priority": "HIGH" }
    },
    {
      "holdingId": "hold_002",
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
      "insight": "Well-diversified large-cap fund with consistent track record.",
      
      "alertThresholds": {
        "sellBelow": { "price": 42, "reason": "NAV drop >10%", "severity": "LOW" },
        "sellAbove": null,
        "buyBelow": { "price": 46, "reason": "Good SIP zone", "severity": "LOW" }
      },
      
      "recommendation": { "action": "ACCUMULATE", "message": "Continue SIP", "priority": "MEDIUM" }
    }
  ],

  "actionSummary": {
    "immediateActions": [
      { "priority": "HIGH", "action": "REDUCE", "symbol": "ONGC.NS", "message": "Sell 20 shares" }
    ],
    "watchlist": [
      { "symbol": "HDFCBANK.NS", "condition": "If drops below ₹1500", "action": "Review" }
    ]
  }
}   


3. Price.updates   {
  "eventId": "evt_price_001",
  "timestamp": "2026-02-08T14:15:00Z",
  "symbol": "ONGC.NS",
  "price": 175,
  "previousClose": 185,
  "changePercent": -5.4,
  "volume": 1500000
}   


4. alerts.notification   {
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
}   Mongodb Collection   
Collection	Purpose
users	User accounts, 2FA, preferences
portfolios	Portfolio metadata
holdings	Individual holdings (updated with riskScore, riskLevel after analysis)
portfolioAnalyses	Full AI analysis results (historical)
notifications	User notifications (with read status)
auditLogs	Request logging

SERVICES SUMMARY
  
Service	Technology	Responsibilities
Backend	Node.js + Express	REST API, Auth, Kafka producer (portfolio.analyze), Kafka consumer (analysis.result, alerts.notification), WebSocket server
AI Service	Python + FastAPI	Kafka consumer (portfolio.analyze), Analysis engine, Ollama LLM calls, Kafka producer (analysis.result), MongoDB write
Alert Service	Node.js	Kafka consumer (analysis.result, price.updates), Threshold caching (Redis), Deduplication logic, Kafka producer (alerts.notification)
Price Feed Worker	Node.js (Cron)	External API polling (Yahoo, MFAPI), Kafka producer (price.updates)


SUMMARY
  ┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              4 KAFKA TOPICS                                              │
├─────────────────────┬──────────────────┬──────────────────────┬─────────────────────────┤
│ portfolio.analyze   │ Backend          │ AI Service           │ User action            │
│ analysis.result     │ AI Service       │ Backend, Alert Svc   │ Analysis done          │
│ price.updates       │ Price Worker     │ Alert Service        │ Every 30-60 sec        │
│ alerts.notification │ Alert Service    │ Backend              │ Threshold breached     │
└─────────────────────┴──────────────────┴──────────────────────┴─────────────────────────┘

DEDUPLICATION: Redis keys with 24hr TTL (max 10 notifications/user/day)
