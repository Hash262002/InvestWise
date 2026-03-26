# InvestWise - Complete Implementation Plan

## 📋 Overview

**Total Duration**: 4-6 weeks (Part-time, ~15-20 hrs/week)  
**Total Effort**: ~80-100 hours

```
Week 1-2: Foundation (Backend + Database + Auth)
Week 3:   Frontend + Portfolio Features
Week 4:   AI Integration + Analysis
Week 5:   Alerts, News, Real-time Features
Week 6:   Docker, K8s, Polish, Documentation
```

---

## 📅 Week 1: Project Setup & Authentication

### Day 1-2: Environment Setup

#### Tasks:
- [ ] Create project folder structure
- [ ] Initialize Git repository
- [ ] Setup backend (Express + TypeScript)
- [ ] Setup frontend (Vite + React + TypeScript)
- [ ] Configure ESLint, Prettier
- [ ] Create docker-compose.yml skeleton

#### Commands:
```bash
# Create project structure
mkdir -p investwise/{backend,frontend,ai-service,alert-service,news-service,k8s}
cd investwise

# Initialize Git
git init
echo "node_modules/\n.env\n*.log\ndist/" > .gitignore

# Backend setup
cd backend
npm init -y
npm install express cors helmet mongoose ioredis kafkajs jsonwebtoken bcryptjs dotenv
npm install -D typescript @types/node @types/express @types/cors ts-node nodemon

# Create tsconfig.json
npx tsc --init

# Frontend setup
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install @tanstack/react-query zustand axios react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### Deliverables:
- [x] Working Express server with `/health` endpoint
- [x] Working React app with Tailwind
- [x] Docker Compose with MongoDB and Redis running

---

### Day 3-4: Database Models & Connection

#### Tasks:
- [ ] Setup MongoDB connection with Mongoose
- [ ] Create User model with 2FA fields
- [ ] Create Portfolio model
- [ ] Create Holding model
- [ ] Create Alert model
- [ ] Add database indexes

#### Code to Write:
```
backend/src/
├── config/
│   ├── db.ts           # MongoDB connection
│   └── redis.ts        # Redis connection
├── models/
│   ├── User.ts         # User schema
│   ├── Portfolio.ts    # Portfolio schema
│   ├── Holding.ts      # Holding schema
│   └── Alert.ts        # Alert schema
```

#### Test:
```bash
# Start MongoDB
docker-compose up -d mongo

# Run backend
npm run dev

# Test connection (should log "MongoDB Connected")
```

#### Deliverables:
- [x] All Mongoose models created
- [x] Database connection working
- [x] Indexes created on frequently queried fields

---

### Day 5-7: Authentication System

#### Tasks:
- [ ] Implement registration endpoint
- [ ] Implement login endpoint
- [ ] Add JWT token generation
- [ ] Create auth middleware
- [ ] Setup refresh token rotation
- [ ] Add rate limiting for auth endpoints

#### Code to Write:
```
backend/src/
├── controllers/
│   └── authController.ts     # Register, Login, Refresh
├── middleware/
│   ├── auth.ts               # JWT verification
│   └── rateLimiter.ts        # Rate limiting
├── services/
│   └── authService.ts        # Token generation
├── routes/
│   └── auth.ts               # Auth routes
```

#### API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (step 1) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

#### Test with cURL:
```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'
```

#### Deliverables:
- [x] User can register
- [x] User can login and receive JWT
- [x] Protected routes require valid token
- [x] Rate limiting prevents brute force

---

## 📅 Week 2: 2FA & Security Features

### Day 1-2: Two-Factor Authentication

#### Tasks:
- [ ] Install speakeasy and qrcode packages
- [ ] Create 2FA service
- [ ] Implement encryption service
- [ ] Add 2FA setup endpoint
- [ ] Add 2FA verification endpoint
- [ ] Generate backup codes

#### Code to Write:
```
backend/src/
├── services/
│   ├── twoFactorService.ts    # TOTP generation/verification
│   └── encryptionService.ts   # AES-256-GCM encryption
```

#### New Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/enable-2fa` | Start 2FA setup, get QR code |
| POST | `/api/auth/confirm-2fa` | Verify code and activate |
| POST | `/api/auth/verify-2fa` | Login step 2 (if 2FA enabled) |
| POST | `/api/auth/disable-2fa` | Disable 2FA |

