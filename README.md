# 🚀 InvestWise - AI-Powered Investment Portfolio Analyzer

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=for-the-badge&logo=apache-kafka&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326ce5?style=for-the-badge&logo=kubernetes&logoColor=white)

**A full-stack investment portfolio management system with AI-powered risk analysis**

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Tech Stack](#-tech-stack) • [AI Approach](#-ai-approach)

</div>

---

## 📋 Overview

InvestWise is a **portfolio project** demonstrating modern full-stack development with AI integration. It helps users track their stock and mutual fund investments, analyze portfolio risk using AI, and receive real-time alerts.

### Key Highlights

- 🔐 **Enterprise Security**: 2FA, encryption, rate limiting
- 🤖 **Hybrid AI Analysis**: Quantitative metrics + LLM insights
- ⚡ **Real-Time**: WebSocket alerts, Kafka event streaming
- 📊 **Smart Recommendations**: Personalized investment advice
- 🐳 **Production-Ready**: Docker + Kubernetes deployment

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Portfolio Management** | Create portfolios, add stocks/MFs with live prices |
| **AI Risk Analysis** | Color-coded risk assessment (🟢 Safe / 🟡 Moderate / 🔴 Risky) |
| **Price Alerts** | Real-time notifications when prices hit targets |
| **Daily News Digest** | Morning digest with AI sentiment analysis |
| **2FA Authentication** | TOTP + backup codes for account security |

### Security Features

- ✅ Two-Factor Authentication (Google Authenticator)
- ✅ AES-256-GCM Encryption for sensitive data
- ✅ Tiered Rate Limiting (Redis-backed)
- ✅ bcrypt Password Hashing (cost factor 12)
- ✅ JWT + Refresh Token rotation

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INVESTWISE ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │   Client    │
                                    │   (React)   │
                                    └──────┬──────┘
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                              ▼            ▼            ▼
                        ┌──────────┐ ┌──────────┐ ┌──────────┐
                        │ REST API │ │WebSocket │ │ Static   │
                        │  :3001   │ │  :3002   │ │  :3000   │
                        └────┬─────┘ └────┬─────┘ └──────────┘
                             │            │
                             ▼            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SERVICES                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Backend   │  │ AI Service  │  │   Alert     │  │    News     │       │
│  │  (Express)  │  │  (FastAPI)  │  │   Service   │  │   Service   │       │
│  │   :3001     │  │   :8000     │  │   :3002     │  │   :8001     │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │                │              │
│         └────────────────┼────────────────┼────────────────┘              │
│                          │                │                               │
│                          ▼                ▼                               │
│                    ┌──────────┐     ┌──────────┐                         │
│                    │  Ollama  │     │  Kafka   │                         │
│                    │ (LLM)    │     │ (Events) │                         │
│                    └──────────┘     └──────────┘                         │
│                                                                           │
└────────────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ MongoDB  │   │  Redis   │   │ Ollama   │
        │ (Data)   │   │ (Cache)  │   │ (LLM)    │
        └──────────┘   └──────────┘   └──────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- 8GB+ RAM (for Ollama LLM)

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/investwise.git
cd investwise

# Copy environment file
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Generate JWT secret (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key (32-byte hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start Services

```bash
# Start all services with Docker Compose
docker-compose up -d

# Pull the LLM model (first time only)
docker exec -it investwise-ollama-1 ollama pull llama3.1:8b

# Check status
docker-compose ps
```

### 4. Access Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| AI Service | http://localhost:8000 |

---

## 🛠 Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | REST API server |
| **TypeScript** | Type safety |
| **MongoDB + Mongoose** | Document database |
| **Redis + ioredis** | Caching, rate limiting |
| **Kafka + kafkajs** | Event streaming |
| **JWT** | Authentication |
| **bcrypt** | Password hashing |
| **speakeasy** | 2FA TOTP |

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI library |
| **Vite** | Build tool |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Zustand** | State management |
| **React Query** | Data fetching |
| **Recharts** | Charts & graphs |

### AI Service

| Technology | Purpose |
|------------|---------|
| **Python + FastAPI** | API server |
| **Ollama** | Local LLM runtime |
| **Llama 3.1 8B** | Language model |
| **httpx** | HTTP client |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local orchestration |
| **Kubernetes** | Production deployment |
| **Minikube** | Local K8s testing |

---

## 🤖 AI Approach

### Why NOT LangChain/CrewAI?

| Framework | Why We Didn't Use It |
|-----------|---------------------|
| **LangChain** | Heavy abstraction overhead for simple API calls |
| **CrewAI** | Multi-agent debate is overkill for deterministic portfolio analysis |
| **LangGraph** | Our analysis flow is linear, not graph-based |

### Our Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID AI ANALYSIS                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────┐     ┌─────────────────────────┐
    │   QUANTITATIVE          │     │   AI QUALITATIVE        │
    │   (No LLM - Fast)       │     │   (Ollama - Insights)   │
    ├─────────────────────────┤     ├─────────────────────────┤
    │ • Sector concentration  │     │ • Risk reasoning        │
    │ • Single stock risk     │     │ • Market context        │
    │ • Volatility score      │     │ • Recommendations       │
    │ • P&L calculations      │     │ • Sentiment analysis    │
    └───────────┬─────────────┘     └───────────┬─────────────┘
                │                               │
                └───────────────┬───────────────┘
                                │
                                ▼
                    ┌───────────────────────────┐
                    │     COMBINED RESULT       │
                    │  Accurate + Insightful    │
                    └───────────────────────────┘
```

### Key Principles

1. **Direct HTTP Calls**: No framework overhead, just simple Ollama API calls
2. **Structured JSON Prompts**: Predictable, parseable outputs
3. **Low Temperature (0.3)**: Consistent, reproducible results
4. **Rule-Based Fallbacks**: System never fails, always returns result
5. **Quantitative First**: Math-based metrics are always accurate

---

## 📁 Project Structure

```
investwise/
├── backend/                    # Express + TypeScript API
│   ├── src/
│   │   ├── config/            # DB, Redis, Kafka config
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, rate limiting
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   └── app.ts            # Entry point
│   └── package.json
│
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Page components
│   │   ├── stores/            # Zustand stores
│   │   ├── hooks/             # Custom hooks
│   │   └── App.tsx           # Root component
│   └── package.json
│
├── ai-service/                 # Python FastAPI
│   ├── app/
│   │   ├── analyzers/         # Risk, sentiment, recommendations
│   │   ├── utils/             # Ollama client
│   │   └── main.py           # FastAPI app
│   └── requirements.txt
│
├── alert-service/              # Real-time alerts
├── news-service/               # Daily news digest
├── docker-compose.yml
└── k8s/                       # Kubernetes manifests
```

---

## 📊 API Endpoints

### Authentication

```
POST /api/auth/register        # Create account
POST /api/auth/login           # Login (returns temp token if 2FA)
POST /api/auth/verify-2fa      # Verify 2FA code
POST /api/auth/enable-2fa      # Setup 2FA
POST /api/auth/refresh         # Refresh access token
```

### Portfolio

```
GET    /api/portfolios         # List user's portfolios
POST   /api/portfolios         # Create portfolio
GET    /api/portfolios/:id     # Get portfolio with holdings
DELETE /api/portfolios/:id     # Delete portfolio
```

### Holdings

```
POST   /api/holdings           # Add holding to portfolio
PUT    /api/holdings/:id       # Update holding
DELETE /api/holdings/:id       # Remove holding
```

### Market Data

```
GET /api/market/search?q=      # Search stocks/MFs
GET /api/market/quote/:symbol  # Get live price
```

### AI Analysis

```
POST /api/ai/analyze/:portfolioId  # Run AI analysis
```

### Alerts

```
GET    /api/alerts             # List user's alerts
POST   /api/alerts             # Create price alert
DELETE /api/alerts/:id         # Delete alert
```

---

## 🔧 Development

### Local Development (Without Docker)

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: AI Service
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

---

## 🚢 Deployment

### Kubernetes (Minikube)

```bash
# Start Minikube
minikube start --memory=8192 --cpus=4

# Apply configs
kubectl apply -f k8s/

# Get service URL
minikube service frontend-service --url
```

---

## 📈 Skills Demonstrated

| Category | Skills |
|----------|--------|
| **Backend** | REST API, TypeScript, MongoDB, Redis, Kafka |
| **Frontend** | React, Vite, Zustand, Tailwind, WebSockets |
| **AI/ML** | LLM integration, prompt engineering, sentiment analysis |
| **Security** | 2FA, encryption, rate limiting, JWT |
| **DevOps** | Docker, Kubernetes, microservices |
| **Architecture** | Event-driven, caching, fallback patterns |

---

## 📝 License

MIT License - feel free to use this for your portfolio!

---

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) for local LLM inference
- [Yahoo Finance](https://finance.yahoo.com/) for market data
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

<div align="center">

**Built with ❤️ for SDE interviews**

[⬆ Back to top](#-investwise---ai-powered-investment-portfolio-analyzer)

</div>
