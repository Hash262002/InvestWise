# InvestWise - Implementation Plan

## Project Overview

InvestWise is a portfolio analysis platform that enables users to analyze their investment portfolios using AI. The system uses agentic AI powered by Ollama LLM for intelligent portfolio analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INVESTWISE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       REST API        ┌──────────────────┐                │
│  │   Frontend   │◄────────────────────►│     Backend      │                │
│  │   (React)    │                       │  (Node/Express)  │                │
│  │   Port:5173  │                       │    Port:3001     │                │
│  └──────────────┘                       └────────┬─────────┘                │
│                                                  │                          │
│                                         ┌────────▼─────────┐                │
│                                         │     MongoDB      │                │
│                                         │   Port:27017     │                │
│                                         └──────────────────┘                │
│                                                  │                          │
│                          ┌───────────────────────┼───────────────────────┐  │
│                          │                       │                       │  │
│                          ▼                       ▼                       │  │
│                 ┌────────────────┐      ┌────────────────┐              │  │
│                 │  Kafka Topic   │      │  Kafka Topic   │              │  │
│                 │  (analysis-    │      │  (analysis-    │              │  │
│                 │   requests)    │      │   results)     │              │  │
│                 └───────┬────────┘      └────────▲───────┘              │  │
│                         │                        │                       │  │
│                         │     ┌──────────────────┘                       │  │
│                         │     │                                          │  │
│                         ▼     │                                          │  │
│                 ┌─────────────────────┐                                  │  │
│                 │     AI Service      │                                  │  │
│                 │  (Python/FastAPI)   │◄────────┐                        │  │
│                 │     Port:8000       │         │                        │  │
│                 └─────────────────────┘         │                        │  │
│                         │                       │                        │  │
│                         ▼                       │                        │  │
│                 ┌─────────────────────┐  ┌──────┴───────┐                │  │
│                 │   Agentic AI        │  │    Ollama    │                │  │
│                 │  (Multi-Agent)      │  │  Port:11434  │                │  │
│                 │  - Research Agent   │  │  (Local LLM) │                │  │
│                 │  - Analyst Agent    │  └──────────────┘                │  │
│                 │  - Risk Agent       │                                  │  │
│                 └─────────────────────┘                                  │  │
│                                                                          │  │
│  Infrastructure: Redis (Caching/Rate Limiting), Zookeeper, Kafka-UI      │  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18, TypeScript, Tailwind CSS, Zustand | UI, State Management |
| Backend | Node.js, Express, MongoDB, Mongoose | REST API, Data Persistence |
| AI Service | Python 3.11, FastAPI, KafkaJS | AI Processing |
| LLM | Ollama (Llama3.2/Mistral) | Language Model |
| Message Queue | Apache Kafka | Async Communication |
| Cache | Redis | Rate Limiting, Caching |
| Database | MongoDB 7.0 | Document Storage |
| Container | Docker, Docker Compose | Containerization |

---

## Service Breakdown

### 1. Frontend Service (React)

#### Pages Structure:
```
src/
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── home/
│   │   └── HomePage.tsx
│   ├── portfolio/
│   │   ├── PortfolioListPage.tsx
│   │   ├── PortfolioCreatePage.tsx
│   │   ├── PortfolioDetailPage.tsx
│   │   └── PortfolioAnalysisPage.tsx
│   └── profile/
│       └── ProfilePage.tsx
├── components/
│   ├── common/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── LoadingSpinner.tsx
│   ├── portfolio/
│   │   ├── PortfolioCard.tsx
│   │   ├── HoldingsTable.tsx
│   │   ├── CSVImporter.tsx
│   │   └── AnalysisResults.tsx
│   └── market/
│       ├── StockTicker.tsx
│       └── MarketOverview.tsx
├── services/
│   ├── api.ts
│   ├── authService.ts
│   ├── portfolioService.ts
│   └── marketService.ts
├── stores/
│   ├── authStore.ts
│   ├── portfolioStore.ts
│   └── marketStore.ts
└── hooks/
    ├── useAuth.ts
    ├── usePortfolio.ts
    └── useMarketData.ts
```

