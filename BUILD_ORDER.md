# InvestWise - Build Order

This document outlines the exact sequence in which components will be created. Each step builds upon the previous one.

---

## Phase 1: Infrastructure Setup

### Step 1.1: Docker Compose Configuration ✅
**Status**: Completed
```
Files:
├── docker-compose.yml          ✅ Created
```

### Step 1.2: MongoDB Initialization Script
```
Files to create:
├── docker/
│   └── mongo-init.js           # Database & user setup
```

**Creates:**
- `investwise` database
- Application user with read/write permissions
- Initial indexes for User and Portfolio collections

---

## Phase 2: Backend Service (Node.js/Express)

### Step 2.1: Project Initialization
```
Files to create:
├── backend/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
```

### Step 2.2: Core Configuration
```
Files to create:
├── backend/src/
│   ├── index.js                # Express app entry point
│   └── config/
│       ├── db.js               # MongoDB connection
│       ├── redis.js            # Redis connection
│       └── kafka.js            # Kafka client setup
```

### Step 2.3: Models (Database Schemas)
```
Files to create:
├── backend/src/models/
│   ├── index.js                # Model exports
│   ├── User.js                 # User schema
│   └── Portfolio.js            # Portfolio schema with holdings
```

### Step 2.4: Security Middleware
```
Files to create:
├── backend/src/middleware/
│   ├── auth.js                 # JWT authentication
│   ├── rateLimiter.js          # Redis-backed rate limiting
│   └── validator.js            # Input validation & sanitization
```

### Step 2.5: Authentication System
```
Files to create:
├── backend/src/controllers/
│   └── authController.js       # Register, Login, Refresh
├── backend/src/routes/
│   └── auth.js                 # Auth routes
└── backend/src/services/
    └── authService.js          # Token generation, password hashing
```

### Step 2.6: Portfolio Management
```
Files to create:
├── backend/src/controllers/
│   ├── portfolioController.js  # CRUD operations
│   └── importController.js     # CSV import handling
├── backend/src/routes/
│   └── portfolio.js            # Portfolio routes
└── backend/src/services/
    └── portfolioService.js     # Business logic
```

### Step 2.7: Kafka Integration
```
Files to create:
├── backend/src/services/
│   ├── kafkaProducer.js        # Send analysis requests
│   └── kafkaConsumer.js        # Receive & batch process results
├── backend/src/controllers/
│   └── analysisController.js   # Trigger analysis endpoint
└── backend/src/routes/
    └── analysis.js             # Analysis routes
```

### Step 2.8: Market Data Integration
```
Files to create:
├── backend/src/services/
│   └── marketDataService.js    # Finnhub API integration
├── backend/src/controllers/
│   └── marketController.js     # Market data endpoints
└── backend/src/routes/
    └── market.js               # Market routes
```

---

## Phase 3: AI Service (Python/FastAPI)

### Step 3.1: Project Initialization
```
Files to create:
├── ai-service/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
```

### Step 3.2: Core Configuration
```
Files to create:
├── ai-service/src/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   └── config/
│       ├── __init__.py
│       └── settings.py         # Environment configuration
```

### Step 3.3: Pydantic Models
```
Files to create:
├── ai-service/src/models/
│   ├── __init__.py
│   └── schemas.py              # Request/Response schemas
```

### Step 3.4: LLM Integration
```
Files to create:
├── ai-service/src/llm/
│   ├── __init__.py
│   └── ollama_client.py        # Ollama HTTP client
```

### Step 3.5: Tools Layer
```
Files to create:
├── ai-service/src/tools/
│   ├── __init__.py
│   ├── base_tool.py            # Abstract base tool
│   ├── calculator_tool.py      # Financial calculations
│   ├── portfolio_tool.py       # Portfolio analysis utilities
│   └── serper_tool.py          # Web search (optional)
```

### Step 3.6: Agents Layer
```
Files to create:
├── ai-service/src/agents/
│   ├── __init__.py
│   ├── base_agent.py           # ReAct agent base class
│   ├── orchestrator.py         # Multi-agent coordinator
│   ├── research_agent.py       # Market research
│   ├── analyst_agent.py        # Portfolio metrics
│   └── risk_agent.py           # Risk assessment
```

