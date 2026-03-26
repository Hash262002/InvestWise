# InvestWise - Interview Skills Checklist

## 📋 Overview

This document maps the technical skills demonstrated in InvestWise to common SDE1/SDE2 interview topics. Use this to prepare for interviews and articulate what you've built.

---

## 🎯 Skills by Category

### 1. Backend Development

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **REST API Design** | Express.js routes for portfolios, holdings, auth | "I followed REST conventions with proper HTTP methods, status codes, and resource naming" |
| **TypeScript** | Strict typing throughout backend | "TypeScript caught bugs at compile time and improved code documentation" |
| **Authentication** | JWT access + refresh tokens | "I implemented stateless auth with short-lived access tokens and secure refresh rotation" |
| **Authorization** | User-scoped data access | "Each user can only access their own portfolios through middleware validation" |
| **Error Handling** | Centralized error middleware | "Consistent error responses with proper HTTP status codes" |
| **Input Validation** | Request body validation | "Validated all inputs to prevent injection and malformed data" |

### 2. Database (MongoDB)

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **Schema Design** | User, Portfolio, Holding, Alert models | "Designed schemas for 1:N relationships with proper indexing" |
| **Indexing** | Compound indexes on frequently queried fields | "Added indexes on `userId` and `portfolioId` for efficient queries" |
| **Aggregation** | Calculating portfolio totals | "Used MongoDB aggregation pipeline for analytics" |
| **References** | ObjectId references between collections | "Chose referencing over embedding for independent querying" |

### 3. Caching (Redis)

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **Cache Strategy** | Stock prices (5 min), search results (1 hr) | "Implemented cache-aside pattern with appropriate TTLs" |
| **Rate Limiting** | Redis-backed express-rate-limit | "Used Redis for distributed rate limiting across instances" |
| **Session Storage** | Refresh tokens, 2FA setup | "Stored ephemeral data in Redis with expiration" |
| **Key Design** | Namespaced keys like `quote:{symbol}` | "Designed keys for easy debugging and expiration management" |

### 4. Message Queue (Kafka)

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **Event-Driven Architecture** | Portfolio events, price updates | "Decoupled services using event-driven patterns" |
| **Topics** | `portfolio.events`, `price.updates`, `alerts` | "Organized events by domain for scalability" |
| **Consumers** | Alert service listens to price updates | "Multiple consumers can process events independently" |
| **Reliability** | Consumer groups, offset management | "Ensured at-least-once delivery with idempotent handlers" |

### 5. Security

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **2FA (TOTP)** | Google Authenticator compatible | "Implemented RFC 6238 TOTP with speakeasy library" |
| **Encryption** | AES-256-GCM for 2FA secrets | "Used authenticated encryption for sensitive data at rest" |
| **Password Hashing** | bcrypt with cost 12 | "bcrypt automatically handles salting and is resistant to GPU attacks" |
| **Rate Limiting** | Tiered limits by endpoint type | "Stricter limits on auth endpoints to prevent brute force" |
| **Headers** | Helmet.js security headers | "Set CSP, HSTS, X-Frame-Options for defense in depth" |

### 6. AI/ML Integration

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **LLM Integration** | Direct Ollama HTTP calls | "Chose simplicity over frameworks for predictable behavior" |
| **Prompt Engineering** | Structured JSON output prompts | "Designed prompts for consistent, parseable responses" |
| **Hybrid Analysis** | Quantitative + AI qualitative | "Combined deterministic metrics with AI insights for accuracy" |
| **Fallback Patterns** | Rule-based backup if AI fails | "System never crashes - always returns a result" |
| **Sentiment Analysis** | Few-shot prompting for news | "Used examples to teach the model expected output format" |

### 7. Frontend (React)

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **State Management** | Zustand for auth, React Query for server state | "Separated client state from server state for simplicity" |
| **TypeScript** | Strict typing for components and API | "Type safety from backend to frontend" |
| **Real-Time** | WebSocket hook for alerts | "Implemented reconnection with exponential backoff" |
| **Component Design** | Reusable analysis result cards | "Built composable components with clear props interfaces" |
| **Routing** | React Router with protected routes | "Guarded routes redirect unauthenticated users" |

### 8. DevOps

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **Containerization** | Multi-stage Dockerfiles | "Optimized image size with multi-stage builds" |
| **Orchestration** | Docker Compose for local, K8s for prod | "Same containers work locally and in production" |
| **Health Checks** | `/health` endpoints on all services | "Kubernetes uses these for readiness/liveness probes" |
| **Configuration** | Environment variables, ConfigMaps | "12-factor app configuration for different environments" |
| **Secrets** | K8s Secrets for sensitive config | "Secrets are never in code or images" |

### 9. System Design

| Skill | Implementation | Interview Talking Points |
|-------|---------------|-------------------------|
| **Microservices** | Backend, AI, Alert, News services | "Services are independently deployable and scalable" |
| **API Gateway Pattern** | Backend routes to AI service | "Single entry point simplifies client integration" |
| **Event Sourcing** | Kafka for audit trail | "Can replay events to rebuild state" |
| **Caching Strategy** | Read-through with TTL | "Balanced freshness with performance" |
| **Graceful Degradation** | AI fallback to rules | "System works even when AI service is down" |

---

## 💬 Common Interview Questions & Answers

### Architecture

**Q: Why did you choose microservices over a monolith?**

> "For a portfolio project, I wanted to demonstrate understanding of distributed systems. The AI service being in Python while the main backend is Node.js shows polyglot architecture. Each service can be scaled independently based on load."

**Q: How would you scale this system?**