#### Key Features:
- **Authentication**: JWT-based login/registration with refresh tokens
- **Portfolio Management**: Create, view, import CSV
- **Real-time Market Data**: India stock/MF data via Finnhub/Yahoo Finance API
- **AI Analysis**: Trigger analysis and display results
- **Responsive Design**: Tailwind CSS for mobile-first approach

---

### 2. Backend Service (Node/Express)

#### Directory Structure:
```
src/
├── index.js                    # Entry point
├── config/
│   ├── db.js                   # MongoDB connection
│   ├── kafka.js                # Kafka producer/consumer
│   └── redis.js                # Redis connection
├── middleware/
│   ├── auth.js                 # JWT authentication
│   ├── rateLimiter.js          # Rate limiting
│   ├── validator.js            # Input validation
│   └── sanitizer.js            # NoSQL injection prevention
├── models/
│   ├── User.js
│   ├── Portfolio.js
│   └── AnalysisResult.js
├── routes/
│   ├── auth.js
│   ├── portfolio.js
│   ├── market.js
│   └── analysis.js
├── controllers/
│   ├── authController.js
│   ├── portfolioController.js
│   └── analysisController.js
├── services/
│   ├── kafkaService.js
│   ├── analysisService.js
│   └── marketDataService.js
└── utils/
    ├── logger.js
    └── helpers.js
```

#### API Endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Refresh JWT token |
| GET | /api/auth/profile | Get user profile |
| GET | /api/portfolios | List user portfolios |
| POST | /api/portfolios | Create portfolio |
| GET | /api/portfolios/:id | Get portfolio details |
| POST | /api/portfolios/:id/import | Import CSV holdings |
| POST | /api/portfolios/:id/analyze | Trigger AI analysis |
| GET | /api/market/stocks | Get stock data |
| GET | /api/market/search | Search symbols |

#### Security Features:
- **Rate Limiting**: Redis-backed, 100 req/min per user
- **NoSQL Injection Prevention**: mongo-sanitize + express-validator
- **CORS**: Configured for frontend origin only
- **Helmet**: Security headers
- **Input Validation**: Joi/express-validator schemas
- **Password Hashing**: bcrypt with salt rounds

---

### 3. AI Service (Python/FastAPI)

#### Directory Structure:
```
src/
├── main.py                     # FastAPI entry point
├── config/
│   └── settings.py             # Environment configuration
├── consumers/
│   └── analysis_consumer.py    # Kafka consumer
├── producers/
│   └── result_producer.py      # Kafka producer
├── agents/
│   ├── base_agent.py           # Base agent class
│   ├── orchestrator.py         # Multi-agent orchestrator
│   ├── research_agent.py       # Market research agent
│   ├── analyst_agent.py        # Portfolio analysis agent
│   └── risk_agent.py           # Risk assessment agent
├── tools/
│   ├── base_tool.py
│   ├── calculator_tool.py      # Financial calculations
│   ├── market_tool.py          # Market data fetching
│   └── news_tool.py            # News/sentiment analysis
├── llm/
│   └── ollama_client.py        # Ollama LLM client
├── models/
│   └── schemas.py              # Pydantic models
└── services/
    └── portfolio_analyzer.py   # Analysis orchestration
```