### Step 3.7: Kafka Integration
```
Files to create:
├── ai-service/src/consumers/
│   ├── __init__.py
│   └── analysis_consumer.py    # Consume analysis requests
├── ai-service/src/producers/
│   ├── __init__.py
│   └── result_producer.py      # Send analysis results
└── ai-service/src/services/
    ├── __init__.py
    └── portfolio_analyzer.py   # Orchestrates full analysis
```

---

## Phase 4: Frontend Service (React/TypeScript)

### Step 4.1: Project Initialization
```
Commands:
$ cd frontend
$ npm create vite@latest . -- --template react-ts
$ npm install tailwindcss postcss autoprefixer
$ npx tailwindcss init -p

Files to create:
├── frontend/
│   ├── Dockerfile
│   ├── tailwind.config.js      # Tailwind configuration
│   └── .env.example
```

### Step 4.2: Core Setup
```
Files to create:
├── frontend/src/
│   ├── main.tsx                # App entry point
│   ├── App.tsx                 # Root component with routing
│   └── styles/
│       └── index.css           # Tailwind imports
```

### Step 4.3: API & State Management
```
Files to create:
├── frontend/src/services/
│   ├── api.ts                  # Axios instance with interceptors
│   ├── authService.ts          # Auth API calls
│   ├── portfolioService.ts     # Portfolio API calls
│   └── marketService.ts        # Market data API calls
├── frontend/src/stores/
│   ├── authStore.ts            # Zustand auth state
│   ├── portfolioStore.ts       # Zustand portfolio state
│   └── marketStore.ts          # Zustand market state
└── frontend/src/hooks/
    ├── useAuth.ts              # Auth hook
    ├── usePortfolio.ts         # Portfolio hook
    └── useMarketData.ts        # Market data hook
```

### Step 4.4: Common Components
```
Files to create:
├── frontend/src/components/common/
│   ├── Navbar.tsx              # Top navigation
│   ├── Sidebar.tsx             # Side navigation
│   ├── LoadingSpinner.tsx      # Loading indicator
│   ├── ErrorBoundary.tsx       # Error handling
│   └── ProtectedRoute.tsx      # Auth route guard
```

### Step 4.5: Authentication Pages
```
Files to create:
├── frontend/src/pages/auth/
│   ├── LoginPage.tsx           # Login form
│   └── RegisterPage.tsx        # Registration form
├── frontend/src/components/auth/
│   ├── LoginForm.tsx           # Login form component
│   └── RegisterForm.tsx        # Register form component
```

### Step 4.6: Home Page & Market Data
```
Files to create:
├── frontend/src/pages/home/
│   └── HomePage.tsx            # Dashboard home
├── frontend/src/components/market/
│   ├── MarketOverview.tsx      # Market summary
│   ├── StockTicker.tsx         # Real-time ticker
│   └── StockCard.tsx           # Individual stock display
```

### Step 4.7: Portfolio Pages
```
Files to create:
├── frontend/src/pages/portfolio/
│   ├── PortfolioListPage.tsx   # List all portfolios
│   ├── PortfolioCreatePage.tsx # Create new portfolio
│   ├── PortfolioDetailPage.tsx # View portfolio details
│   └── PortfolioAnalysisPage.tsx # View analysis results
├── frontend/src/components/portfolio/
│   ├── PortfolioCard.tsx       # Portfolio summary card
│   ├── HoldingsTable.tsx       # Holdings data table
│   ├── CSVImporter.tsx         # CSV upload & parse
│   ├── AnalysisResults.tsx     # Analysis display
│   └── AnalysisLoading.tsx     # Analysis in-progress state
```

### Step 4.8: Profile Page
```
Files to create:
├── frontend/src/pages/profile/
│   └── ProfilePage.tsx         # User profile & settings
├── frontend/src/components/profile/
│   ├── ProfileForm.tsx         # Edit profile
│   └── PreferencesForm.tsx     # User preferences
```