#### Test:
1. Call `/enable-2fa` → Get QR code
2. Scan with Google Authenticator
3. Call `/confirm-2fa` with code → 2FA activated
4. Login → Get `requires2FA: true`
5. Call `/verify-2fa` with TOTP → Get tokens

#### Deliverables:
- [x] 2FA can be enabled/disabled
- [x] QR code generated for authenticator apps
- [x] Backup codes generated and encrypted
- [x] Login flow handles 2FA

---

### Day 3-4: Rate Limiting & Security Headers

#### Tasks:
- [ ] Implement tiered rate limiting
- [ ] Add Helmet.js for security headers
- [ ] Setup CORS properly
- [ ] Add request logging
- [ ] Implement IP blocking for failed attempts

#### Rate Limiting Tiers:
| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth endpoints | 5 | 15 min |
| 2FA verification | 3 | 5 min |
| General API | 100 | 1 min |
| AI Analysis | 5 | 1 hour |

#### Deliverables:
- [x] Rate limiting working on all endpoints
- [x] Security headers set
- [x] Audit logging implemented

---

### Day 5-7: Kafka Setup

#### Tasks:
- [ ] Add Kafka to docker-compose
- [ ] Create Kafka producer/consumer config
- [ ] Define topic structure
- [ ] Test message publishing

#### Topics to Create:
```
portfolio.events   - Portfolio CRUD events
price.updates      - Real-time price changes
alerts.triggered   - Alert notifications
news.sentiment     - Analyzed news articles
```

#### Code to Write:
```
backend/src/
├── config/
│   └── kafka.ts    # Kafka connection + topics
```

#### Test:
```bash
# Start Kafka
docker-compose up -d kafka zookeeper

# Test producer (in backend)
await producer.send({
  topic: 'portfolio.events',
  messages: [{ key: 'test', value: 'Hello Kafka!' }]
});
```

#### Deliverables:
- [x] Kafka running in Docker
- [x] Producer can send messages
- [x] Consumer can receive messages

---

## 📅 Week 3: Frontend & Portfolio Features

### Day 1-2: Frontend Auth UI

#### Tasks:
- [ ] Create auth store (Zustand)
- [ ] Build Login page
- [ ] Build Register page
- [ ] Build 2FA verification page
- [ ] Add protected route wrapper
- [ ] Setup API service with interceptors

#### Pages to Create:
```
frontend/src/
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── TwoFactorPage.tsx
├── stores/
│   └── authStore.ts
├── services/
│   └── api.ts
├── components/
│   └── auth/
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       └── TwoFactorInput.tsx
```

#### Deliverables:
- [x] User can register via UI
- [x] User can login via UI
- [x] 2FA flow works in UI
- [x] Token refresh handled automatically

---

### Day 3-4: Portfolio CRUD Backend

#### Tasks:
- [ ] Create portfolio controller
- [ ] Implement CRUD endpoints
- [ ] Add holdings sub-routes
- [ ] Validate user ownership

#### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolios` | List user's portfolios |
| POST | `/api/portfolios` | Create portfolio |
| GET | `/api/portfolios/:id` | Get portfolio with holdings |
| PUT | `/api/portfolios/:id` | Update portfolio |
| DELETE | `/api/portfolios/:id` | Delete portfolio |
| POST | `/api/portfolios/:id/holdings` | Add holding |
| PUT | `/api/holdings/:id` | Update holding |
| DELETE | `/api/holdings/:id` | Remove holding |

#### Code to Write:
```
backend/src/
├── controllers/
│   ├── portfolioController.ts
│   └── holdingController.ts
├── routes/
│   ├── portfolio.ts
│   └── holdings.ts
```

#### Deliverables:
- [x] All CRUD operations working
- [x] User can only access own portfolios
- [x] Holdings linked to portfolios

---

### Day 5-7: Portfolio UI & Market Data