#### Agentic AI Architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                        │
│         (Coordinates analysis workflow)                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   RESEARCH    │    │   ANALYST     │    │     RISK      │
│    AGENT      │    │    AGENT      │    │    AGENT      │
│               │    │               │    │               │
│ - Market News │    │ - Returns     │    │ - Volatility  │
│ - Trends      │    │ - Allocation  │    │ - VaR         │
│ - Sentiment   │    │ - Performance │    │ - Sharpe      │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                       TOOLS LAYER                            │
│  Calculator | Market Data | News Fetcher | Web Search        │
└─────────────────────────────────────────────────────────────┘
```

#### Analysis Output Schema:
```json
{
  "portfolioId": "string",
  "analyzedAt": "ISO date",
  "summary": "Executive summary text",
  "metrics": {
    "totalReturn": 12.5,
    "annualizedReturn": 8.2,
    "volatility": 15.3,
    "sharpeRatio": 0.85,
    "maxDrawdown": -8.5
  },
  "riskAssessment": {
    "riskLevel": "moderate",
    "diversificationScore": 72,
    "sectorConcentration": {...},
    "recommendations": [...]
  },
  "holdings": [
    {
      "symbol": "AAPL",
      "analysis": "...",
      "sentiment": "bullish",
      "recommendation": "hold"
    }
  ],
  "recommendations": [
    {
      "type": "rebalance",
      "priority": "high",
      "description": "..."
    }
  ]
}
```

---

## Kafka Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            KAFKA MESSAGE FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────┐                           ┌─────────────────────┐          │
│  │   BACKEND SERVICE   │                           │    AI SERVICE       │          │
│  │                     │                           │                     │          │
│  │  ┌───────────────┐  │                           │  ┌───────────────┐  │          │
│  │  │   Producer    │  │    Kafka Cluster          │  │   Consumer    │  │          │
│  │  │ (1 instance)  │──┼──►┌─────────────────┐───►─┼──│ (1 instance)  │  │          │
│  │  └───────────────┘  │   │  Topic:         │     │  │               │  │          │
│  │                     │   │  analysis-      │     │  │ Consumer      │  │          │
│  │                     │   │  requests       │     │  │ Group:        │  │          │
│  │                     │   │  ┌───────────┐  │     │  │ ai-service-   │  │          │
│  │                     │   │  │Partition 0│  │     │  │ group         │  │          │
│  │                     │   │  └───────────┘  │     │  └───────────────┘  │          │
│  │                     │   └─────────────────┘     │                     │          │
│  │                     │                           │                     │          │
│  │  ┌───────────────┐  │   ┌─────────────────┐     │  ┌───────────────┐  │          │
│  │  │   Consumer    │  │   │  Topic:         │     │  │   Producer    │  │          │
│  │  │ (1 instance)  │◄─┼───│  analysis-      │◄────┼──│ (1 instance)  │  │          │
│  │  │               │  │   │  results        │     │  └───────────────┘  │          │
│  │  │ Consumer      │  │   │  ┌───────────┐  │     │                     │          │
│  │  │ Group:        │  │   │  │Partition 0│  │     │                     │          │
│  │  │ backend-      │  │   │  └───────────┘  │     │                     │          │
│  │  │ results-group │  │   └─────────────────┘     │                     │          │
│  │  └───────┬───────┘  │                           │                     │          │
│  │          │          │                           │                     │          │
│  │          ▼          │                           │                     │          │
│  │  ┌───────────────┐  │                           │                     │          │
│  │  │ Batch Buffer  │  │                           │                     │          │
│  │  │ (in-memory)   │  │                           │                     │          │
│  │  └───────┬───────┘  │                           │                     │          │
│  │          │          │                           │                     │          │
│  │          ▼          │                           │                     │          │
│  │  ┌───────────────┐  │                           │                     │          │
│  │  │  Bulk Write   │  │                           │                     │          │
│  │  │  to MongoDB   │  │                           │                     │          │
│  │  └───────────────┘  │                           │                     │          │
│  └─────────────────────┘                           └─────────────────────┘          │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Topic Configuration

| Topic | Partitions | Replication | Retention | Purpose |
|-------|------------|-------------|-----------|---------|
| `portfolio-analysis-requests` | 1 | 1 | 7 days | Analysis request queue |
| `portfolio-analysis-results` | 1 | 1 | 7 days | Analysis results queue |

**Why 1 Partition?**
- Guarantees strict message ordering (FIFO)
- Simplifies consumer logic (no partition assignment complexity)
- Sufficient for expected throughput (~1000 concurrent users)
- Single consumer per service maximizes batch efficiency

### Kafka Topic Creation (docker-compose environment)
```yaml
# In docker-compose.yml - kafka service
environment:
  KAFKA_CREATE_TOPICS: "portfolio-analysis-requests:1:1,portfolio-analysis-results:1:1"
```

---

## Producers & Consumers Detail

### Backend Service - Producer (Analysis Requests)

**File**: `src/services/kafkaProducer.js`

```javascript
const { Kafka } = require('kafkajs');

class AnalysisRequestProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'investwise-backend',
      brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Backend Kafka Producer connected');
    }
  }

  async sendAnalysisRequest(portfolioId, userId, portfolio) {
    await this.connect();
    
    const message = {
      messageId: crypto.randomUUID(),
      portfolioId: portfolioId.toString(),
      userId: userId.toString(),
      portfolio: {
        name: portfolio.name,
        totalInvested: portfolio.totalInvested,
        currentValue: portfolio.currentValue,
        currency: portfolio.currency,
        holdings: portfolio.holdings.map(h => ({
          symbol: h.symbol,
          name: h.name,
          assetType: h.assetType,
          sector: h.sector,
          quantity: h.quantity,
          averageCost: h.averageCost,
          totalCost: h.totalCost,
          currentValue: h.currentValue,
        })),
      },
      requestedAt: new Date().toISOString(),
    };

    await this.producer.send({
      topic: 'portfolio-analysis-requests',
      messages: [
        {
          key: portfolioId.toString(),  // Ensures ordering per portfolio
          value: JSON.stringify(message),
          headers: {
            'correlation-id': message.messageId,
            'source': 'backend-service',
          },
        },
      ],
    });

    console.log(`Analysis request sent for portfolio: ${portfolioId}`);
    return message.messageId;
  }

  async disconnect() {
    await this.producer.disconnect();
    this.isConnected = false;
  }
}

module.exports = new AnalysisRequestProducer();
```

---

### Backend Service - Consumer (Analysis Results) with Batch Processing

**File**: `src/services/kafkaConsumer.js`

```javascript
const { Kafka } = require('kafkajs');
const Portfolio = require('../models/Portfolio');

class AnalysisResultsConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'investwise-backend',
      brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
    });
    
    // Single consumer in a dedicated consumer group
    this.consumer = this.kafka.consumer({
      groupId: 'backend-results-group',  // One consumer group
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    // Batch buffer for accumulating results
    this.batchBuffer = [];
    this.BATCH_SIZE = 50;           // Process when 50 messages accumulated
    this.BATCH_TIMEOUT_MS = 5000;   // Or every 5 seconds, whichever comes first
    this.batchTimer = null;
  }

  async connect() {
    await this.consumer.connect();
    console.log('Backend Kafka Consumer connected (group: backend-results-group)');

    await this.consumer.subscribe({
      topic: 'portfolio-analysis-results',
      fromBeginning: false,
    });

    // Start batch processing timer
    this.startBatchTimer();
  }

  startBatchTimer() {
    this.batchTimer = setInterval(() => {
      if (this.batchBuffer.length > 0) {
        this.processBatch();
      }
    }, this.BATCH_TIMEOUT_MS);
  }

  async run() {
    await this.consumer.run({
      // Process each message individually, but buffer for batch DB write
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const result = JSON.parse(message.value.toString());
          console.log(`Received analysis result for portfolio: ${result.portfolioId}`);

          // Add to batch buffer
          this.batchBuffer.push(result);

          // Process batch if buffer is full
          if (this.batchBuffer.length >= this.BATCH_SIZE) {
            await this.processBatch();
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });
  }

  async processBatch() {
    if (this.batchBuffer.length === 0) return;

    // Take all buffered messages
    const batch = [...this.batchBuffer];
    this.batchBuffer = [];  // Clear buffer immediately

    console.log(`Processing batch of ${batch.length} analysis results`);

    try {
      // Build bulk operations for MongoDB
      const bulkOps = batch
        .filter(result => result.status === 'completed')
        .map(result => ({
          updateOne: {
            filter: { _id: result.portfolioId },
            update: {
              $set: {
                // Store complete analysis
                'analytics.lastAnalysis': result.analysis,
                'analytics.lastAnalyzedAt': new Date(result.completedAt),
                'analytics.processingTime': result.processingTime,
                
                // Update portfolio-level metrics
                'analytics.diversificationScore': result.analysis.riskAssessment?.diversificationScore || 0,
                'analytics.riskLevel': result.analysis.riskAssessment?.riskLevel || 'unknown',
                'analytics.recommendations': result.analysis.recommendations || [],
                
                // Update individual holdings with analysis
                ...this.buildHoldingsUpdate(result),
              },
            },
          },
        }));

      // Execute bulk write to MongoDB
      if (bulkOps.length > 0) {
        const bulkResult = await Portfolio.bulkWrite(bulkOps, { ordered: false });
        console.log(`Bulk update completed: ${bulkResult.modifiedCount} portfolios updated`);
      }

      // Log failed analyses
      const failures = batch.filter(r => r.status === 'failed');
      if (failures.length > 0) {
        console.warn(`${failures.length} analysis failures in batch:`, 
          failures.map(f => ({ portfolioId: f.portfolioId, error: f.error })));
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      // Optionally: push failed items back to buffer or dead-letter queue
    }
  }

  buildHoldingsUpdate(result) {
    const updates = {};
    if (result.analysis.holdings) {
      result.analysis.holdings.forEach((holding, idx) => {
        updates[`holdings.${idx}.analysis`] = {
          sentiment: holding.sentiment,
          recommendation: holding.recommendation,
          summary: holding.analysis,
          analyzedAt: new Date(result.completedAt),
        };
      });
    }
    return updates;
  }

  async disconnect() {
    clearInterval(this.batchTimer);
    // Process any remaining messages before disconnect
    await this.processBatch();
    await this.consumer.disconnect();
  }
}

module.exports = new AnalysisResultsConsumer();
```

---

### AI Service - Consumer (Analysis Requests)

**File**: `src/consumers/analysis_consumer.py`

```python
import json
import asyncio
from aiokafka import AIOKafkaConsumer
from config.settings import settings
from services.portfolio_analyzer import PortfolioAnalyzer
from producers.result_producer import ResultProducer

class AnalysisConsumer:
    def __init__(self):
        self.consumer = None
        self.analyzer = PortfolioAnalyzer()
        self.producer = ResultProducer()
        
    async def connect(self):
        self.consumer = AIOKafkaConsumer(
            'portfolio-analysis-requests',
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id='ai-service-group',  # Single consumer group
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            auto_commit_interval_ms=1000,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        )
        await self.consumer.start()
        await self.producer.connect()
        print("AI Service Kafka Consumer connected (group: ai-service-group)")

    async def run(self):
        """Process messages one at a time (AI analysis is CPU/LLM intensive)"""
        try:
            async for message in self.consumer:
                await self.process_message(message)
        except Exception as e:
            print(f"Consumer error: {e}")
        finally:
            await self.stop()

    async def process_message(self, message):
        """Process a single analysis request"""
        request = message.value
        portfolio_id = request['portfolioId']
        
        print(f"Processing analysis for portfolio: {portfolio_id}")
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Run multi-agent analysis
            analysis_result = await self.analyzer.analyze(
                portfolio=request['portfolio'],
                portfolio_id=portfolio_id,
                user_id=request['userId'],
            )
            
            processing_time = int((asyncio.get_event_loop().time() - start_time) * 1000)
            
            # Send success result
            await self.producer.send_result(
                portfolio_id=portfolio_id,
                status='completed',
                analysis=analysis_result,
                processing_time=processing_time,
            )
            
        except Exception as e:
            print(f"Analysis failed for {portfolio_id}: {e}")
            # Send failure result
            await self.producer.send_result(
                portfolio_id=portfolio_id,
                status='failed',
                error=str(e),
                processing_time=0,
            )

    async def stop(self):
        if self.consumer:
            await self.consumer.stop()
        await self.producer.disconnect()
```

---

### AI Service - Producer (Analysis Results)

**File**: `src/producers/result_producer.py`

```python
import json
import uuid
from datetime import datetime
from aiokafka import AIOKafkaProducer
from config.settings import settings

class ResultProducer:
    def __init__(self):
        self.producer = None

    async def connect(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
        )
        await self.producer.start()
        print("AI Service Kafka Producer connected")

    async def send_result(
        self, 
        portfolio_id: str, 
        status: str, 
        analysis: dict = None, 
        error: str = None,
        processing_time: int = 0
    ):
        message = {
            'messageId': str(uuid.uuid4()),
            'portfolioId': portfolio_id,
            'status': status,
            'analysis': analysis,
            'error': error,
            'completedAt': datetime.utcnow().isoformat(),
            'processingTime': processing_time,
        }

        await self.producer.send_and_wait(
            topic='portfolio-analysis-results',
            key=portfolio_id,
            value=message,
            headers=[
                ('correlation-id', message['messageId'].encode()),
                ('source', b'ai-service'),
            ],
        )
        print(f"Analysis result sent for portfolio: {portfolio_id} (status: {status})")

    async def disconnect(self):
        if self.producer:
            await self.producer.stop()
```

---

## Message Schemas

### Analysis Request Message
```json
{
  "messageId": "uuid-v4",
  "portfolioId": "MongoDB ObjectId string",
  "userId": "MongoDB ObjectId string",
  "portfolio": {
    "name": "My Portfolio",
    "totalInvested": 222050,
    "currentValue": 245000,
    "currency": "INR",
    "holdings": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc",
        "assetType": "stock",
        "sector": "Technology",
        "quantity": 10,
        "averageCost": 150,
        "totalCost": 1500,
        "currentValue": 1750
      }
    ]
  },
  "requestedAt": "2026-03-27T10:00:00.000Z"
}
```

### Analysis Result Message
```json
{
  "messageId": "uuid-v4",
  "portfolioId": "MongoDB ObjectId string",
  "status": "completed",
  "analysis": {
    "summary": "Executive portfolio analysis summary...",
    "metrics": {
      "totalReturn": 12.5,
      "annualizedReturn": 8.2,
      "volatility": 15.3,
      "sharpeRatio": 0.85,
      "maxDrawdown": -8.5
    },
    "riskAssessment": {
      "riskLevel": "moderate",
      "diversificationScore": 72,
      "sectorConcentration": {
        "Technology": 45,
        "Finance": 30,
        "Energy": 25
      },
      "warnings": ["High tech sector concentration"]
    },
    "holdings": [
      {
        "symbol": "AAPL",
        "analysis": "Strong performance driven by...",
        "sentiment": "bullish",
        "recommendation": "hold"
      }
    ],
    "recommendations": [
      {
        "type": "rebalance",
        "priority": "high",
        "description": "Consider reducing tech exposure"
      }
    ]
  },
  "completedAt": "2026-03-27T10:00:05.200Z",
  "processingTime": 5200
}
```

---

## Batch Processing Flow (High Load Scenario)

**Scenario**: 1000 users click "Analyze Portfolio" simultaneously

```
Timeline:
─────────────────────────────────────────────────────────────────────────────────