---

## Phase 5: Integration & Testing

### Step 5.1: Docker Compose Verification
```
Commands:
$ docker-compose up -d mongodb redis zookeeper kafka
$ docker-compose logs -f
```

### Step 5.2: Backend Testing
```
Commands:
$ cd backend && npm test
$ curl http://localhost:3001/health
```

### Step 5.3: AI Service Testing
```
Commands:
$ cd ai-service && pytest
$ curl http://localhost:8000/health
```

### Step 5.4: End-to-End Testing
```
Test scenarios:
1. User registration → Login → JWT received
2. Create portfolio → Import CSV → View holdings
3. Trigger analysis → Kafka message sent
4. AI processes → Result returned → DB updated
5. Frontend displays analysis results
```

### Step 5.5: Load Testing
```
Commands:
$ npm install -g artillery
$ artillery run load-test.yml  # Simulate 1000 concurrent analyses
```

---

## Build Sequence Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           BUILD SEQUENCE                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: Infrastructure                                                    │
│  ─────────────────────────                                                  │
│  [1.1] docker-compose.yml ✅                                                │
│    │                                                                        │
│    ▼                                                                        │
│  [1.2] mongo-init.js                                                        │
│    │                                                                        │
│    ▼                                                                        │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  PHASE 2: Backend                    PHASE 3: AI Service                    │
│  ───────────────────                 ──────────────────                     │
│  [2.1] Project Init                  [3.1] Project Init                     │
│    │                                   │                                    │
│    ▼                                   ▼                                    │
│  [2.2] Config (DB/Redis/Kafka)  ←──► [3.2] Config (Settings)                │
│    │                                   │                                    │
│    ▼                                   ▼                                    │
│  [2.3] Models                        [3.3] Pydantic Models                  │
│    │                                   │                                    │
│    ▼                                   ▼                                    │
│  [2.4] Security Middleware           [3.4] LLM Client                       │
│    │                                   │                                    │
│    ▼                                   ▼                                    │
│  [2.5] Auth System                   [3.5] Tools Layer                      │
│    │                                   │                                    │
│    ▼                                   ▼                                    │
│  [2.6] Portfolio CRUD                [3.6] Agents Layer                     │
│    │                                   │                                    │
│    ▼                                   ▼                                    │
│  [2.7] Kafka Producer/Consumer  ←──► [3.7] Kafka Consumer/Producer          │
│    │                                   │                                    │
│    ▼                                   │                                    │
│  [2.8] Market Data                     │                                    │
│    │                                   │                                    │
│    └───────────────┬───────────────────┘                                    │
│                    ▼                                                        │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  PHASE 4: Frontend                                                          │
│  ─────────────────                                                          │
│  [4.1] Project Init (Vite + Tailwind)                                       │
│    │                                                                        │
│    ▼                                                                        │
│  [4.2] Core Setup                                                           │
│    │                                                                        │
│    ▼                                                                        │
│  [4.3] API & State (Zustand)                                                │
│    │                                                                        │
│    ▼                                                                        │
│  [4.4] Common Components                                                    │
│    │                                                                        │
│    ├──► [4.5] Auth Pages                                                    │
│    │                                                                        │
│    ├──► [4.6] Home & Market                                                 │
│    │                                                                        │
│    ├──► [4.7] Portfolio Pages                                               │
│    │                                                                        │
│    └──► [4.8] Profile Page                                                  │
│                    │                                                        │
│                    ▼                                                        │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  PHASE 5: Integration & Testing                                             │
│  ──────────────────────────────                                             │
│  [5.1] Docker Compose Verify                                                │
│    │                                                                        │
│    ▼                                                                        │
│  [5.2] Backend Tests                                                        │
│    │                                                                        │
│    ▼                                                                        │
│  [5.3] AI Service Tests                                                     │
│    │                                                                        │
│    ▼                                                                        │
│  [5.4] E2E Tests                                                            │
│    │                                                                        │
│    ▼                                                                        │
│  [5.5] Load Testing                                                         │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## File Creation Checklist