#### Tasks:
- [ ] Build Dashboard page
- [ ] Build Portfolio detail page
- [ ] Create asset search component
- [ ] Integrate Yahoo Finance API
- [ ] Cache search results in Redis

#### Components to Create:
```
frontend/src/
├── pages/
│   ├── DashboardPage.tsx
│   └── PortfolioPage.tsx
├── components/
│   ├── portfolio/
│   │   ├── PortfolioCard.tsx
│   │   ├── CreatePortfolioModal.tsx
│   │   └── PortfolioSummary.tsx
│   └── holdings/
│       ├── HoldingsList.tsx
│       ├── HoldingRow.tsx
│       ├── AddHoldingModal.tsx
│       └── AssetSearch.tsx
```

#### Backend - Market Service:
```typescript
// backend/src/services/marketDataService.ts
export const searchAssets = async (query: string) => { ... }
export const getQuote = async (symbol: string) => { ... }
```

#### Deliverables:
- [x] Dashboard shows all portfolios
- [x] Portfolio page shows holdings
- [x] User can search and add stocks
- [x] Live prices displayed

---

## 📅 Week 4: AI Integration

### Day 1-2: AI Service Setup (Python)

#### Tasks:
- [ ] Create FastAPI project
- [ ] Setup Ollama connection
- [ ] Create Ollama client utility
- [ ] Test with simple prompt

#### Commands:
```bash
cd ai-service
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn httpx pydantic

# Create project structure
mkdir -p app/{analyzers,utils}
touch app/{__init__.py,main.py}
touch app/analyzers/{__init__.py,risk_analyzer.py,sentiment_analyzer.py}
touch app/utils/{__init__.py,ollama_client.py}
```

#### Files to Create:
```
ai-service/
├── app/
│   ├── main.py              # FastAPI app
│   ├── analyzers/
│   │   ├── risk_analyzer.py
│   │   ├── sentiment_analyzer.py
│   │   └── recommendation_generator.py
│   └── utils/
│       └── ollama_client.py  # Direct HTTP calls
├── requirements.txt
└── Dockerfile
```

#### Test:
```bash
# Start Ollama (in Docker)
docker run -d -p 11434:11434 --name ollama ollama/ollama
docker exec ollama ollama pull llama3.1:8b

# Start AI service
uvicorn app.main:app --reload --port 8000

# Test health
curl http://localhost:8000/health
```

#### Deliverables:
- [x] FastAPI server running
- [x] Can call Ollama and get response
- [x] `/health` endpoint working

---

### Day 3-4: Risk Analyzer (Hybrid Approach)

#### Tasks:
- [ ] Implement quantitative metrics calculation
- [ ] Create AI analysis prompt
- [ ] Build hybrid combine logic
- [ ] Add fallback for AI failures

#### Quantitative Metrics (No AI):
```python
def _calculate_metrics(holdings, total_value):
    return {
        "sectorConcentration": {...},
        "maxSectorConcentration": 45.2,
        "singleStockRisks": [...],
        "volatilityScore": 6.5,
        "diversificationScore": 65,
        "holdingsCount": 5,
        "sectorsCount": 3
    }
```

#### AI Prompt Template:
```python
prompt = f"""You are a portfolio risk analyst. Analyze this portfolio.

PORTFOLIO DATA:
{holdings_summary}

CALCULATED METRICS:
- Sector concentration: {metrics['maxSectorConcentration']:.1f}%
- Volatility score: {metrics['volatilityScore']}/10

Respond with ONLY valid JSON:
{{
  "portfolioRiskScore": <0-100>,
  "portfolioRiskLevel": "<low|medium|high>",
  "holdingAnalysis": [...]
}}"""
```

#### Test:
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "holdings": [...],
    "totalValue": 100000,
    "userRiskTolerance": "moderate"
  }'