T+0s     │ 1000 API requests hit backend
         │ Backend producer sends 1000 messages to 'analysis-requests' topic
         │ Messages queued in Partition 0 (ordered by arrival)
         │
T+0-60s  │ AI Service consumer processes messages sequentially
         │ (Each analysis takes ~3-5 seconds with LLM)
         │ Results sent to 'analysis-results' topic as completed
         │
T+5s     │ Backend consumer receives first batch of ~50 results
         │ Triggers batch processing (BATCH_SIZE=50 reached)
         │ Bulk write to MongoDB: 50 portfolios updated atomically
         │
T+10s    │ Next batch of ~50 results processed
         │ Bulk write: another 50 portfolios updated
         │
T+15s    │ Timer-based batch (if < 50 accumulated)
         │ Processes whatever is in buffer
         │
...      │ (continues until all 1000 processed)
         │
T+60s    │ ~16-20 bulk writes completed
         │ All 1000 portfolios updated in database
         │ Frontend can poll/receive updates

─────────────────────────────────────────────────────────────────────────────────

Efficiency Gains:
- Instead of 1000 individual DB writes → ~20 bulk writes
- 98% reduction in DB round-trips
- Atomicity per batch (either all 50 update or none)
```

---

## Consumer Group Summary

| Service | Consumer Group | Consumers | Topic | Processing Mode |
|---------|----------------|-----------|-------|-----------------|
| Backend | `backend-results-group` | 1 | `portfolio-analysis-results` | Batch (50 msgs / 5s) |
| AI Service | `ai-service-group` | 1 | `portfolio-analysis-requests` | Sequential (1 at a time) |

**Key Design Decisions:**
1. **Single partition per topic**: Guarantees ordering, simplifies consumer logic
2. **Single consumer per group**: Maximizes batch efficiency, no partition rebalancing
3. **Backend batches writes**: Reduces DB load under high concurrency
4. **AI processes sequentially**: LLM is the bottleneck, parallel won't help

---

## Security Implementation

### 1. Rate Limiting (Backend)
```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for analysis endpoint (expensive operation)
const analysisLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 1000,
  max: 5,  // 5 analysis requests per minute
  keyGenerator: (req) => req.user.id,
});
```

### 2. NoSQL Injection Prevention
```javascript
// middleware/sanitizer.js
const mongoSanitize = require('express-mongo-sanitize');

