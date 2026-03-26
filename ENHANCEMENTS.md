# InvestWise - Enhanced Features

## 📋 Table of Contents
1. [Two-Factor Authentication (2FA)](#1-two-factor-authentication-2fa)
2. [Rate Limiting & API Security](#2-rate-limiting--api-security)
3. [Data Encryption](#3-data-encryption)
4. [Real-Time Price Alerts](#4-real-time-price-alerts)
5. [Daily Morning News Digest](#5-daily-morning-news-digest)
6. [AI Architecture (Simplified)](#6-ai-architecture-simplified)

---

## 1. Two-Factor Authentication (2FA)

### 1.1 Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          2FA AUTHENTICATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
     │   Login      │────►│  Enter 2FA   │────►│   Access     │
     │   (email/pw) │     │   Code       │     │   Granted    │
     └──────────────┘     └──────────────┘     └──────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │  TOTP    │     │  Email   │     │  Backup  │
        │ (Google  │     │  OTP     │     │  Codes   │
        │  Auth)   │     │          │     │          │
        └──────────┘     └──────────┘     └──────────┘
```

### 1.2 2FA Methods

| Method | Library | Cost | Status |
|--------|---------|------|--------|
| **TOTP (Authenticator App)** | speakeasy | FREE | Primary |
| **Email OTP** | NodeMailer + Gmail | FREE | Backup |
| **Backup Codes** | crypto | FREE | Recovery |

### 1.3 Setup Flow UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENABLE 2FA PAGE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     🔐 Enable Two-Factor Authentication                                     │
│                                                                              │
│     1. Scan this QR code with your authenticator app:                       │
│                                                                              │
│        ┌─────────────────────┐                                              │
│        │  █▀▀▀█ █ █ █▀▀▀█   │     📱 Supported Apps:                       │
│        │  █   █ ▀▀▀ █   █   │     • Google Authenticator                    │
│        │  █▀▀▀█ █▀█ █▀▀▀█   │     • Microsoft Authenticator                │
│        │  ▄▄▄▄▄ █ █ ▄▄▄▄▄   │     • Authy                                   │
│        │  █▀▀▀█ ▀▀▀ █▀▀▀█   │                                              │
│        └─────────────────────┘                                              │
│                                                                              │
│     2. Enter the 6-digit code:                                              │
│        ┌────┬────┬────┬────┬────┬────┐                                     │
│        │  4 │  7 │  2 │  9 │  1 │  5 │                                     │
│        └────┴────┴────┴────┴────┴────┘                                     │
│                                                                              │
│        ┌─────────────────────────────────────────────────────────┐          │
│        │                    Verify & Enable                       │          │
│        └─────────────────────────────────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Backup Codes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKUP CODES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     🔑 Save Your Backup Codes                                               │
│                                                                              │
│     ┌─────────────────────────────────────────────────────────────┐         │
│     │  1. ABC12-DEF34      5. MNO90-PQR12                         │         │
│     │  2. GHI56-JKL78      6. STU34-VWX56                         │         │
│     │  3. YZA78-BCD90      7. EFG12-HIJ34                         │         │
│     │  4. KLM56-NOP78      8. QRS90-TUV12                         │         │
│     └─────────────────────────────────────────────────────────────┘         │
│                                                                              │
│     ⚠️  Each code can only be used once.                                    │
│                                                                              │
│     [Download as TXT]  [Copy All]  [Print]                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rate Limiting & API Security

### 2.1 Rate Limiting Tiers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RATE LIMITING TIERS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint Type          │ Rate Limit           │ Window    │ Penalty
───────────────────────┼──────────────────────┼───────────┼─────────────────
Authentication         │ 5 requests           │ 15 min    │ 30 min block
  /auth/login          │                      │           │
  /auth/register       │                      │           │
───────────────────────┼──────────────────────┼───────────┼─────────────────
2FA Verification       │ 3 attempts           │ 5 min     │ 15 min block
  /auth/verify-2fa     │                      │           │
───────────────────────┼──────────────────────┼───────────┼─────────────────
General API            │ 100 requests         │ 1 min     │ 1 min wait
  /api/*               │                      │           │
───────────────────────┼──────────────────────┼───────────┼─────────────────
Search APIs            │ 30 requests          │ 1 min     │ 1 min wait
  /api/market/search   │                      │           │
───────────────────────┼──────────────────────┼───────────┼─────────────────
AI Analysis            │ 5 requests           │ 1 hour    │ Wait for window
  /api/ai/analyze      │                      │           │
```

### 2.2 Security Headers

```typescript
// Applied via Helmet.js
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": "default-src 'self'",
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "95",
  "X-RateLimit-Reset": "1706345678"
}
```

### 2.3 IP Security

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          IP SECURITY RULES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. AUTO-BLOCK
   • Block IP after 10 failed login attempts
   • Block duration: 24 hours
   • Stored in Redis for fast lookup

2. DEVICE TRACKING
   • Log unique devices per user
   • Alert on new device login
   • "New login from Chrome on Windows - Was this you?"

3. AUDIT LOGGING
   • All requests logged with:
     - Request ID, User ID, IP
     - Endpoint, Method, Status Code
     - Response Time
   • Retention: 90 days
```

---

## 3. Data Encryption

### 3.1 Encryption Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENCRYPTION LAYERS                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: TRANSPORT (HTTPS/TLS)                                             │
│  • All API communication over HTTPS                                         │
│  • TLS 1.3 minimum                                                          │
│  • HSTS enabled                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: APPLICATION (Field-Level Encryption)                              │
│  • 2FA secrets: AES-256-GCM                                                 │
│  • Backup codes: AES-256-GCM + SHA-256 hash                                │
│  • Sensitive metadata: AES-256-GCM                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: PASSWORD HASHING                                                  │
│  • Algorithm: bcrypt                                                        │
│  • Cost factor: 12                                                          │
│  • Automatic salt generation                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 What Gets Encrypted

| Data | Method | Algorithm |
|------|--------|-----------|
| Passwords | Hashing | bcrypt (cost 12) |
| 2FA Secret | Symmetric | AES-256-GCM |
| Backup Codes | Symmetric + Hash | AES-256-GCM + SHA-256 |
| JWT Tokens | Signing | HS256 |
| Refresh Tokens | Hashing | SHA-256 |

---

## 4. Real-Time Price Alerts

### 4.1 Alert Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME ALERTS ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────────┐
                           │   Price Feed        │
                           │   (Every 30 sec)    │
                           │   during market hrs │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │   Kafka Topic:      │
                           │   price.updates     │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │   Alert Service     │
                           │   (Check triggers)  │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │   Redis             │
                           │   (Active Alerts)   │
                           └──────────┬──────────┘
                                      │
                        ┌─────────────┼─────────────┐
                        │             │             │
                        ▼             ▼             ▼
                   ┌─────────┐ ┌─────────┐ ┌─────────┐
                   │WebSocket│ │  Email  │ │Database │
                   │(In-App) │ │         │ │(Store)  │
                   └─────────┘ └─────────┘ └─────────┘
```

### 4.2 Alert Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ALERT TYPES                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📈 PRICE ALERTS                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  1. Price Above                                                              │
│     "Alert me when TATAMOTORS crosses ₹800"                                 │
│                                                                              │
│  2. Price Below                                                              │
│     "Alert me when RELIANCE falls below ₹2,400"                             │
│                                                                              │
│  3. Percentage Change                                                        │
│     "Alert me when any holding moves ±5% in a day"                          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  📊 PORTFOLIO ALERTS                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  1. Portfolio Value Change                                                   │
│     "Alert me when portfolio drops by ₹10,000 in a day"                     │
│                                                                              │
│  2. Single Stock Concentration                                               │
│     "Alert me if any holding exceeds 30% of portfolio"                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Create Alert UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CREATE PRICE ALERT                         ✕       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Stock/Asset:                                                                │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │ 🔍 TATAMOTORS.NS - Tata Motors Limited           ₹765.50      │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│  Alert Condition:                                                            │
│  ┌─────────────────────┐  ┌────────────────────────────────────┐            │
│  │ Price goes above ▼  │  │ ₹ 800.00                          │            │
│  └─────────────────────┘  └────────────────────────────────────┘            │
│                                                                              │
│  Notify me via:                                                              │
│  ☑️ In-App Notification                                                     │
│  ☑️ Email                                                                    │
│                                                                              │
│  Alert Frequency:                                                            │
│  ● Once (disable after triggered)                                           │
│  ○ Every time condition is met                                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       Create Alert                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Notifications Center

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔔 Notifications                                      [Mark all as read]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TODAY                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔴 NEW                                                   10:30 AM   │    │
│  │ ⚠️ Price Alert Triggered                                            │    │
│  │ TATAMOTORS.NS crossed ₹800! Current price: ₹805.20                 │    │
│  │ [View Stock] [Dismiss]                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔴 NEW                                                   9:15 AM    │    │
│  │ 📰 Daily News Digest                                                │    │
│  │ 3 news articles about your holdings                                 │    │
│  │ [Read Digest]                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  YESTERDAY                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                          4:00 PM    │    │
│  │ 📊 Analysis Complete                                                │    │
│  │ Your portfolio analysis is ready. Overall risk: Medium             │    │
│  │ [View Analysis]                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Daily Morning News Digest

### 5.1 News Digest Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DAILY NEWS DIGEST SYSTEM                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │   CRON JOB                  │
                    │   Every day at 6:00 AM IST  │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │   News Aggregator Service   │
                    │                             │
                    │   1. Get all unique symbols │
                    │   2. Fetch news (RSS feeds) │
                    │   3. Deduplicate            │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │   AI Sentiment Analysis     │
                    │   (Ollama + Few-Shot)       │
                    │                             │
                    │   • Sentiment score         │
                    │   • Summary (1-2 lines)     │
                    │   • Impact assessment       │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌─────────────────────┐      ┌─────────────────────┐
        │   Per-User Digest   │      │   Store in DB       │
        │   (Filter by        │      │   (for later view)  │
        │    user's holdings) │      │                     │
        └──────────┬──────────┘      └─────────────────────┘
                   │
              ┌────┴────┐
              │         │
              ▼         ▼
     ┌──────────────┐  ┌──────────────┐
     │  Email       │  │  In-App      │
     │  (7:00 AM)   │  │  Notification│
     └──────────────┘  └──────────────┘
```

### 5.2 Free News Sources

| Source | URL | Type |
|--------|-----|------|
| Google News | news.google.com/rss | RSS |
| Economic Times | economictimes.indiatimes.com/rss.cms | RSS |
| Moneycontrol | moneycontrol.com/rss | RSS |

### 5.3 Email Digest Template

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Subject: 📰 Your Daily Market Digest - Jan 27, 2026                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🌅 Good Morning, Arjun!                                                    │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  📊 PORTFOLIO AT A GLANCE                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Total Value: ₹58,055                                                       │
│  Yesterday: +₹1,240 (+2.18%) 🟢                                            │
│  Top Gainer: TATAMOTORS.NS +4.5%                                           │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  📰 NEWS FOR YOUR HOLDINGS                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  🏷️ TATAMOTORS.NS                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🟢 POSITIVE                                                          │    │
│  │ "Tata Motors EV sales surge 45% in Q3"                              │    │
│  │ Source: Economic Times • 2 hours ago                                │    │
│  │                                                                      │    │
│  │ AI Summary: Strong quarterly results driven by EV segment.          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  🏷️ ONGC.NS                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔴 NEGATIVE                                                          │    │
│  │ "Global crude prices fall amid demand concerns"                     │    │
│  │ Source: Reuters • 3 hours ago                                       │    │
│  │                                                                      │    │
│  │ AI Summary: Oil price drop may impact ONGC revenue.                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│                       [View Full Dashboard →]                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. AI Architecture (Simplified)

### 6.1 Why NOT LangChain/CrewAI/LangGraph

| Tool | Why NOT |
|------|---------|
| **LangChain** | Heavy abstraction overhead. Direct Ollama HTTP calls are simpler and faster. |
| **CrewAI** | Multi-agent debate isn't needed. Portfolio analysis is deterministic. |
| **LangGraph** | Our flow is linear (not graph-based). Adds unnecessary complexity. |
| **Vector DB** | We have structured data (holdings), not unstructured documents to search. |

### 6.2 Our Approach: Hybrid Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HYBRID AI ARCHITECTURE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │   Ollama (Local)    │
                         │   Llama 3.1 8B      │
                         │   FREE & Fast       │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │  QUANTITATIVE   │   │   QUALITATIVE   │   │  RECOMMENDATIONS│
    │  (No AI)        │   │   (AI + Prompt) │   │  (AI + Context) │
    │                 │   │                 │   │                 │
    │  • Sector %     │   │  • Risk scoring │   │  • Personalized │
    │  • Volatility   │   │  • Reasoning    │   │  • Action items │
    │  • P&L calcs    │   │  • Insights     │   │  • Priorities   │
    │  • Concentration│   │                 │   │                 │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │      COMBINED RESULT        │
                    │                             │
                    │  Metrics + AI Analysis +    │
                    │  Recommendations            │
                    └─────────────────────────────┘
```

### 6.3 Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI ANALYSIS PIPELINE                            │
└─────────────────────────────────────────────────────────────────────────────┘

User Clicks "Analyze"
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│   STEP 1: QUANTITATIVE METRICS (No LLM - Pure Math)                       │
│   ─────────────────────────────────────────────────────────────────────── │
│   • Total Value = Σ(quantity × currentPrice)                              │
│   • Sector Concentration = (sector_value / total_value) × 100             │
│   • Single Stock Risk = holdings where (value/total) > 20%                │
│   • Volatility Score = Σ(sector_volatility × weight)                      │
│   • P&L = (currentPrice - avgPrice) / avgPrice × 100                      │
│                                                                            │
│   Output: Metrics Object (always accurate, deterministic)                  │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│   STEP 2: AI QUALITATIVE ANALYSIS                                         │
│   ─────────────────────────────────────────────────────────────────────── │
│                                                                            │
│   Prompt includes:                                                         │
│   • Holdings data (symbol, sector, P&L)                                   │
│   • Calculated metrics from Step 1                                        │
│   • JSON output format specification                                       │
│                                                                            │
│   Settings:                                                                │
│   • Temperature: 0.3 (low = consistent)                                   │
│   • Output: Structured JSON                                                │
│   • Fallback: Rule-based if JSON parse fails                              │
│                                                                            │
│   Output:                                                                  │
│   • risk_score per holding (0-100)                                        │
│   • risk_level (safe/moderate/risky)                                      │
│   • reasons array                                                          │
│   • recommendations                                                        │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│   STEP 3: COMBINE & ENRICH                                                │
│   ─────────────────────────────────────────────────────────────────────── │
│   • Merge AI scores with holdings data                                    │
│   • Add calculated metrics                                                │
│   • Generate final recommendations                                        │
│   • Add timestamp                                                         │
│                                                                            │
│   Output: Complete Analysis Result                                         │
└───────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Why Hybrid is Better

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID ANALYSIS BENEFITS                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     QUANTITATIVE METRICS        │     │      AI QUALITATIVE             │
│     (Always Accurate)           │     │      (Contextual Insights)      │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│                                 │     │                                 │
│  ✅ Sector concentration: 45%   │     │  ✅ "Auto sector is cyclical,   │
│                                 │     │      EV transition favorable"   │
│  ✅ Single stock risk: ONGC     │     │                                 │
│     (25% of portfolio)          │     │  ✅ "ONGC faces energy          │
│                                 │     │      transition headwinds"      │
│  ✅ Volatility score: 6.2/10    │     │                                 │
│                                 │     │  ✅ "Consider diversifying       │
│  ✅ P&L: +6.5%                  │     │      into IT or Banking"        │
│                                 │     │                                 │
│  RELIABLE - Pure math           │     │  INSIGHTFUL - Domain knowledge  │
│  FAST - No LLM call             │     │  PERSONALIZED - User context    │
│  DETERMINISTIC                  │     │  REASONING - Explains "why"     │
│                                 │     │                                 │
└─────────────────────────────────┘     └─────────────────────────────────┘
                │                                       │
                └───────────────────┬───────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────────┐
                    │      COMBINED RESULT              │
                    ├───────────────────────────────────┤
                    │                                   │
                    │  Portfolio Risk: 45/100 (Medium)  │
                    │                                   │
                    │  GRASIM.NS: 🟢 Safe (28/100)      │
                    │    • Low volatility sector        │
                    │    • Strong fundamentals          │
                    │                                   │
                    │  ONGC.NS: 🔴 Risky (72/100)       │
                    │    • 25% concentration (too high) │
                    │    • Energy transition risk       │
                    │    • Oil price volatility         │
                    │                                   │
                    │  Recommendation: Reduce ONGC     │
                    │                                   │
                    └───────────────────────────────────┘
```

### 6.5 Prompt Engineering Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROMPT ENGINEERING PRINCIPLES                             │
└─────────────────────────────────────────────────────────────────────────────┘

1. STRUCTURED JSON OUTPUT
   ─────────────────────────────────────────────────────────────────────────
   "Respond with ONLY valid JSON: { ... }"
   
   Benefit: Reliable parsing, consistent results

2. LOW TEMPERATURE (0.2-0.3)
   ─────────────────────────────────────────────────────────────────────────
   options: { temperature: 0.3 }
   
   Benefit: Consistent, predictable outputs

3. CONTEXT INJECTION
   ─────────────────────────────────────────────────────────────────────────
   Include in prompt:
   • All holdings data (symbol, sector, prices)
   • Calculated metrics (volatility, concentration)
   • User's risk tolerance
   
   Benefit: AI has full context for informed analysis

4. FEW-SHOT EXAMPLES (for sentiment)
   ─────────────────────────────────────────────────────────────────────────
   "EXAMPLES:
    Headline: 'Tata Motors Q3 profit surges 120%'
    Analysis: {sentiment: 'positive', impact: 'high'}
    
    NOW ANALYZE: ..."
   
   Benefit: AI learns the expected format

5. FALLBACK HANDLING
   ─────────────────────────────────────────────────────────────────────────
   try {
     return JSON.parse(response);
   } catch {
     return ruleBasedFallback(holdings);
   }
   
   Benefit: System never crashes, always returns result
```

---

## Summary

### Features Implemented

| Feature | Technology | Interview Value |
|---------|------------|-----------------|
| **2FA (TOTP)** | speakeasy, QR codes | ⭐⭐⭐⭐⭐ Security |
| **Rate Limiting** | Redis, express-rate-limit | ⭐⭐⭐⭐ Production |
| **Encryption** | AES-256-GCM, bcrypt | ⭐⭐⭐⭐⭐ Security |
| **Price Alerts** | Kafka, WebSockets | ⭐⭐⭐⭐⭐ Real-time |
| **News Digest** | RSS, Cron, AI Sentiment | ⭐⭐⭐⭐⭐ AI + Automation |
| **Hybrid AI** | Quantitative + LLM | ⭐⭐⭐⭐⭐ Smart Architecture |

### AI Approach

| Aspect | Our Choice | Why |
|--------|------------|-----|
| Framework | None (direct HTTP) | Simpler, faster, more control |
| LLM | Ollama + Llama 3.1 8B | FREE, local, good quality |
| Analysis | Hybrid (Quant + AI) | Best of both worlds |
| Prompts | Structured JSON output | Reliable parsing |
| Fallback | Rule-based | System never fails |

### Interview Talking Points

| Question | Your Answer |
|----------|-------------|
| "Why not LangChain?" | "LangChain adds abstraction overhead. For structured tasks like portfolio analysis, direct Ollama calls are faster and more predictable." |
| "Why not multiple agents?" | "Multi-agent systems are great for open-ended tasks, but portfolio analysis is deterministic. I combined quantitative metrics with AI qualitative analysis for better accuracy." |
| "How do you handle AI errors?" | "I implemented fallback strategies - if JSON parsing fails, rule-based analysis kicks in. Quantitative metrics are always reliable." |
| "How is this production-ready?" | "Low temperature for consistency, structured prompts for predictable outputs, timeout handling, and health checks." |