```

#### Deliverables:
- [x] Quantitative metrics calculated correctly
- [x] AI provides qualitative analysis
- [x] Fallback works when AI fails
- [x] Response includes both

---

### Day 5-7: Analysis UI & Integration

#### Tasks:
- [ ] Create analysis page
- [ ] Build result components (color-coded cards)
- [ ] Connect frontend to AI endpoint
- [ ] Add loading states
- [ ] Handle errors gracefully

#### Components:
```
frontend/src/
├── pages/
│   └── AnalysisPage.tsx
├── components/
│   └── analysis/
│       ├── AnalysisResults.tsx
│       ├── PortfolioRiskCard.tsx
│       ├── HoldingRiskCard.tsx
│       └── RecommendationsList.tsx
```

#### Color Coding:
| Risk Level | Color | Icon |
|------------|-------|------|
| Safe/Low | 🟢 Green | ✓ Check |
| Moderate/Medium | 🟡 Yellow | ⚠ Warning |
| Risky/High | 🔴 Red | ✗ X |

#### Deliverables:
- [x] Analysis page shows results
- [x] Holdings color-coded by risk
- [x] Recommendations displayed
- [x] "Analyze" button triggers AI

---

## 📅 Week 5: Real-time Features

### Day 1-2: Alert Service

#### Tasks:
- [ ] Create alert-service project
- [ ] Setup WebSocket server
- [ ] Connect to Kafka price.updates
- [ ] Implement alert checking logic
- [ ] Broadcast to connected users

#### Files:
```
alert-service/
├── src/
│   ├── index.ts
│   ├── priceChecker.ts
│   └── websocket.ts
├── package.json
└── Dockerfile
```

#### Logic Flow:
```
Kafka (price.updates) → Alert Service → Check active alerts → WebSocket → User
```

#### Deliverables:
- [x] Alert service running
- [x] Consumes price updates from Kafka
- [x] Checks alerts in Redis
- [x] Sends WebSocket notifications

---

### Day 3-4: Frontend WebSocket & Alerts UI

#### Tasks:
- [ ] Create useWebSocket hook
- [ ] Build notifications component
- [ ] Create alerts management page
- [ ] Add toast notifications
- [ ] Implement reconnection logic

#### Components:
```
frontend/src/
├── hooks/
│   └── useWebSocket.ts
├── pages/
│   └── AlertsPage.tsx
├── components/
│   └── alerts/
│       ├── CreateAlertModal.tsx
│       ├── AlertsList.tsx
│       └── NotificationToast.tsx
```

#### Deliverables:
- [x] User can create price alerts
- [x] WebSocket connects on login
- [x] Real-time notifications appear
- [x] Reconnection with exponential backoff

---

### Day 5-7: News Service & Daily Digest

#### Tasks:
- [ ] Create news-service (Python)
- [ ] Setup RSS feed parsing
- [ ] Integrate sentiment analyzer
- [ ] Schedule daily cron job
- [ ] Email digest template

#### Files:
```
news-service/
├── app/
│   ├── main.py
│   ├── aggregator.py      # RSS fetching
│   └── scheduler.py       # Cron jobs
├── requirements.txt
└── Dockerfile
```

#### Schedule:
- **6:00 AM IST**: Fetch news for all symbols
- **6:30 AM IST**: Analyze sentiment via AI service
- **7:00 AM IST**: Send email digests to users

#### Deliverables:
- [x] News service fetches RSS
- [x] Sentiment analysis working
- [x] Daily digest email sent
- [x] In-app notification created

---

## 📅 Week 6: DevOps & Polish

### Day 1-2: Docker & Docker Compose

#### Tasks:
- [ ] Create Dockerfile for each service
- [ ] Update docker-compose.yml
- [ ] Add health checks
- [ ] Configure networking
- [ ] Test full stack locally

#### Dockerfiles to Create:
```
backend/Dockerfile
frontend/Dockerfile
ai-service/Dockerfile
alert-service/Dockerfile
news-service/Dockerfile
```

#### Test:
```bash
# Build and run everything
docker-compose build
docker-compose up -d

# Check all services
docker-compose ps