// Remove any keys starting with '$' or containing '.'
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key}`);
  }
}));

// Additional Mongoose query sanitization
const sanitizeQuery = (query) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      sanitized[key] = value.replace(/[${}]/g, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};
```

### 3. Input Validation
```javascript
// validators/portfolioValidator.js
const { body, param } = require('express-validator');

const importHoldingsValidator = [
  param('id').isMongoId().withMessage('Invalid portfolio ID'),
  body('holdings').isArray({ min: 1, max: 100 }),
  body('holdings.*.symbol').isString().trim().isLength({ min: 1, max: 10 }),
  body('holdings.*.quantity').isFloat({ min: 0.0001 }),
  body('holdings.*.averageCost').isFloat({ min: 0 }),
];
```

### 4. Authentication Middleware
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
};
```

---

## Implementation Phases

### Phase 1: Infrastructure Setup (Day 1)
- [ ] Docker Compose with all services
- [ ] MongoDB with initialization script
- [ ] Kafka with topics creation
- [ ] Redis setup
- [ ] Basic health endpoints

### Phase 2: Backend Core (Days 2-3)
- [ ] User model and authentication
- [ ] Portfolio model and CRUD operations
- [ ] CSV import functionality
- [ ] Kafka producer/consumer setup
- [ ] Security middleware implementation

### Phase 3: AI Service (Days 4-5)
- [ ] FastAPI setup with health checks
- [ ] Kafka consumer for analysis requests
- [ ] Ollama LLM client integration
- [ ] Agent framework (Research, Analyst, Risk)
- [ ] Tool implementations (Calculator, Market Data)
- [ ] Kafka producer for results

### Phase 4: Frontend (Days 6-8)
- [ ] React project setup with Vite + TypeScript
- [ ] Authentication pages (Login/Register)
- [ ] Home page with market data
- [ ] Portfolio management pages
- [ ] CSV import component
- [ ] Analysis results display
- [ ] Real-time updates via polling/WebSocket

### Phase 5: Integration & Testing (Days 9-10)
- [ ] End-to-end flow testing
- [ ] Load testing (1000 concurrent analysis)
- [ ] Security testing
- [ ] Bug fixes and optimizations

---

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://admin:password123@mongodb:27017/investwise?authSource=admin

# Redis
REDIS_URL=redis://redis:6379

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=investwise-backend

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Market Data API
FINNHUB_API_KEY=your-finnhub-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### AI Service (.env)
```env
PYTHONUNBUFFERED=1

# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_GROUP_ID=ai-service-group
KAFKA_REQUEST_TOPIC=portfolio-analysis-requests
KAFKA_RESULT_TOPIC=portfolio-analysis-results

# Redis
REDIS_URL=redis://redis:6379

# Ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2

# Optional: Web Search
SERPER_API_KEY=your-serper-api-key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

---

## CSV Import Format

Expected CSV structure for portfolio import:
```csv
symbol,name,quantity,average_cost,sector,asset_type
AAPL,Apple Inc,10,150.00,Technology,stock
GOOGL,Alphabet Inc,5,2800.00,Technology,stock
RELIANCE.NS,Reliance Industries,50,2500.00,Energy,stock
HDFCBANK.NS,HDFC Bank,100,1600.00,Finance,stock
```

---

## Monitoring & Observability

### Health Endpoints
- Backend: `GET /health` - Returns DB, Redis, Kafka status
- AI Service: `GET /health` - Returns Kafka, Ollama status
- Frontend: Built-in Vite dev server health

### Kafka UI
- Available at `http://localhost:8080`
- Monitor topics, consumer groups, message flow

### Logging
- Backend: Winston with JSON format
- AI Service: Python logging with structlog
- All logs to stdout for Docker log aggregation

---

## Getting Started

```bash
# Clone and navigate
cd InvestWise

# Start infrastructure
docker-compose up -d mongodb redis zookeeper kafka kafka-ui

# Start services (after building)
docker-compose up -d backend ai-service frontend

# View logs
docker-compose logs -f

# Stop all
docker-compose down
```

---

## Next Steps

1. **Start with docker-compose.yml** (✅ Done)
2. **Create backend service structure**
3. **Implement authentication and portfolio APIs**
4. **Set up AI service with Kafka consumer**
5. **Build React frontend**
6. **Integrate all services**
7. **Test and deploy**
