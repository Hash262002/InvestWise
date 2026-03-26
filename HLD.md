# InvestWise - High Level Design (HLD)

## 📋 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Final Tech Stack](#2-final-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Service Details](#4-service-details)
5. [AI Architecture](#5-ai-architecture)
6. [Data Flow](#6-data-flow)
7. [Database Design](#7-database-design)
8. [API Design](#8-api-design)
9. [Security Architecture](#9-security-architecture)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Timeline](#11-timeline)

---

## 1. Project Overview

**InvestWise** is an AI-powered investment portfolio management platform that helps users track investments, analyze risk, and receive intelligent recommendations.

### 1.1 Core Features
- 📊 **Portfolio Management** - Track stocks, mutual funds, gold, bonds
- 🔍 **Asset Search** - Real-time search with market data
- 🤖 **AI Risk Analysis** - Hybrid quantitative + AI qualitative analysis
- 📰 **News Sentiment** - Daily digest with AI sentiment scoring
- ⚡ **Real-time Alerts** - Price alerts via WebSocket, Email
- 🔐 **Enterprise Security** - 2FA, encryption, rate limiting

### 1.2 User Journey
```
Register/Login → Create Portfolio → Search & Add Holdings → Analyze with AI → View Risk Results
      ↓                                                            ↓
    2FA Setup                                              Get Recommendations
      ↓                                                            ↓
  Home Dashboard ←──── Daily News Digest ←──── Price Alerts ←──────┘
```

---

## 2. Final Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React 18 + Vite + TypeScript | Fast, modern, industry standard |
| **UI Components** | Tailwind CSS + shadcn/ui | Rapid UI development |
| **State Management** | Zustand + React Query | Simple state + server state |
| **Backend** | Node.js + Express + TypeScript | MERN stack with type safety |
| **Database** | MongoDB + Mongoose | Document-based, flexible schema |
| **Cache** | Redis | Fast caching, rate limiting, sessions |
| **Message Queue** | Apache Kafka | Event-driven architecture, decoupling |
| **AI Runtime** | Python + FastAPI | AI/ML ecosystem |
| **LLM** | Ollama + Llama 3.1 8B | FREE local LLM |
| **AI Approach** | Structured Prompts + Hybrid Analysis | No heavy frameworks |
| **WebSockets** | ws (Node.js) | Real-time notifications |
| **Containers** | Docker + Docker Compose | Containerization |
| **Orchestration** | Kubernetes (Minikube) | Container orchestration |
| **CI/CD** | GitHub Actions | Automated pipelines |

### 2.1 Why NOT LangChain/CrewAI/LangGraph?

| Tool | Why NOT for This Project |
|------|--------------------------|
| **LangChain** | Heavy abstraction overhead. Direct Ollama calls are simpler, faster. |
| **CrewAI** | Multi-agent debate isn't needed. Portfolio analysis is deterministic. |
| **LangGraph** | Our flow is linear, not graph-based. Adds unnecessary complexity. |
| **Vector DB** | We have structured data (holdings), not unstructured docs to search. |

### 2.2 Skills Demonstrated

```
✅ MERN Stack (MongoDB, Express, React, Node.js)
✅ TypeScript (Full-stack type safety)
✅ Apache Kafka (Event-driven architecture)
✅ Redis (Caching, Rate Limiting, Pub/Sub)
✅ Python + FastAPI (AI microservice)
✅ LLM Integration (Ollama, Prompt Engineering)
✅ Hybrid AI (Quantitative + Qualitative analysis)
✅ Docker (Containerization)
✅ Kubernetes (Container orchestration)
✅ WebSockets (Real-time communication)
✅ 2FA Authentication (TOTP)
✅ AES-256 Encryption
✅ Rate Limiting (Redis-backed)
✅ REST API Design
✅ Microservices Architecture
```

---

## 3. System Architecture

### 3.1 Complete System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INVESTWISE ARCHITECTURE                                       │
│                                    ══════════════════════                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

                                         ┌─────────────┐
                                         │   USERS     │
                                         │  (Browser)  │
                                         └──────┬──────┘
                                                │
                                                │ HTTPS
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    KUBERNETES CLUSTER                                            │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                              INGRESS CONTROLLER (nginx)                                      │ │
│ │                                   investwise.local                                           │ │
│ └────────────────────────────────────────┬───────────────────────────────────────────────────┘ │
│                                          │                                                      │
│          ┌───────────────────────────────┼───────────────────────────────┐                     │
│          │                               │                               │                     │
│          ▼                               ▼                               ▼                     │
│ ┌─────────────────┐           ┌─────────────────────┐         ┌─────────────────┐             │
│ │                 │           │                     │         │                 │             │
│ │    FRONTEND     │  REST/WS  │      BACKEND        │  HTTP   │   AI SERVICE    │             │
│ │    SERVICE      │◄─────────►│      SERVICE        │◄───────►│   (Python)      │             │
│ │                 │           │                     │         │                 │             │
│ │  ┌───────────┐  │           │  ┌───────────────┐  │         │  ┌───────────┐  │             │
│ │  │  React    │  │           │  │   Express     │  │         │  │  FastAPI  │  │             │
│ │  │  Vite     │  │           │  │   TypeScript  │  │         │  │           │  │             │
│ │  │  Tailwind │  │           │  └───────────────┘  │         │  └───────────┘  │             │
│ │  │  Zustand  │  │           │                     │         │                 │             │
│ │  └───────────┘  │           │  ┌───────────────┐  │         │  ┌───────────┐  │             │
│ │                 │           │  │  WebSocket    │  │         │  │   Risk    │  │             │
│ │  Features:      │           │  │   Server      │  │         │  │  Analyzer │  │             │
│ │  • Dashboard    │           │  └───────────────┘  │         │  └───────────┘  │             │
│ │  • Portfolio    │           │                     │         │                 │             │
│ │  • Search       │           │  Features:          │         │  ┌───────────┐  │             │
│ │  • Analysis     │           │  • Auth + 2FA       │         │  │ Sentiment │  │             │
│ │  • Alerts       │           │  • Portfolio CRUD   │         │  │ Analyzer  │  │             │
│ │  • Settings     │           │  • Market Data      │         │  └───────────┘  │             │
│ │                 │           │  • Alerts           │         │                 │             │
│ │  Port: 3000     │           │  • Notifications    │         │  ┌───────────┐  │             │
│ │                 │           │  • Rate Limiting    │         │  │  Recomm.  │  │             │
│ └─────────────────┘           │                     │         │  │ Generator │  │             │
│                               │  Port: 3001         │         │  └───────────┘  │             │
│                               │                     │         │                 │             │
│                               └──────────┬──────────┘         │  Port: 8000     │             │
│                                          │                    │                 │             │
│                                          │                    └────────┬────────┘             │
│                                          │                             │                      │
│         ┌────────────────────────────────┼─────────────────────────────┤                      │
│         │                                │                             │                      │
│         ▼                                ▼                             ▼                      │
│ ┌───────────────┐              ┌─────────────────┐           ┌─────────────────┐             │
│ │               │              │                 │           │                 │             │
│ │   MONGODB     │              │   APACHE KAFKA  │           │     OLLAMA      │             │
│ │               │              │                 │           │     (LLM)       │             │
│ │ ┌───────────┐ │              │ ┌─────────────┐ │           │                 │             │
│ │ │  Users    │ │              │ │   Topics:   │ │           │  ┌───────────┐  │             │
│ │ │  Portfolios│ │              │ │             │ │           │  │ Llama 3.1 │  │             │
│ │ │  Holdings │ │              │ │ • portfolio │ │           │  │    8B     │  │             │
│ │ │  Alerts   │ │              │ │   .events   │ │           │  │   FREE    │  │             │
│ │ │  Analysis │ │              │ │             │ │           │  └───────────┘  │             │
│ │ │  AuditLog │ │              │ │ • price     │ │           │                 │             │
│ │ │  Notifs   │ │              │ │   .updates  │ │           │  Model loaded   │             │
│ │ └───────────┘ │              │ │             │ │           │  in memory      │             │
│ │               │              │ │ • ai        │ │           │                 │             │
│ │ Port: 27017   │              │ │   .analysis │ │           │  Port: 11434    │             │
│ │               │              │ │             │ │           │                 │             │
│ └───────────────┘              │ │ • news      │ │           └─────────────────┘             │
│                                │ │   .digest   │ │                                           │
│                                │ │             │ │                                           │
│                                │ │ • alerts    │ │                                           │
│                                │ │   .trigger  │ │                                           │
│                                │ └─────────────┘ │                                           │
│ ┌───────────────┐              │                 │                                           │
│ │               │              │ Port: 9092      │                                           │
│ │    REDIS      │              │                 │                                           │
│ │               │              └─────────────────┘                                           │
│ │ ┌───────────┐ │                                                                            │
│ │ │  Cache    │ │                                                                            │
│ │ │  Sessions │ │              ┌─────────────────┐                                           │
│ │ │  Rate     │ │              │                 │                                           │
│ │ │  Limits   │ │              │  CRON WORKERS   │                                           │
│ │ │  Alerts   │ │              │                 │                                           │
│ │ │  Pub/Sub  │ │              │ • Price Feed    │ (Every 30s during market hours)           │
│ │ └───────────┘ │              │ • News Digest   │ (Daily 6 AM IST)                          │
│ │               │              │ • Alert Checker │ (Kafka consumer)                          │
│ │ Port: 6379    │              │                 │                                           │
│ │               │              └─────────────────┘                                           │
│ └───────────────┘                                                                            │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

                                    EXTERNAL SERVICES (FREE)
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ Yahoo Finance│    │   MFAPI.in   │    │ Google News  │    │    Gmail     │               │
│  │   (Stocks)   │    │(Mutual Funds)│    │    (RSS)     │    │   (SMTP)     │               │
│  │     FREE     │    │     FREE     │    │     FREE     │    │     FREE     │               │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘               │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Service Communication Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE COMMUNICATION PATTERNS                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

SYNCHRONOUS (Request/Response):
═══════════════════════════════

   Frontend ──────HTTP/REST────────► Backend ──────HTTP────────► AI Service
      │                                  │                           │
      │◄──────JSON Response──────────────│◄──────JSON Response───────│
      │                                  │
      │────────WebSocket─────────────────│
      │◄───Real-time Notifications───────│


ASYNCHRONOUS (Event-Driven via Kafka):
══════════════════════════════════════

   ┌──────────────────────────────────────────────────────────────────────────┐
   │                          KAFKA MESSAGE FLOW                               │
   └──────────────────────────────────────────────────────────────────────────┘

   Backend                    Kafka                         Consumers
   ═══════                    ═════                         ═════════

   Portfolio Created ──────► [portfolio.events] ─────────► AI Service (analyze)
                                                  ├───────► Analytics (track)

   Price Updated ──────────► [price.updates] ────────────► Alert Service (check)
                                                  ├───────► Portfolio Service (update values)

   Analysis Complete ──────► [ai.analysis] ──────────────► Backend (store)
                                                  ├───────► WebSocket (notify user)

   News Fetched ───────────► [news.digest] ──────────────► AI Service (sentiment)
                                                  ├───────► Email Service (send digest)

   Alert Triggered ────────► [alerts.trigger] ───────────► Notification Service
                                                  ├───────► WebSocket (real-time)
                                                  ├───────► Email Service
```

---

## 4. Service Details

### 4.1 Frontend Service (React + Vite)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND SERVICE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Technology: React 18 + Vite + TypeScript + Tailwind            │
│  Port: 3000                                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      PAGES                               │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  /login          → Login page                           │    │
│  │  /register       → Registration page                    │    │
│  │  /2fa            → 2FA verification                     │    │
│  │  /               → Dashboard (home)                     │    │
│  │  /portfolio/new  → Create portfolio                     │    │
│  │  /portfolio/:id  → Portfolio detail                     │    │
│  │  /analysis/:id   → Analysis results                     │    │
│  │  /alerts         → Manage alerts                        │    │
│  │  /settings       → User settings                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    COMPONENTS                            │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  • StatsCard        • PortfolioCard    • HoldingsList   │    │
│  │  • SearchBar        • SearchResults    • AddHoldingModal│    │
│  │  • RiskMeter        • RiskBadge        • AnalysisCard   │    │
│  │  • NotificationBell • AlertForm        • NewsDigest     │    │
│  │  • Enable2FAModal   • VerifyOTPModal   • BackupCodes    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  STATE MANAGEMENT                        │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  Zustand Stores:                                        │    │
│  │    • useAuthStore     - Auth state, user data           │    │
│  │    • usePortfolioStore - Portfolios, holdings           │    │
│  │    • useNotificationStore - Notifications, alerts       │    │
│  │                                                          │    │
│  │  React Query:                                            │    │
│  │    • usePortfolios()  - Fetch/cache portfolios          │    │
│  │    • useAnalysis()    - Fetch analysis results          │    │
│  │    • useMarketSearch() - Search with caching            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Backend Service (Express + TypeScript)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Technology: Node.js + Express + TypeScript                     │
│  Port: 3001                                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     API ROUTES                           │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │  AUTH (/api/auth)                                        │    │
│  │    POST /register       - Create account                 │    │
│  │    POST /login          - Login (returns JWT)            │    │
│  │    POST /verify-2fa     - Verify 2FA code                │    │
│  │    POST /refresh        - Refresh access token           │    │
│  │    POST /2fa/setup      - Generate 2FA secret            │    │
│  │    POST /2fa/enable     - Enable 2FA                     │    │
│  │    POST /2fa/disable    - Disable 2FA                    │    │
│  │                                                          │    │
│  │  PORTFOLIOS (/api/portfolios)                            │    │
│  │    GET    /             - List user portfolios           │    │
│  │    POST   /             - Create portfolio               │    │
│  │    GET    /:id          - Get portfolio with holdings    │    │
│  │    PATCH  /:id          - Update portfolio               │    │
│  │    DELETE /:id          - Delete portfolio               │    │
│  │    POST   /:id/holdings - Add holding                    │    │
│  │    PATCH  /:id/holdings/:hid - Update holding            │    │
│  │    DELETE /:id/holdings/:hid - Remove holding            │    │
│  │                                                          │    │
│  │  MARKET (/api/market)                                    │    │
│  │    GET /search          - Search stocks/MFs              │    │
│  │    GET /quote/:symbol   - Get stock quote                │    │
│  │    GET /mf/:schemeCode  - Get mutual fund NAV            │    │
│  │                                                          │    │
│  │  AI (/api/ai)                                            │    │
│  │    POST /analyze/:portfolioId - Trigger analysis         │    │
│  │    GET  /analysis/:portfolioId - Get latest analysis     │    │
│  │                                                          │    │
│  │  ALERTS (/api/alerts)                                    │    │
│  │    GET    /             - List user alerts               │    │
│  │    POST   /             - Create alert                   │    │
│  │    DELETE /:id          - Delete alert                   │    │
│  │                                                          │    │
│  │  NOTIFICATIONS (/api/notifications)                      │    │
│  │    GET   /              - List notifications             │    │
│  │    PATCH /:id/read      - Mark as read                   │    │
│  │    POST  /preferences   - Update preferences             │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    MIDDLEWARE                            │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  • authMiddleware     - JWT verification                 │    │
│  │  • rateLimitMiddleware - Redis-backed rate limiting      │    │
│  │  • securityMiddleware - Helmet, CORS                     │    │
│  │  • auditMiddleware    - Request logging                  │    │
│  │  • errorMiddleware    - Global error handling            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    SERVICES                              │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  • AuthService        - Login, register, 2FA            │    │
│  │  • PortfolioService   - CRUD operations                 │    │
│  │  • MarketDataService  - External API calls              │    │
│  │  • AlertService       - Alert management                │    │
│  │  • NotificationService - Push & store notifications     │    │
│  │  • KafkaService       - Produce/consume messages        │    │
│  │  • CacheService       - Redis caching                   │    │
│  │  • EncryptionService  - AES-256 encrypt/decrypt         │    │
│  │  • TwoFactorService   - TOTP generation/verification    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 AI Service (Python + FastAPI)

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI SERVICE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Technology: Python 3.11 + FastAPI                              │
│  Port: 8000                                                      │
│  LLM: Ollama + Llama 3.1 8B (LOCAL, FREE)                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    API ENDPOINTS                         │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  POST /analyze          - Full portfolio analysis        │    │
│  │  POST /sentiment        - News sentiment analysis        │    │
│  │  POST /recommend        - Generate recommendations       │    │
│  │  GET  /health           - Health check + model status    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AI APPROACH (HYBRID ANALYSIS)               │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │   STEP 1: QUANTITATIVE METRICS (No AI - Pure Math)      │    │
│  │   ────────────────────────────────────────────────────   │    │
│  │   • Sector concentration %                               │    │
│  │   • Single stock risk (>20% of portfolio)               │    │
│  │   • Weighted volatility score                           │    │
│  │   • P&L calculations                                     │    │
│  │   • Diversification index                               │    │
│  │                                                          │    │
│  │   STEP 2: QUALITATIVE ANALYSIS (AI + Structured Prompts)│    │
│  │   ────────────────────────────────────────────────────   │    │
│  │   • Risk scoring per holding (0-100)                    │    │
│  │   • Risk level classification (safe/moderate/risky)     │    │
│  │   • Reasoning for each score                            │    │
│  │   • Sector-specific insights                            │    │
│  │                                                          │    │
│  │   STEP 3: RECOMMENDATIONS (AI + User Context)           │    │
│  │   ────────────────────────────────────────────────────   │    │
│  │   • Personalized based on risk tolerance                │    │
│  │   • Prioritized action items                            │    │
│  │   • Diversification suggestions                         │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    ANALYZERS                             │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │  RiskAnalyzer:                                          │    │
│  │    • calculate_metrics()     - Quantitative analysis     │    │
│  │    • get_ai_analysis()       - LLM qualitative analysis  │    │
│  │    • combine_results()       - Merge quant + qual        │    │
│  │                                                          │    │
│  │  SentimentAnalyzer:                                      │    │
│  │    • analyze_news()          - Batch sentiment analysis  │    │
│  │    • Few-shot prompting for consistency                  │    │
│  │                                                          │    │
│  │  RecommendationGenerator:                                │    │
│  │    • generate_recommendations() - Personalized advice    │    │
│  │    • Considers risk tolerance + news + portfolio state   │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PROMPT ENGINEERING APPROACH                 │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │  1. Structured JSON Output:                             │    │
│  │     "Respond with ONLY valid JSON: { ... }"             │    │
│  │                                                          │    │
│  │  2. Low Temperature (0.2-0.3):                          │    │
│  │     Consistent, predictable outputs                     │    │
│  │                                                          │    │
│  │  3. Context Injection:                                  │    │
│  │     All holdings data + calculated metrics in prompt    │    │
│  │                                                          │    │
│  │  4. Few-Shot Examples:                                  │    │
│  │     For sentiment analysis, provide 3-4 examples        │    │
│  │                                                          │    │
│  │  5. Fallback Handling:                                  │    │
│  │     If JSON parse fails, use rule-based fallback        │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. AI Architecture

### 5.1 Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              AI ANALYSIS PIPELINE                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

User Clicks "Analyze"
        │
        ▼
┌───────────────────┐
│   Backend API     │
│   POST /analyze   │
└─────────┬─────────┘
          │
          │ Publish Event
          ▼
┌───────────────────┐
│   Kafka Topic:    │
│   portfolio.events │
└─────────┬─────────┘
          │
          │ Consume
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              AI SERVICE                                                  │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                                 │    │
│  │   STEP 1: QUANTITATIVE ANALYSIS (NO LLM)                                       │    │
│  │   ═══════════════════════════════════════                                      │    │
│  │                                                                                 │    │
│  │   Input: Portfolio Holdings                                                     │    │
│  │                                                                                 │    │
│  │   Calculations:                                                                 │    │
│  │   ┌─────────────────────────────────────────────────────────────────────┐      │    │
│  │   │ • Total Value = Σ(quantity × currentPrice)                          │      │    │
│  │   │ • Sector Concentration = (sector_value / total_value) × 100         │      │    │
│  │   │ • Single Stock Risk = holdings where (value/total) > 20%            │      │    │
│  │   │ • Volatility Score = Σ(sector_volatility × weight)                  │      │    │
│  │   │ • P&L = (currentPrice - avgPrice) / avgPrice × 100                  │      │    │
│  │   └─────────────────────────────────────────────────────────────────────┘      │    │
│  │                                                                                 │    │
│  │   Output: Metrics Object                                                        │    │
│  │                                                                                 │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                          │                                              │
│                                          ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                                 │    │
│  │   STEP 2: QUALITATIVE ANALYSIS (LLM)                                           │    │
│  │   ═══════════════════════════════════                                          │    │
│  │                                                                                 │    │
│  │   ┌──────────────────────┐                                                     │    │
│  │   │   BUILD PROMPT       │                                                     │    │
│  │   │                      │                                                     │    │
│  │   │   • Holdings data    │                                                     │    │
│  │   │   • Calculated metrics│                                                    │    │
│  │   │   • JSON output format│                                                    │    │
│  │   └──────────┬───────────┘                                                     │    │
│  │              │                                                                  │    │
│  │              ▼                                                                  │    │
│  │   ┌──────────────────────┐      ┌──────────────────────┐                       │    │
│  │   │   OLLAMA API         │      │   Llama 3.1 8B       │                       │    │
│  │   │                      │─────►│                      │                       │    │
│  │   │   POST /api/generate │      │   Temperature: 0.3   │                       │    │
│  │   └──────────────────────┘      └──────────┬───────────┘                       │    │
│  │                                            │                                    │    │
│  │                                            ▼                                    │    │
│  │   ┌──────────────────────────────────────────────────────────────────────┐     │    │
│  │   │   JSON OUTPUT:                                                        │     │    │
│  │   │   {                                                                   │     │    │
│  │   │     "holdings_analysis": [                                            │     │    │
│  │   │       { "symbol": "X", "risk_score": 72, "risk_level": "risky", ...} │     │    │
│  │   │     ],                                                                │     │    │
│  │   │     "overall_risk_score": 45,                                         │     │    │
│  │   │     "key_risks": [...],                                               │     │    │
│  │   │     "recommendations": [...]                                          │     │    │
│  │   │   }                                                                   │     │    │
│  │   └──────────────────────────────────────────────────────────────────────┘     │    │
│  │                                                                                 │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                          │                                              │
│                                          ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                                 │    │
│  │   STEP 3: COMBINE & ENRICH                                                     │    │
│  │   ════════════════════════                                                     │    │
│  │                                                                                 │    │
│  │   • Merge AI scores with holdings data                                         │    │
│  │   • Add risk_level to each holding                                             │    │
│  │   • Include calculated metrics                                                 │    │
│  │   • Add timestamp                                                               │    │
│  │                                                                                 │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
└──────────────────────────────────────────┬──────────────────────────────────────────────┘
                                           │
                                           │ Publish Result
                                           ▼
                                ┌───────────────────┐
                                │   Kafka Topic:    │
                                │   ai.analysis     │
                                └─────────┬─────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │                                   │
                        ▼                                   ▼
              ┌─────────────────┐                 ┌─────────────────┐
              │  Backend        │                 │  WebSocket      │
              │  (Store in DB)  │                 │  (Notify User)  │
              └─────────────────┘                 └─────────────────┘
```

### 5.2 Why Hybrid Analysis is Better

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID ANALYSIS BENEFITS                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     QUANTITATIVE METRICS        │     │      AI QUALITATIVE             │
│     (Always Accurate)           │     │      (Contextual Insights)      │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│                                 │     │                                 │
│  ✅ Sector concentration: 45%   │     │  ✅ "Auto sector is cyclical,   │
│                                 │     │      current conditions favor   │
│  ✅ Single stock risk: ONGC     │     │      EV transition"             │
│     (25% of portfolio)          │     │                                 │
│                                 │     │  ✅ "ONGC faces energy          │
│  ✅ Volatility score: 6.2/10    │     │      transition headwinds"      │
│                                 │     │                                 │
│  ✅ P&L: +6.5%                  │     │  ✅ "Consider diversifying       │
│                                 │     │      into IT or Banking"        │
│                                 │     │                                 │
│  RELIABLE - Pure math           │     │  INSIGHTFUL - Domain knowledge  │
│  FAST - No LLM needed           │     │  PERSONALIZED - User context    │
│  DETERMINISTIC - Same input =   │     │  REASONING - Explains "why"     │
│                  same output    │     │                                 │
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

---

## 6. Data Flow

### 6.1 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE DATA FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

FLOW 1: USER REGISTRATION & LOGIN
═════════════════════════════════

  User                Frontend              Backend               MongoDB            Redis
   │                    │                     │                     │                  │
   │──Register─────────►│                     │                     │                  │
   │                    │───POST /register───►│                     │                  │
   │                    │                     │──hash password──────│                  │
   │                    │                     │──save user─────────►│                  │
   │                    │                     │                     │                  │
   │                    │                     │───generate JWT──────│                  │
   │                    │                     │──store session─────────────────────────►│
   │                    │◄──JWT tokens────────│                     │                  │
   │◄──Redirect─────────│                     │                     │                  │


FLOW 2: PORTFOLIO CREATION & SEARCH
════════════════════════════════════

  User          Frontend           Backend             Yahoo Finance      MongoDB      Redis
   │               │                  │                      │               │           │
   │──Search───────►│                 │                      │               │           │
   │               │──GET /search?q──►│                      │               │           │
   │               │                  │──check cache────────────────────────────────────►│
   │               │                  │◄─cache miss──────────────────────────────────────│
   │               │                  │──fetch quotes───────►│               │           │
   │               │                  │◄─results─────────────│               │           │
   │               │                  │──store cache (1hr)────────────────────────────────►│
   │               │◄─results─────────│                      │               │           │
   │◄─display──────│                  │                      │               │           │
   │               │                  │                      │               │           │
   │──Add holding──►│                 │                      │               │           │
   │               │──POST /holdings─►│                      │               │           │
   │               │                  │──save to DB──────────────────────────►│          │
   │               │                  │──publish event───────┐               │           │
   │               │◄─success─────────│                      │ Kafka         │           │
   │◄─updated──────│                  │                      ▼               │           │


FLOW 3: AI ANALYSIS
════════════════════

  User       Frontend        Backend          Kafka          AI Service        Ollama
   │            │               │               │                │               │
   │──Analyze──►│               │               │                │               │
   │            │──POST /analyze─►│             │                │               │
   │            │               │──publish──────►│               │               │
   │            │◄─"processing"─│               │                │               │
   │◄─loading──│               │               │──consume───────►│               │
   │            │               │               │                │──calc metrics─│
   │            │               │               │                │──build prompt─│
   │            │               │               │                │──call LLM─────►│
   │            │               │               │                │◄─JSON response─│
   │            │               │               │                │──combine──────│
   │            │               │               │◄─publish result─│               │
   │            │               │◄─consume──────│                │               │
   │            │               │──save to DB───│                │               │
   │            │◄─WebSocket push─│             │                │               │
   │◄─results──│               │               │                │               │


FLOW 4: REAL-TIME PRICE ALERTS
══════════════════════════════

  Cron(30s)     Price Feed       Kafka        Alert Service      Redis        WebSocket
     │              │               │               │               │             │
     │──trigger────►│               │               │               │             │
     │              │──fetch prices─┐               │               │             │
     │              │◄──────────────┘               │               │             │
     │              │──publish──────►│              │               │             │
     │              │               │──consume──────►│              │             │
     │              │               │               │──get alerts───►│            │
     │              │               │               │◄─user alerts───│            │
     │              │               │               │──check conditions─          │
     │              │               │               │                │             │
     │              │               │               │──[if triggered]───────────────►│
     │              │               │               │                │  notify user│


FLOW 5: DAILY NEWS DIGEST
══════════════════════════

  Cron(6AM)    News Service      RSS Feeds       AI Service       Email Service    User
     │              │                │               │                  │            │
     │──trigger────►│                │               │                  │            │
     │              │──get symbols───┐               │                  │            │
     │              │◄───────────────┘               │                  │            │
     │              │──fetch news────►│              │                  │            │
     │              │◄─articles───────│              │                  │            │
     │              │──sentiment─────────────────────►│                 │            │
     │              │◄─analyzed──────────────────────│                  │            │
     │              │──per-user digest───────────────────────────────────►│          │
     │              │                │               │                  │──email────►│
```

---

## 7. Database Design

### 7.1 Collections

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              MONGODB COLLECTIONS                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  USERS                                                          │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    _id: ObjectId,                                               │
│    email: String (unique, indexed),                             │
│    password: String (bcrypt hashed),                            │
│    name: String,                                                │
│    riskTolerance: "low" | "medium" | "high",                   │
│                                                                 │
│    // 2FA                                                       │
│    twoFactorEnabled: Boolean,                                   │
│    twoFactorSecret: String (AES-256 encrypted),                │
│    backupCodes: [String] (encrypted + hashed),                 │
│                                                                 │
│    // Preferences                                               │
│    notificationPreferences: {                                   │
│      emailDigest: Boolean,                                      │
│      emailDigestTime: String,                                   │
│      emailAlerts: Boolean,                                      │
│      pushAlerts: Boolean                                        │
│    },                                                           │
│                                                                 │
│    createdAt: Date,                                             │
│    updatedAt: Date                                              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PORTFOLIOS                                                     │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    _id: ObjectId,                                               │
│    userId: ObjectId (ref: Users, indexed),                      │
│    name: String,                                                │
│    description: String,                                         │
│    goal: "retirement" | "wealth" | "trading" | "income",       │
│    createdAt: Date,                                             │
│    updatedAt: Date                                              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  HOLDINGS                                                       │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    _id: ObjectId,                                               │
│    portfolioId: ObjectId (ref: Portfolios, indexed),            │
│    symbol: String (indexed),                                    │
│    name: String,                                                │
│    type: "STOCK" | "MUTUALFUND" | "GOLD" | "BOND",             │
│    sector: String,                                              │
│    quantity: Number,                                            │
│    averagePrice: Number,                                        │
│    currentPrice: Number,                                        │
│    lastUpdated: Date,                                           │
│                                                                 │
│    // From last analysis                                        │
│    riskScore: Number (0-100),                                   │
│    riskLevel: "safe" | "moderate" | "risky",                   │
│                                                                 │
│    createdAt: Date                                              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ANALYSES                                                       │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    _id: ObjectId,                                               │
│    portfolioId: ObjectId (ref: Portfolios, indexed),            │
│    userId: ObjectId (ref: Users, indexed),                      │
│                                                                 │
│    // Quantitative Metrics                                      │
│    metrics: {                                                   │
│      totalValue: Number,                                        │
│      sectorConcentration: Object,                               │
│      singleStockRisks: [Object],                               │
│      volatilityScore: Number                                    │
│    },                                                           │
│                                                                 │
│    // AI Analysis                                               │
│    aiAnalysis: {                                                │
│      holdingsAnalysis: [{                                       │
│        symbol: String,                                          │
│        riskScore: Number,                                       │
│        riskLevel: String,                                       │
│        reasons: [String],                                       │
│        recommendation: String                                   │
│      }],                                                        │
│      overallRiskScore: Number,                                  │
│      overallRiskLevel: String,                                  │
│      keyRisks: [String],                                        │
│      recommendations: [Object],                                 │
│      diversificationSuggestion: String                          │
│    },                                                           │
│                                                                 │
│    analyzedAt: Date                                             │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ALERTS                                                         │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    _id: ObjectId,                                               │
│    userId: ObjectId (ref: Users, indexed),                      │
│    symbol: String (indexed),                                    │
│    condition: "above" | "below" | "change_percent",            │
│    targetValue: Number,                                         │
│    notifyVia: ["app", "email"],                                │
│    frequency: "once" | "always",                               │
│    isActive: Boolean (indexed),                                 │
│    triggeredAt: Date,                                           │
│    createdAt: Date                                              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  NOTIFICATIONS                                                  │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    _id: ObjectId,                                               │
│    userId: ObjectId (ref: Users, indexed),                      │
│    type: "price_alert" | "news_digest" | "analysis" | "security",│
│    title: String,                                               │
│    message: String,                                             │
│    data: Object,                                                │
│    read: Boolean,                                               │
│    createdAt: Date (TTL: 30 days)                              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  AUDIT_LOGS                                                     │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    _id: ObjectId,                                               │
│    userId: ObjectId,                                            │
│    action: String,                                              │
│    ip: String,                                                  │
│    userAgent: String,                                           │
│    endpoint: String,                                            │
│    statusCode: Number,                                          │
│    responseTime: Number,                                        │
│    timestamp: Date (TTL: 90 days)                              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. API Design

### 8.1 API Endpoints Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              API ENDPOINTS                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

METHOD    ENDPOINT                        AUTH    RATE LIMIT    DESCRIPTION
══════════════════════════════════════════════════════════════════════════════════════════

AUTHENTICATION
──────────────────────────────────────────────────────────────────────────────────────────
POST      /api/auth/register              No      5/15min       Create account
POST      /api/auth/login                 No      5/15min       Login
POST      /api/auth/verify-2fa            No      3/5min        Verify 2FA code
POST      /api/auth/refresh               No      10/min        Refresh token
POST      /api/auth/2fa/setup             Yes     3/hour        Generate 2FA secret
POST      /api/auth/2fa/enable            Yes     3/hour        Enable 2FA
POST      /api/auth/2fa/disable           Yes     3/hour        Disable 2FA

PORTFOLIOS
──────────────────────────────────────────────────────────────────────────────────────────
GET       /api/portfolios                 Yes     100/min       List portfolios
POST      /api/portfolios                 Yes     100/min       Create portfolio
GET       /api/portfolios/:id             Yes     100/min       Get portfolio
PATCH     /api/portfolios/:id             Yes     100/min       Update portfolio
DELETE    /api/portfolios/:id             Yes     100/min       Delete portfolio
POST      /api/portfolios/:id/holdings    Yes     100/min       Add holding
PATCH     /api/portfolios/:id/holdings/:h Yes     100/min       Update holding
DELETE    /api/portfolios/:id/holdings/:h Yes     100/min       Remove holding

MARKET DATA
──────────────────────────────────────────────────────────────────────────────────────────
GET       /api/market/search?q=           Yes     30/min        Search assets
GET       /api/market/quote/:symbol       Yes     30/min        Get quote
GET       /api/market/mf/:schemeCode      Yes     30/min        Get MF NAV

AI ANALYSIS
──────────────────────────────────────────────────────────────────────────────────────────
POST      /api/ai/analyze/:portfolioId    Yes     5/hour        Trigger analysis
GET       /api/ai/analysis/:portfolioId   Yes     100/min       Get analysis

ALERTS
──────────────────────────────────────────────────────────────────────────────────────────
GET       /api/alerts                     Yes     100/min       List alerts
POST      /api/alerts                     Yes     100/min       Create alert
DELETE    /api/alerts/:id                 Yes     100/min       Delete alert

NOTIFICATIONS
──────────────────────────────────────────────────────────────────────────────────────────
GET       /api/notifications              Yes     100/min       List notifications
PATCH     /api/notifications/:id/read     Yes     100/min       Mark as read
POST      /api/notifications/preferences  Yes     100/min       Update preferences

WEBSOCKET
──────────────────────────────────────────────────────────────────────────────────────────
WS        /ws?token=JWT                   Yes     50msg/min     Real-time updates
```

---

## 9. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SECURITY LAYERS                                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

LAYER 1: TRANSPORT
══════════════════
   • HTTPS/TLS 1.3 for all traffic
   • HSTS enabled
   • Secure WebSocket (wss://)

LAYER 2: AUTHENTICATION
════════════════════════
   • JWT (RS256) with 15min expiry
   • Refresh tokens (7 days)
   • 2FA (TOTP) support
   • Backup codes for recovery

LAYER 3: AUTHORIZATION
═══════════════════════
   • JWT middleware on all protected routes
   • User can only access their own data
   • Role-based (future: admin role)

LAYER 4: RATE LIMITING
═══════════════════════
   • Redis-backed rate limiting
   • Tiered limits per endpoint type
   • IP-based blocking after 10 failed logins

LAYER 5: INPUT VALIDATION
══════════════════════════
   • Zod schema validation
   • SQL injection prevention (Mongoose)
   • XSS prevention (sanitization)

LAYER 6: ENCRYPTION
════════════════════
   • Passwords: bcrypt (cost 12)
   • 2FA secrets: AES-256-GCM
   • Sensitive fields encrypted at rest

LAYER 7: HEADERS
═════════════════
   • Helmet.js security headers
   • CORS with allowed origins
   • Content-Security-Policy

LAYER 8: AUDIT
═══════════════
   • All requests logged
   • Security events tracked
   • 90-day retention
```

---

## 10. Deployment Architecture

### 10.1 Kubernetes Resources

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              KUBERNETES RESOURCES                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

DEPLOYMENTS (Pods)
══════════════════
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Name              │ Image                    │ Replicas │ Resources    │ HPA           │
├───────────────────┼──────────────────────────┼──────────┼──────────────┼───────────────┤
│ frontend          │ investwise/frontend:1.0  │ 2        │ 256Mi/500m   │ 2-5 (CPU 70%)│
│ backend           │ investwise/backend:1.0   │ 2        │ 512Mi/500m   │ 2-5 (CPU 70%)│
│ ai-service        │ investwise/ai:1.0        │ 1        │ 1Gi/1000m    │ 1-3 (CPU 80%)│
└─────────────────────────────────────────────────────────────────────────────────────────┘

STATEFULSETS
════════════
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Name              │ Image                    │ Replicas │ Storage      │               │
├───────────────────┼──────────────────────────┼──────────┼──────────────┼───────────────┤
│ mongodb           │ mongo:7                  │ 1        │ 10Gi PVC     │               │
│ redis             │ redis:7-alpine           │ 1        │ 1Gi PVC      │               │
│ kafka             │ bitnami/kafka:3.6        │ 1        │ 5Gi PVC      │               │
│ zookeeper         │ bitnami/zookeeper:3.9    │ 1        │ 1Gi PVC      │               │
│ ollama            │ ollama/ollama:latest     │ 1        │ 10Gi PVC     │               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

SERVICES
════════
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Name              │ Type         │ Port     │ Target Port │                             │
├───────────────────┼──────────────┼──────────┼─────────────┼─────────────────────────────┤
│ frontend          │ ClusterIP    │ 80       │ 3000        │                             │
│ backend           │ ClusterIP    │ 80       │ 3001        │                             │
│ ai-service        │ ClusterIP    │ 80       │ 8000        │                             │
│ mongodb           │ ClusterIP    │ 27017    │ 27017       │                             │
│ redis             │ ClusterIP    │ 6379     │ 6379        │                             │
│ kafka             │ ClusterIP    │ 9092     │ 9092        │                             │
│ ollama            │ ClusterIP    │ 11434    │ 11434       │                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

INGRESS
═══════
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Host                   │ Path        │ Service      │ Port │                            │
├────────────────────────┼─────────────┼──────────────┼──────┼────────────────────────────┤
│ investwise.local       │ /           │ frontend     │ 80   │                            │
│ investwise.local       │ /api        │ backend      │ 80   │                            │
│ investwise.local       │ /ws         │ backend      │ 80   │                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Docker Compose (Development)

```yaml
Services:
  - frontend (React)
  - backend (Express)
  - ai-service (FastAPI)
  - mongodb
  - redis
  - zookeeper
  - kafka
  - ollama
```

---

## 11. Timeline

### 11.1 7-Week Implementation Plan

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              IMPLEMENTATION TIMELINE                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘

WEEK 1-2: FOUNDATION
════════════════════
□ Project setup (monorepo structure)
□ Docker Compose for local dev
□ MongoDB + Redis + Kafka setup
□ Backend: Express + TypeScript boilerplate
□ Auth: Register, Login, JWT
□ 2FA: TOTP setup, verification
□ Rate limiting middleware
□ Security headers

WEEK 3: PORTFOLIO
═════════════════
□ Portfolio CRUD APIs
□ Holdings CRUD APIs
□ Market search (Yahoo Finance)
□ Mutual fund search (MFAPI)
□ Redis caching for search
□ Frontend: Login/Register pages

WEEK 4: FRONTEND
════════════════
□ Dashboard page
□ Portfolio list/detail
□ Search & add holdings
□ Zustand + React Query setup
□ Tailwind + shadcn/ui components

WEEK 5: AI + ANALYSIS
═════════════════════
□ AI service (FastAPI)
□ RiskAnalyzer (quantitative + AI)
□ SentimentAnalyzer
□ RecommendationGenerator
□ Kafka integration
□ Analysis results page

WEEK 6: REAL-TIME + ALERTS
══════════════════════════
□ WebSocket server
□ Price alerts CRUD
□ Alert checking service
□ Notifications system
□ Daily news digest (cron)
□ Email service (NodeMailer)

WEEK 7: DEPLOYMENT
══════════════════
□ Kubernetes manifests
□ GitHub Actions CI/CD
□ Testing (unit + integration)
□ Documentation
□ Final polish

TOTAL: 7 WEEKS | COST: $0
```

---

## Summary

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend | React + Vite + TypeScript | Ready |
| Backend | Express + TypeScript | Ready |
| Database | MongoDB | Ready |
| Cache | Redis | Ready |
| Queue | Apache Kafka | Ready |
| AI | Python + FastAPI + Ollama | Ready |
| Containers | Docker | Ready |
| Orchestration | Kubernetes | Ready |

**AI Approach**: Hybrid (Quantitative Metrics + AI Qualitative Analysis)
**Cost**: $0 (all free/local)
**Timeline**: 7 weeks