> "Horizontally scale the stateless services behind a load balancer. Redis and Kafka already support clustering. For the AI service, I'd add GPU nodes for Ollama. MongoDB can be sharded by userId for data distribution."

### Database

**Q: Why MongoDB over PostgreSQL?**

> "For a portfolio tracker, the schema flexibility of MongoDB fits well - portfolios can have varying structures. However, I'd consider PostgreSQL for financial systems requiring strict ACID transactions and complex joins."

**Q: How do you handle data consistency?**

> "For operations within a service, MongoDB transactions work. For cross-service consistency, I use Kafka events with eventual consistency. The Alert service eventually catches up with price changes."

### Caching

**Q: How do you handle cache invalidation?**

> "Time-based expiration (TTL) for stock prices works because slightly stale data is acceptable. For user data, I use cache-aside with explicit invalidation on writes."

**Q: What if Redis goes down?**

> "The application continues working - it just hits MongoDB directly. Rate limiting falls back to in-memory. I'd add Redis Sentinel for high availability in production."

### Security

**Q: Why bcrypt over Argon2?**

> "bcrypt is well-tested, widely supported, and sufficient for this use case. Argon2 is more resistant to GPU attacks but has less library support. For a banking app, I'd consider Argon2id."

**Q: How do you prevent CSRF?**

> "For SPAs with JWT in headers, traditional CSRF isn't applicable. I use CORS to restrict origins, SameSite cookies for refresh tokens, and validate the Origin header."

### AI/ML

**Q: Why not use LangChain?**

> "LangChain adds abstraction overhead that wasn't needed. My use case is straightforward: send a prompt, get JSON back. Direct HTTP calls are simpler, faster, and easier to debug. The hybrid approach with quantitative metrics plus AI provides better accuracy than pure LLM."

**Q: How do you handle AI hallucinations?**

> "Three strategies: (1) Low temperature (0.3) for consistency, (2) Structured JSON output for predictable parsing, (3) Rule-based fallback if JSON parsing fails. Quantitative metrics are never AI-generated."

### DevOps

**Q: How would you deploy this to production?**

> "Use managed services where possible - MongoDB Atlas, Redis Cloud, Confluent Kafka. Deploy to EKS/GKE with the Kubernetes manifests. CI/CD pipeline builds images on merge, deploys to staging, then production with canary releases."

**Q: How do you handle secrets?**

> "Never in code. Local development uses `.env` files (gitignored). Kubernetes uses Secrets objects, ideally backed by Vault or AWS Secrets Manager. Environment variables injected at runtime."

---

## 🎓 Interview Prep Checklist

### Before the Interview

- [ ] Can explain the architecture diagram from memory
- [ ] Know the data flow for key operations (login with 2FA, portfolio analysis)
- [ ] Understand trade-offs made (e.g., eventual consistency, no LangChain)
- [ ] Can whiteboard the database schema
- [ ] Know the Kafka topics and what events flow through them

### During System Design Rounds

- [ ] Start with requirements clarification
- [ ] Draw the high-level architecture first
- [ ] Explain each component's responsibility
- [ ] Discuss scaling strategies
- [ ] Address single points of failure
- [ ] Mention monitoring and observability

### During Coding Rounds

- [ ] TypeScript patterns from the codebase
- [ ] Async/await with proper error handling
- [ ] MongoDB query patterns
- [ ] React hooks patterns

---

## 📊 Skills Matrix

| Skill | Beginner | Intermediate | Advanced | InvestWise Level |
|-------|----------|--------------|----------|------------------|
| REST API | CRUD | Auth, Validation | Rate Limiting, Versioning | ⭐⭐⭐⭐ |
| TypeScript | Types | Generics | Advanced Patterns | ⭐⭐⭐ |
| MongoDB | CRUD | Indexing | Aggregation | ⭐⭐⭐ |
| Redis | Key-Value | TTL, Pub/Sub | Clustering | ⭐⭐⭐ |
| Kafka | Produce/Consume | Consumer Groups | Partitioning | ⭐⭐⭐ |
| Security | Password Hash | 2FA | Encryption | ⭐⭐⭐⭐ |
| React | Components | Hooks, State | Performance | ⭐⭐⭐ |
| Docker | Images | Compose | Multi-stage | ⭐⭐⭐⭐ |
| Kubernetes | Deployments | Services | Helm | ⭐⭐⭐ |
| AI/LLM | API Calls | Prompting | Hybrid Analysis | ⭐⭐⭐⭐ |

---

## 🎯 Quick Reference Card

### The "Why" Behind Tech Choices

| Choice | Why |
|--------|-----|
| Express over NestJS | Simpler, more control, better for demonstrating fundamentals |
| Zustand over Redux | Less boilerplate, easier to understand |
| Direct Ollama over LangChain | Simpler, faster, more predictable |
| MongoDB over PostgreSQL | Flexible schema for portfolio data |
| Kafka over RabbitMQ | Better for event streaming, higher throughput |

### Key Metrics to Mention

| Metric | Value |
|--------|-------|
| API Response Time | <100ms for most endpoints |
| Rate Limits | 100 req/min general, 5/15min for auth |
| Cache TTL | 5 min prices, 1 hr search |
| 2FA Window | 30 seconds with 1-step tolerance |
| JWT Expiry | 15 min access, 7 days refresh |

---

## 📝 Final Tips

1. **Know Your Code**: Be ready to explain any line in the codebase
2. **Trade-offs**: Always discuss alternatives and why you chose your approach
3. **Scale Up**: Be ready to discuss how this would work at 10x, 100x scale
4. **Failures**: Discuss what happens when each component fails
5. **Security**: Always consider the security implications of design choices

Good luck with your interviews! 🚀