# View logs
docker-compose logs -f backend
```

#### Deliverables:
- [x] All services containerized
- [x] `docker-compose up` starts everything
- [x] Services communicate properly

---

### Day 3-4: Kubernetes Manifests

#### Tasks:
- [ ] Create deployments for each service
- [ ] Create services for internal communication
- [ ] Create ConfigMaps and Secrets
- [ ] Setup Ingress
- [ ] Test on Minikube

#### K8s Files:
```
k8s/
├── namespace.yaml
├── configmap.yaml
├── secrets.yaml
├── backend-deployment.yaml
├── frontend-deployment.yaml
├── ai-service-deployment.yaml
├── mongodb-statefulset.yaml
├── redis-deployment.yaml
├── kafka-deployment.yaml
├── ingress.yaml
└── kustomization.yaml
```

#### Commands:
```bash
# Start Minikube
minikube start --memory=8192 --cpus=4

# Apply manifests
kubectl apply -f k8s/

# Check pods
kubectl get pods

# Get service URL
minikube service frontend --url
```

#### Deliverables:
- [x] All manifests created
- [x] App runs on Minikube
- [x] Ingress routes traffic

---

### Day 5-7: Testing, Documentation & Polish

#### Tasks:
- [ ] Write unit tests (Jest for backend)
- [ ] Add API tests (Supertest)
- [ ] Update README with setup instructions
- [ ] Create demo video/screenshots
- [ ] Final code cleanup
- [ ] Push to GitHub

#### Testing:
```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test
```

#### Documentation Checklist:
- [x] README.md with quick start
- [x] HLD.md with architecture
- [x] LLD.md with code details
- [x] ENHANCEMENTS.md with features
- [x] SKILLS_CHECKLIST.md for interviews
- [x] API documentation (Swagger/Postman)

#### Deliverables:
- [x] Tests passing
- [x] Documentation complete
- [x] Code pushed to GitHub
- [x] Demo ready

---

## 🎯 Final Checklist

### Features
- [ ] User registration & login
- [ ] Two-factor authentication
- [ ] Portfolio CRUD
- [ ] Holdings management
- [ ] Asset search (stocks, MFs)
- [ ] AI risk analysis
- [ ] Color-coded results
- [ ] Price alerts
- [ ] Daily news digest
- [ ] Real-time notifications

### Technical
- [ ] Express + TypeScript backend
- [ ] React + Vite frontend
- [ ] MongoDB with proper indexing
- [ ] Redis caching
- [ ] Kafka event streaming
- [ ] Python AI service
- [ ] Ollama LLM integration
- [ ] WebSocket real-time
- [ ] Docker containers
- [ ] Kubernetes manifests

### Security
- [ ] JWT authentication
- [ ] 2FA (TOTP)
- [ ] Password hashing (bcrypt)
- [ ] Data encryption (AES-256-GCM)
- [ ] Rate limiting
- [ ] Security headers

### Documentation
- [ ] README.md
- [ ] HLD.md
- [ ] LLD.md
- [ ] ENHANCEMENTS.md
- [ ] SKILLS_CHECKLIST.md
- [ ] API docs

---

## 📊 Time Estimates

| Week | Focus Area | Hours |
|------|------------|-------|
| 1 | Setup, DB, Auth | 15-20 |
| 2 | 2FA, Security, Kafka | 15-20 |
| 3 | Frontend, Portfolio | 15-20 |
| 4 | AI Integration | 15-20 |
| 5 | Real-time Features | 15-20 |
| 6 | DevOps, Polish | 10-15 |
| **Total** | | **85-115** |

---

## 🚨 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Ollama slow on CPU | Use smaller model (llama3.1:8b), add loading states |
| Yahoo Finance rate limited | Aggressive caching (5 min), batch requests |
| Kafka complex setup | Start with Docker, use Confluent images |
| 2FA testing tedious | Create test bypass for development |
| K8s learning curve | Start with Minikube, use kubectl cheatsheet |

---

## 🎉 Success Criteria

Your project is complete when:

1. ✅ User can register, login with 2FA
2. ✅ User can create portfolios and add holdings
3. ✅ User can search stocks/MFs with live prices
4. ✅ AI analysis shows color-coded risk results
5. ✅ Real-time price alerts work
6. ✅ Daily news digest is generated
7. ✅ Everything runs with `docker-compose up`
8. ✅ Kubernetes manifests deploy to Minikube
9. ✅ All documentation is complete
10. ✅ You can explain every design decision in an interview

---

Good luck! 🚀