### Infrastructure (2 files)
- [ ] `docker-compose.yml` ✅
- [ ] `docker/mongo-init.js`

### Backend (20 files)
- [ ] `backend/package.json`
- [ ] `backend/Dockerfile`
- [ ] `backend/src/index.js`
- [ ] `backend/src/config/db.js`
- [ ] `backend/src/config/redis.js`
- [ ] `backend/src/config/kafka.js`
- [ ] `backend/src/models/index.js`
- [ ] `backend/src/models/User.js`
- [ ] `backend/src/models/Portfolio.js`
- [ ] `backend/src/middleware/auth.js`
- [ ] `backend/src/middleware/rateLimiter.js`
- [ ] `backend/src/middleware/validator.js`
- [ ] `backend/src/controllers/authController.js`
- [ ] `backend/src/controllers/portfolioController.js`
- [ ] `backend/src/controllers/analysisController.js`
- [ ] `backend/src/routes/auth.js`
- [ ] `backend/src/routes/portfolio.js`
- [ ] `backend/src/routes/analysis.js`
- [ ] `backend/src/services/kafkaProducer.js`
- [ ] `backend/src/services/kafkaConsumer.js`

### AI Service (18 files)
- [ ] `ai-service/requirements.txt`
- [ ] `ai-service/Dockerfile`
- [ ] `ai-service/src/__init__.py`
- [ ] `ai-service/src/main.py`
- [ ] `ai-service/src/config/__init__.py`
- [ ] `ai-service/src/config/settings.py`
- [ ] `ai-service/src/models/__init__.py`
- [ ] `ai-service/src/models/schemas.py`
- [ ] `ai-service/src/llm/__init__.py`
- [ ] `ai-service/src/llm/ollama_client.py`
- [ ] `ai-service/src/tools/__init__.py`
- [ ] `ai-service/src/tools/base_tool.py`
- [ ] `ai-service/src/tools/calculator_tool.py`
- [ ] `ai-service/src/agents/__init__.py`
- [ ] `ai-service/src/agents/base_agent.py`
- [ ] `ai-service/src/agents/orchestrator.py`
- [ ] `ai-service/src/consumers/analysis_consumer.py`
- [ ] `ai-service/src/producers/result_producer.py`

### Frontend (25+ files)
- [ ] `frontend/package.json`
- [ ] `frontend/Dockerfile`
- [ ] `frontend/tailwind.config.js`
- [ ] `frontend/src/main.tsx`
- [ ] `frontend/src/App.tsx`
- [ ] `frontend/src/services/api.ts`
- [ ] `frontend/src/services/authService.ts`
- [ ] `frontend/src/services/portfolioService.ts`
- [ ] `frontend/src/stores/authStore.ts`
- [ ] `frontend/src/stores/portfolioStore.ts`
- [ ] `frontend/src/components/common/Navbar.tsx`
- [ ] `frontend/src/components/common/ProtectedRoute.tsx`
- [ ] `frontend/src/pages/auth/LoginPage.tsx`
- [ ] `frontend/src/pages/auth/RegisterPage.tsx`
- [ ] `frontend/src/pages/home/HomePage.tsx`
- [ ] `frontend/src/pages/portfolio/PortfolioListPage.tsx`
- [ ] `frontend/src/pages/portfolio/PortfolioDetailPage.tsx`
- [ ] `frontend/src/components/portfolio/CSVImporter.tsx`
- [ ] `frontend/src/components/portfolio/AnalysisResults.tsx`
- [ ] ... (additional components)

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Infrastructure | 0.5 day | 0.5 days |
| Phase 2: Backend | 2 days | 2.5 days |
| Phase 3: AI Service | 2 days | 4.5 days |
| Phase 4: Frontend | 3 days | 7.5 days |
| Phase 5: Integration | 1.5 days | 9 days |

**Total Estimated Time**: ~9 days

---

## Next Step

**Ready to begin?** Start with:

```bash
# Step 1.2: Create MongoDB initialization script
touch docker/mongo-init.js
```

Then proceed to Phase 2: Backend Service initialization.
