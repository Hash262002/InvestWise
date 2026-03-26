# InvestWise - Low-Level Design (LLD)

## 📋 Table of Contents
1. [Project Structure](#1-project-structure)
2. [Backend Implementation](#2-backend-implementation)
3. [AI Service Implementation](#3-ai-service-implementation)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Alert & News Services](#5-alert--news-services)
6. [Infrastructure](#6-infrastructure)

---

## 1. Project Structure

```
investwise/
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts          # MongoDB connection
│   │   │   ├── redis.ts       # Redis client
│   │   │   └── kafka.ts       # Kafka producer/consumer
│   │   ├── models/
│   │   │   ├── User.ts        # User schema with 2FA
│   │   │   ├── Portfolio.ts   # Portfolio schema
│   │   │   ├── Holding.ts     # Holdings schema
│   │   │   ├── Alert.ts       # Price alerts
│   │   │   └── Notification.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── portfolioController.ts
│   │   │   ├── holdingController.ts
│   │   │   ├── marketController.ts
│   │   │   └── alertController.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── twoFactorService.ts
│   │   │   ├── encryptionService.ts
│   │   │   ├── marketDataService.ts
│   │   │   └── aiService.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── portfolio.ts
│   │   │   ├── holdings.ts
│   │   │   ├── market.ts
│   │   │   └── alerts.ts
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── portfolio/
│   │   │   ├── holdings/
│   │   │   ├── analysis/
│   │   │   └── common/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PortfolioPage.tsx
│   │   │   └── AnalysisPage.tsx
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   └── portfolioStore.ts
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── ai-service/                 # Python FastAPI (Simplified - No LangChain)
│   ├── app/
│   │   ├── main.py
│   │   ├── analyzers/
│   │   │   ├── risk_analyzer.py
│   │   │   ├── sentiment_analyzer.py
│   │   │   └── recommendation_generator.py
│   │   └── utils/
│   │       └── ollama_client.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── alert-service/              # Node.js - Real-time alerts
│   ├── src/
│   │   ├── index.ts
│   │   ├── priceChecker.ts
│   │   └── websocket.ts
│   └── package.json
│
├── news-service/               # Python - Daily news digest
│   ├── app/
│   │   ├── main.py
│   │   ├── aggregator.py
│   │   └── scheduler.py
│   └── requirements.txt
│
├── docker-compose.yml
└── k8s/
    ├── backend-deployment.yaml
    ├── frontend-deployment.yaml
    └── ...
```

---

## 2. Backend Implementation

### 2.1 App Entry Point

```typescript
// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { initKafka } from './config/kafka';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth';
import portfolioRoutes from './routes/portfolio';
import holdingRoutes from './routes/holdings';
import marketRoutes from './routes/market';
import alertRoutes from './routes/alerts';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/holdings', holdingRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/alerts', alertRoutes);

// Error Handler
app.use(errorHandler);

// Initialize connections
const startServer = async () => {
  await connectDB();
  await connectRedis();
  await initKafka();
  
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
  });
};

startServer();
```

### 2.2 MongoDB Models

```typescript
// backend/src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;      // Encrypted
  backupCodes?: string[];        // Encrypted
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  riskTolerance: { 
    type: String, 
    enum: ['conservative', 'moderate', 'aggressive'],
    default: 'moderate'
  },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },
  backupCodes: [{ type: String }]
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
```

```typescript
// backend/src/models/Portfolio.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IPortfolio extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioSchema = new Schema<IPortfolio>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  totalValue: { type: Number, default: 0 }
}, { timestamps: true });

PortfolioSchema.index({ userId: 1 });

export default mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
```

```typescript
// backend/src/models/Holding.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IHolding extends Document {
  portfolioId: mongoose.Types.ObjectId;
  symbol: string;           // e.g., "TATAMOTORS.NS"
  name: string;             // e.g., "Tata Motors Limited"
  assetType: 'stock' | 'mutual_fund';
  sector: string;           // e.g., "Automobile"
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  addedAt: Date;
}

const HoldingSchema = new Schema<IHolding>({
  portfolioId: { type: Schema.Types.ObjectId, ref: 'Portfolio', required: true },
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  assetType: { type: String, enum: ['stock', 'mutual_fund'], required: true },
  sector: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  avgBuyPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now }
});

HoldingSchema.index({ portfolioId: 1 });
HoldingSchema.index({ symbol: 1 });

export default mongoose.model<IHolding>('Holding', HoldingSchema);
```

```typescript
// backend/src/models/Alert.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  alertType: 'price_above' | 'price_below' | 'percent_change';
  targetValue: number;
  isActive: boolean;
  triggeredAt?: Date;
  notifyEmail: boolean;
  notifyInApp: boolean;
}

const AlertSchema = new Schema<IAlert>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true },
  alertType: { 
    type: String, 
    enum: ['price_above', 'price_below', 'percent_change'],
    required: true 
  },
  targetValue: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  triggeredAt: { type: Date },
  notifyEmail: { type: Boolean, default: true },
  notifyInApp: { type: Boolean, default: true }
}, { timestamps: true });

AlertSchema.index({ userId: 1, isActive: 1 });
AlertSchema.index({ symbol: 1, isActive: 1 });

export default mongoose.model<IAlert>('Alert', AlertSchema);
```

### 2.3 Configuration Files

```typescript
// backend/src/config/db.ts
import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};
```

```typescript
// backend/src/config/redis.ts
import Redis from 'ioredis';

let redisClient: Redis;

export const connectRedis = async (): Promise<Redis> => {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  });

  redisClient.on('connect', () => console.log('✅ Redis Connected'));
  redisClient.on('error', (err) => console.error('❌ Redis Error:', err));

  return redisClient;
};

export const getRedis = (): Redis => redisClient;
```

```typescript
// backend/src/config/kafka.ts
import { Kafka, Producer, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'investwise-backend',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

let producer: Producer;
let consumer: Consumer;

export const initKafka = async (): Promise<void> => {
  producer = kafka.producer();
  await producer.connect();
  console.log('✅ Kafka Producer Connected');
};

export const getProducer = (): Producer => producer;

export const createConsumer = async (groupId: string): Promise<Consumer> => {
  consumer = kafka.consumer({ groupId });
  await consumer.connect();
  return consumer;
};

// Topics
export const KAFKA_TOPICS = {
  PORTFOLIO_EVENTS: 'portfolio.events',
  PRICE_UPDATES: 'price.updates',
  ALERTS: 'alerts',
  NEWS_SENTIMENT: 'news.sentiment'
};
```

### 2.4 Two-Factor Authentication Service

```typescript
// backend/src/services/twoFactorService.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { encryptData, decryptData } from './encryptionService';

interface TwoFactorSetup {
  secret: string;          // Encrypted secret for storage
  otpauthUrl: string;      // URL for QR code
  qrCodeDataUrl: string;   // Base64 QR code image
  backupCodes: string[];   // Encrypted backup codes
}

// Generate 2FA secret and QR code
export const generate2FASecret = async (email: string): Promise<TwoFactorSetup> => {
  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `InvestWise:${email}`,
    issuer: 'InvestWise',
    length: 32
  });

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

  // Generate backup codes (8 codes)
  const backupCodes = Array(8).fill(null).map(() => {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${code.slice(0, 5)}-${code.slice(5)}`;
  });

  // Encrypt sensitive data before storage
  const encryptedSecret = encryptData(secret.base32);
  const encryptedBackupCodes = backupCodes.map(code => encryptData(code));

  return {
    secret: encryptedSecret,
    otpauthUrl: secret.otpauth_url!,
    qrCodeDataUrl,
    backupCodes: encryptedBackupCodes
  };
};

// Verify TOTP code
export const verifyTOTP = (encryptedSecret: string, token: string): boolean => {
  const secret = decryptData(encryptedSecret);
  
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1  // Allow 1 step before/after for clock drift
  });
};

// Verify backup code
export const verifyBackupCode = (
  encryptedCodes: string[], 
  inputCode: string
): { valid: boolean; remainingCodes: string[] } => {
  for (let i = 0; i < encryptedCodes.length; i++) {
    const decryptedCode = decryptData(encryptedCodes[i]);
    if (decryptedCode === inputCode.toUpperCase()) {
      // Remove used code
      const remainingCodes = [...encryptedCodes];
      remainingCodes.splice(i, 1);
      return { valid: true, remainingCodes };
    }
  }
  return { valid: false, remainingCodes: encryptedCodes };
};
```

### 2.5 Encryption Service

```typescript
// backend/src/services/encryptionService.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Encrypt data with AES-256-GCM
export const encryptData = (plaintext: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

// Decrypt data
export const decryptData = (ciphertext: string): string => {
  const [ivHex, authTagHex, encryptedData] = ciphertext.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Hash data (one-way, for refresh tokens)
export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};
```

### 2.6 Rate Limiter Middleware

```typescript
// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '../config/redis';
import { Request, Response } from 'express';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => getRedis().call(...args)
  })
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => getRedis().call(...args),
    prefix: 'rl:auth:'
  }),
  skipSuccessfulRequests: true
});

// 2FA verification rate limiter
export const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 3,
  message: { error: 'Too many verification attempts. Please try again in 5 minutes.' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => getRedis().call(...args),
    prefix: 'rl:2fa:'
  })
});

// AI Analysis rate limiter (expensive operation)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  message: { error: 'Analysis limit reached. Please try again later.' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => getRedis().call(...args),
    prefix: 'rl:ai:'
  })
});
```

### 2.7 Authentication Controller

```typescript
// backend/src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { generate2FASecret, verifyTOTP, verifyBackupCode } from '../services/twoFactorService';
import { getRedis } from '../config/redis';

// Register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, riskTolerance } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      riskTolerance: riskTolerance || 'moderate'
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Store refresh token in Redis
    await getRedis().set(`refresh:${user._id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

    res.status(201).json({
      user: { id: user._id, email: user.email, firstName, lastName },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// Login (Step 1)
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = jwt.sign(
        { userId: user._id, requires2FA: true },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' }
      );

      return res.json({
        requires2FA: true,
        tempToken
      });
    }

    // No 2FA, issue full tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    await getRedis().set(`refresh:${user._id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

    res.json({
      user: { id: user._id, email: user.email, firstName: user.firstName },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// Verify 2FA (Step 2)
export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken, code, isBackupCode } = req.body;

    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as { userId: string; requires2FA: boolean };
    if (!decoded.requires2FA) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    let isValid = false;

    if (isBackupCode) {
      // Verify backup code
      const result = verifyBackupCode(user.backupCodes || [], code);
      isValid = result.valid;
      if (isValid) {
        // Remove used backup code
        user.backupCodes = result.remainingCodes;
        await user.save();
      }
    } else {
      // Verify TOTP
      isValid = verifyTOTP(user.twoFactorSecret!, code);
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Issue full tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    await getRedis().set(`refresh:${user._id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

    res.json({
      user: { id: user._id, email: user.email, firstName: user.firstName },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// Enable 2FA
export const enable2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA already enabled' });
    }

    const setup = await generate2FASecret(user.email);

    // Store temporarily (user must verify before it's activated)
    await getRedis().set(
      `2fa-setup:${userId}`,
      JSON.stringify({ secret: setup.secret, backupCodes: setup.backupCodes }),
      'EX',
      600  // 10 minutes
    );

    res.json({
      qrCode: setup.qrCodeDataUrl,
      backupCodes: setup.backupCodes.map((_, i) => `Code ${i + 1}`)  // Don't show actual codes yet
    });
  } catch (error) {
    next(error);
  }
};

// Confirm 2FA setup
export const confirm2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    const setupData = await getRedis().get(`2fa-setup:${userId}`);
    if (!setupData) {
      return res.status(400).json({ error: '2FA setup expired. Please start again.' });
    }

    const { secret, backupCodes } = JSON.parse(setupData);

    // Verify the code works
    const isValid = verifyTOTP(secret, code);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }

    // Activate 2FA
    await User.findByIdAndUpdate(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      backupCodes
    });

    // Clean up
    await getRedis().del(`2fa-setup:${userId}`);

    res.json({
      message: '2FA enabled successfully',
      backupCodes  // Return encrypted backup codes for user to save
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });
};

const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
};
```

### 2.8 Market Data Service

```typescript
// backend/src/services/marketDataService.ts
import axios from 'axios';
import { getRedis } from '../config/redis';

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

// Yahoo Finance API (Free)
const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com';

export const searchAssets = async (query: string): Promise<SearchResult[]> => {
  // Check cache first
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = await getRedis().get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const response = await axios.get(`${YAHOO_BASE_URL}/v1/finance/search`, {
      params: {
        q: query,
        quotesCount: 10,
        newsCount: 0,
        enableFuzzyQuery: false,
        quotesQueryId: 'tss_match_phrase_query'
      }
    });

    const results: SearchResult[] = response.data.quotes
      .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'MUTUALFUND')
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname,
        type: q.quoteType === 'EQUITY' ? 'stock' : 'mutual_fund',
        exchange: q.exchange
      }));

    // Cache for 1 hour
    await getRedis().set(cacheKey, JSON.stringify(results), 'EX', 3600);

    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

export const getQuote = async (symbol: string): Promise<StockQuote | null> => {
  // Check cache (5 min for prices)
  const cacheKey = `quote:${symbol}`;
  const cached = await getRedis().get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const response = await axios.get(`${YAHOO_BASE_URL}/v7/finance/quote`, {
      params: { symbols: symbol }
    });

    const quote = response.data.quoteResponse.result[0];
    if (!quote) return null;

    const result: StockQuote = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      sector: quote.sector || 'Unknown'
    };

    // Cache for 5 minutes during market hours
    await getRedis().set(cacheKey, JSON.stringify(result), 'EX', 300);

    return result;
  } catch (error) {
    console.error('Quote error:', error);
    return null;
  }
};

export const getBatchQuotes = async (symbols: string[]): Promise<Map<string, StockQuote>> => {
  const results = new Map<string, StockQuote>();
  
  try {
    const response = await axios.get(`${YAHOO_BASE_URL}/v7/finance/quote`, {
      params: { symbols: symbols.join(',') }
    });

    for (const quote of response.data.quoteResponse.result) {
      results.set(quote.symbol, {
        symbol: quote.symbol,
        name: quote.shortName || quote.longName,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        sector: quote.sector || 'Unknown'
      });
    }
  } catch (error) {
    console.error('Batch quote error:', error);
  }

  return results;
};
```

### 2.9 AI Service Client (Backend calls Python AI Service)

```typescript
// backend/src/services/aiService.ts
import axios from 'axios';
import { IHolding } from '../models/Holding';
import { getProducer, KAFKA_TOPICS } from '../config/kafka';

interface AnalysisResult {
  portfolioRisk: {
    score: number;
    level: 'low' | 'medium' | 'high';
    summary: string;
  };
  holdings: {
    symbol: string;
    riskScore: number;
    riskLevel: 'safe' | 'moderate' | 'risky';
    reasons: string[];
    recommendation: string;
  }[];
  recommendations: string[];
  analyzedAt: string;
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const analyzePortfolio = async (
  holdings: IHolding[],
  userRiskTolerance: string
): Promise<AnalysisResult> => {
  try {
    // Format holdings for AI service
    const holdingsData = holdings.map(h => ({
      symbol: h.symbol,
      name: h.name,
      sector: h.sector,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.currentPrice,
      value: h.quantity * h.currentPrice,
      pnl: ((h.currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100
    }));

    // Calculate total value
    const totalValue = holdingsData.reduce((sum, h) => sum + h.value, 0);

    // Add weight percentage
    const enrichedHoldings = holdingsData.map(h => ({
      ...h,
      weight: (h.value / totalValue) * 100
    }));

    // Call AI service
    const response = await axios.post(`${AI_SERVICE_URL}/analyze`, {
      holdings: enrichedHoldings,
      totalValue,
      userRiskTolerance
    }, {
      timeout: 60000  // 60 second timeout for AI processing
    });

    const result: AnalysisResult = response.data;

    // Publish event to Kafka
    const producer = getProducer();
    await producer.send({
      topic: KAFKA_TOPICS.PORTFOLIO_EVENTS,
      messages: [{
        key: 'analysis_completed',
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          holdingsCount: holdings.length,
          portfolioRiskScore: result.portfolioRisk.score
        })
      }]
    });

    return result;
  } catch (error) {
    console.error('AI Analysis error:', error);
    
    // Fallback to rule-based analysis if AI service fails
    return fallbackAnalysis(holdings, userRiskTolerance);
  }
};

// Rule-based fallback if AI service is unavailable
const fallbackAnalysis = (holdings: IHolding[], riskTolerance: string): AnalysisResult => {
  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
  
  // Calculate sector concentration
  const sectorValues: Record<string, number> = {};
  holdings.forEach(h => {
    const value = h.quantity * h.currentPrice;
    sectorValues[h.sector] = (sectorValues[h.sector] || 0) + value;
  });

  const maxSectorConcentration = Math.max(...Object.values(sectorValues)) / totalValue * 100;
  const maxSingleHolding = Math.max(...holdings.map(h => (h.quantity * h.currentPrice / totalValue) * 100));

  // Calculate portfolio risk score
  let riskScore = 30;  // Base score
  if (maxSectorConcentration > 40) riskScore += 20;
  if (maxSingleHolding > 25) riskScore += 25;
  if (holdings.length < 5) riskScore += 15;

  const holdingsAnalysis = holdings.map(h => {
    const weight = (h.quantity * h.currentPrice / totalValue) * 100;
    const pnl = ((h.currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100;
    
    let holdingRisk = 30;
    const reasons: string[] = [];
    
    if (weight > 25) {
      holdingRisk += 30;
      reasons.push(`High concentration (${weight.toFixed(1)}% of portfolio)`);
    }
    if (pnl < -10) {
      holdingRisk += 20;
      reasons.push(`Significant loss (${pnl.toFixed(1)}%)`);
    }

    return {
      symbol: h.symbol,
      riskScore: holdingRisk,
      riskLevel: holdingRisk < 40 ? 'safe' : holdingRisk < 70 ? 'moderate' : 'risky' as const,
      reasons: reasons.length > 0 ? reasons : ['Within normal parameters'],
      recommendation: holdingRisk > 60 ? 'Consider reducing position' : 'Hold'
    };
  });

  return {
    portfolioRisk: {
      score: riskScore,
      level: riskScore < 40 ? 'low' : riskScore < 70 ? 'medium' : 'high',
      summary: `Rule-based analysis: ${holdings.length} holdings across ${Object.keys(sectorValues).length} sectors`
    },
    holdings: holdingsAnalysis,
    recommendations: [
      maxSectorConcentration > 40 ? 'Diversify across more sectors' : 'Sector allocation looks balanced',
      maxSingleHolding > 25 ? 'Reduce single-stock concentration' : 'Position sizing is appropriate'
    ],
    analyzedAt: new Date().toISOString()
  };
};
```

---

## 3. AI Service Implementation

### 3.1 Main FastAPI Application

```python
# ai-service/app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.analyzers.risk_analyzer import RiskAnalyzer
from app.analyzers.sentiment_analyzer import SentimentAnalyzer
from app.analyzers.recommendation_generator import RecommendationGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="InvestWise AI Service", version="1.0.0")

# Initialize analyzers
risk_analyzer = RiskAnalyzer()
sentiment_analyzer = SentimentAnalyzer()
recommendation_generator = RecommendationGenerator()


class Holding(BaseModel):
    symbol: str
    name: str
    sector: str
    quantity: float
    avgBuyPrice: float
    currentPrice: float
    value: float
    pnl: float
    weight: float


class AnalyzeRequest(BaseModel):
    holdings: List[Holding]
    totalValue: float
    userRiskTolerance: str  # conservative, moderate, aggressive


class SentimentRequest(BaseModel):
    headlines: List[str]
    symbol: Optional[str] = None


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}


@app.post("/analyze")
async def analyze_portfolio(request: AnalyzeRequest):
    """
    Main portfolio analysis endpoint.
    Uses hybrid approach: Quantitative metrics + AI qualitative analysis.
    """
    try:
        logger.info(f"Analyzing portfolio with {len(request.holdings)} holdings")
        
        # Convert to dict for processing
        holdings_data = [h.dict() for h in request.holdings]
        
        # Step 1: Risk analysis (Quantitative + AI)
        risk_result = await risk_analyzer.analyze(
            holdings_data, 
            request.totalValue,
            request.userRiskTolerance
        )
        
        # Step 2: Generate recommendations
        recommendations = await recommendation_generator.generate(
            holdings_data,
            risk_result,
            request.userRiskTolerance
        )
        
        return {
            "portfolioRisk": risk_result["portfolio"],
            "holdings": risk_result["holdings"],
            "recommendations": recommendations,
            "analyzedAt": risk_result["analyzedAt"]
        }
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sentiment")
async def analyze_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of news headlines.
    Uses few-shot prompting for consistent results.
    """
    try:
        results = await sentiment_analyzer.analyze_batch(request.headlines)
        return {"results": results}
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

### 3.2 Ollama Client (NO LangChain)

```python
# ai-service/app/utils/ollama_client.py
import httpx
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://ollama:11434"  # Docker network
MODEL = "llama3.1:8b"


async def generate(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    format: str = "json"
) -> str:
    """
    Direct HTTP call to Ollama API.
    NO LangChain/LlamaIndex - simpler and faster.
    """
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens
        }
    }
    
    if system_prompt:
        payload["system"] = system_prompt
    
    if format == "json":
        payload["format"] = "json"
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
    except httpx.TimeoutException:
        logger.error("Ollama request timed out")
        raise Exception("AI service timeout")
    except Exception as e:
        logger.error(f"Ollama error: {str(e)}")
        raise


def parse_json_response(response: str) -> Dict[str, Any]:
    """
    Safely parse JSON from LLM response.
    Handles common issues like markdown code blocks.
    """
    # Remove markdown code blocks if present
    cleaned = response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {str(e)}")
        return {}
```

### 3.3 Risk Analyzer (Hybrid Approach)

```python
# ai-service/app/analyzers/risk_analyzer.py
import logging
from datetime import datetime
from typing import Dict, List, Any

from app.utils.ollama_client import generate, parse_json_response

logger = logging.getLogger(__name__)

# Sector volatility scores (pre-defined, no AI needed)
SECTOR_VOLATILITY = {
    "Technology": 7.5,
    "Financial Services": 6.0,
    "Healthcare": 5.5,
    "Consumer Cyclical": 7.0,
    "Automobile": 7.5,
    "Energy": 8.0,
    "Basic Materials": 6.5,
    "Industrials": 6.0,
    "Consumer Defensive": 4.0,
    "Utilities": 3.5,
    "Real Estate": 5.0,
    "Communication Services": 6.5,
    "Unknown": 5.0
}


class RiskAnalyzer:
    """
    Hybrid Risk Analyzer:
    1. Quantitative metrics (calculated, no AI)
    2. AI qualitative analysis (Ollama)
    """
    
    async def analyze(
        self, 
        holdings: List[Dict], 
        total_value: float,
        user_risk_tolerance: str
    ) -> Dict[str, Any]:
        """Main analysis method."""
        
        # STEP 1: Calculate quantitative metrics (NO AI - always accurate)
        metrics = self._calculate_metrics(holdings, total_value)
        
        # STEP 2: Get AI qualitative analysis
        ai_analysis = await self._get_ai_analysis(holdings, metrics, user_risk_tolerance)
        
        # STEP 3: Combine results
        return self._combine_results(holdings, metrics, ai_analysis)
    
    def _calculate_metrics(self, holdings: List[Dict], total_value: float) -> Dict[str, Any]:
        """
        Calculate quantitative metrics.
        Pure math - no AI, always reliable.
        """
        # Sector concentration
        sector_values: Dict[str, float] = {}
        for h in holdings:
            sector = h.get("sector", "Unknown")
            sector_values[sector] = sector_values.get(sector, 0) + h["value"]
        
        sector_concentration = {
            sector: (value / total_value) * 100 
            for sector, value in sector_values.items()
        }
        max_sector_concentration = max(sector_concentration.values()) if sector_concentration else 0
        
        # Single stock risk
        single_stock_risks = []
        for h in holdings:
            if h["weight"] > 20:
                single_stock_risks.append({
                    "symbol": h["symbol"],
                    "weight": h["weight"]
                })
        
        # Weighted volatility score
        volatility_score = sum(
            (h["weight"] / 100) * SECTOR_VOLATILITY.get(h.get("sector", "Unknown"), 5.0)
            for h in holdings
        )
        
        # Diversification score (0-100, higher = better)
        diversification = min(100, len(holdings) * 10 + len(sector_values) * 15)
        
        return {
            "sectorConcentration": sector_concentration,
            "maxSectorConcentration": max_sector_concentration,
            "singleStockRisks": single_stock_risks,
            "volatilityScore": round(volatility_score, 2),
            "diversificationScore": diversification,
            "holdingsCount": len(holdings),
            "sectorsCount": len(sector_values)
        }
    
    async def _get_ai_analysis(
        self, 
        holdings: List[Dict], 
        metrics: Dict[str, Any],
        user_risk_tolerance: str
    ) -> Dict[str, Any]:
        """
        Get AI qualitative analysis.
        Uses structured JSON prompt for consistent output.
        """
        
        # Format holdings for prompt
        holdings_summary = "\n".join([
            f"- {h['symbol']} ({h['sector']}): {h['weight']:.1f}% weight, {h['pnl']:.1f}% P&L"
            for h in holdings
        ])
        
        prompt = f"""You are a portfolio risk analyst. Analyze this portfolio and provide risk assessment.

PORTFOLIO DATA:
{holdings_summary}

CALCULATED METRICS:
- Sector concentration: {metrics['maxSectorConcentration']:.1f}% max in single sector
- Volatility score: {metrics['volatilityScore']}/10
- Single stock risks: {len(metrics['singleStockRisks'])} holdings over 20%
- Diversification score: {metrics['diversificationScore']}/100

USER RISK TOLERANCE: {user_risk_tolerance}

Respond with ONLY valid JSON in this exact format:
{{
  "portfolioRiskScore": <number 0-100>,
  "portfolioRiskLevel": "<low|medium|high>",
  "portfolioSummary": "<2-3 sentence summary>",
  "holdingAnalysis": [
    {{
      "symbol": "<symbol>",
      "riskScore": <number 0-100>,
      "riskLevel": "<safe|moderate|risky>",
      "reasons": ["<reason1>", "<reason2>"],
      "recommendation": "<brief recommendation>"
    }}
  ]
}}

Be concise. Focus on actionable insights."""

        try:
            response = await generate(
                prompt=prompt,
                system_prompt="You are a conservative financial analyst. Provide accurate risk assessments.",
                temperature=0.3,
                format="json"
            )
            
            return parse_json_response(response)
            
        except Exception as e:
            logger.error(f"AI analysis failed: {str(e)}")
            # Return empty dict - will use rule-based fallback
            return {}
    
    def _combine_results(
        self, 
        holdings: List[Dict], 
        metrics: Dict[str, Any], 
        ai_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Combine quantitative metrics with AI analysis.
        If AI fails, use rule-based fallback.
        """
        
        # Portfolio-level risk
        if ai_analysis and "portfolioRiskScore" in ai_analysis:
            portfolio_risk = {
                "score": ai_analysis["portfolioRiskScore"],
                "level": ai_analysis["portfolioRiskLevel"],
                "summary": ai_analysis["portfolioSummary"]
            }
        else:
            # Fallback: rule-based portfolio risk
            score = self._calculate_fallback_risk_score(metrics)
            portfolio_risk = {
                "score": score,
                "level": "low" if score < 40 else "medium" if score < 70 else "high",
                "summary": f"Portfolio has {metrics['holdingsCount']} holdings across {metrics['sectorsCount']} sectors."
            }
        
        # Holdings-level analysis
        holdings_analysis = []
        ai_holdings = {h["symbol"]: h for h in ai_analysis.get("holdingAnalysis", [])}
        
        for h in holdings:
            symbol = h["symbol"]
            
            if symbol in ai_holdings:
                # Use AI analysis
                ai_h = ai_holdings[symbol]
                holdings_analysis.append({
                    "symbol": symbol,
                    "riskScore": ai_h["riskScore"],
                    "riskLevel": ai_h["riskLevel"],
                    "reasons": ai_h["reasons"],
                    "recommendation": ai_h["recommendation"]
                })
            else:
                # Fallback: rule-based
                risk_score = self._calculate_holding_risk(h, metrics)
                holdings_analysis.append({
                    "symbol": symbol,
                    "riskScore": risk_score,
                    "riskLevel": "safe" if risk_score < 40 else "moderate" if risk_score < 70 else "risky",
                    "reasons": self._get_fallback_reasons(h, metrics),
                    "recommendation": "Review position" if risk_score > 60 else "Hold"
                })
        
        return {
            "portfolio": portfolio_risk,
            "holdings": holdings_analysis,
            "metrics": metrics,
            "analyzedAt": datetime.utcnow().isoformat() + "Z"
        }
    
    def _calculate_fallback_risk_score(self, metrics: Dict[str, Any]) -> int:
        """Rule-based portfolio risk score."""
        score = 30  # Base
        
        if metrics["maxSectorConcentration"] > 50:
            score += 25
        elif metrics["maxSectorConcentration"] > 35:
            score += 15
            
        if len(metrics["singleStockRisks"]) > 0:
            score += 20
            
        if metrics["volatilityScore"] > 7:
            score += 15
        elif metrics["volatilityScore"] > 5:
            score += 10
            
        return min(100, score)
    
    def _calculate_holding_risk(self, holding: Dict, metrics: Dict) -> int:
        """Rule-based holding risk score."""
        score = 30
        
        if holding["weight"] > 25:
            score += 30
        elif holding["weight"] > 15:
            score += 15
            
        if holding["pnl"] < -15:
            score += 20
        elif holding["pnl"] < -5:
            score += 10
            
        sector_volatility = SECTOR_VOLATILITY.get(holding.get("sector", "Unknown"), 5)
        if sector_volatility > 7:
            score += 15
            
        return min(100, score)
    
    def _get_fallback_reasons(self, holding: Dict, metrics: Dict) -> List[str]:
        """Generate reasons for risk score (rule-based)."""
        reasons = []
        
        if holding["weight"] > 25:
            reasons.append(f"High portfolio concentration ({holding['weight']:.1f}%)")
        if holding["pnl"] < -10:
            reasons.append(f"Significant unrealized loss ({holding['pnl']:.1f}%)")
        
        sector_volatility = SECTOR_VOLATILITY.get(holding.get("sector", "Unknown"), 5)
        if sector_volatility > 7:
            reasons.append(f"High volatility sector ({holding.get('sector', 'Unknown')})")
            
        if not reasons:
            reasons.append("Within normal risk parameters")
            
        return reasons
```

### 3.4 Sentiment Analyzer (Few-Shot Prompting)

```python
# ai-service/app/analyzers/sentiment_analyzer.py
import logging
from typing import List, Dict, Any

from app.utils.ollama_client import generate, parse_json_response

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """
    News sentiment analyzer using few-shot prompting.
    Provides consistent sentiment classification for financial news.
    """
    
    async def analyze_batch(self, headlines: List[str]) -> List[Dict[str, Any]]:
        """Analyze multiple headlines in one call."""
        
        if not headlines:
            return []
        
        # Format headlines
        headlines_text = "\n".join([f"{i+1}. {h}" for i, h in enumerate(headlines)])
        
        prompt = f"""You are a financial news sentiment analyzer.

EXAMPLES:
Headline: "Tata Motors Q3 profit surges 120% on strong EV demand"
Analysis: {{"sentiment": "positive", "score": 0.85, "impact": "high"}}

Headline: "ONGC shares fall 5% as crude oil prices tumble"
Analysis: {{"sentiment": "negative", "score": -0.7, "impact": "high"}}

Headline: "Infosys to open new development center in Pune"
Analysis: {{"sentiment": "positive", "score": 0.3, "impact": "low"}}

Headline: "Markets close flat amid low trading volumes"
Analysis: {{"sentiment": "neutral", "score": 0.0, "impact": "low"}}

NOW ANALYZE THESE HEADLINES:
{headlines_text}

Respond with ONLY valid JSON array:
[
  {{"headline": "<headline>", "sentiment": "<positive|negative|neutral>", "score": <-1 to 1>, "impact": "<high|medium|low>", "summary": "<10 word summary>"}}
]"""

        try:
            response = await generate(
                prompt=prompt,
                system_prompt="You are a financial sentiment analyzer. Be accurate and concise.",
                temperature=0.2,  # Low temperature for consistency
                format="json"
            )
            
            result = parse_json_response(response)
            
            if isinstance(result, list):
                return result
            elif isinstance(result, dict) and "results" in result:
                return result["results"]
            else:
                return self._fallback_analysis(headlines)
                
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {str(e)}")
            return self._fallback_analysis(headlines)
    
    def _fallback_analysis(self, headlines: List[str]) -> List[Dict[str, Any]]:
        """
        Simple rule-based sentiment fallback.
        Uses keyword matching.
        """
        positive_keywords = ["surge", "profit", "growth", "rise", "gain", "up", "high", "strong", "beat"]
        negative_keywords = ["fall", "drop", "loss", "decline", "down", "low", "weak", "miss", "concern"]
        
        results = []
        for headline in headlines:
            headline_lower = headline.lower()
            
            pos_count = sum(1 for kw in positive_keywords if kw in headline_lower)
            neg_count = sum(1 for kw in negative_keywords if kw in headline_lower)
            
            if pos_count > neg_count:
                sentiment = "positive"
                score = min(0.8, pos_count * 0.3)
            elif neg_count > pos_count:
                sentiment = "negative"
                score = max(-0.8, neg_count * -0.3)
            else:
                sentiment = "neutral"
                score = 0.0
            
            results.append({
                "headline": headline,
                "sentiment": sentiment,
                "score": score,
                "impact": "medium",
                "summary": headline[:50] + "..." if len(headline) > 50 else headline
            })
        
        return results
```

### 3.5 Recommendation Generator

```python
# ai-service/app/analyzers/recommendation_generator.py
import logging
from typing import List, Dict, Any

from app.utils.ollama_client import generate, parse_json_response

logger = logging.getLogger(__name__)


class RecommendationGenerator:
    """
    Generates actionable recommendations based on portfolio analysis.
    Combines risk analysis with user's risk tolerance.
    """
    
    async def generate(
        self,
        holdings: List[Dict],
        risk_result: Dict[str, Any],
        user_risk_tolerance: str
    ) -> List[str]:
        """Generate personalized recommendations."""
        
        # Get high-risk holdings
        risky_holdings = [
            h for h in risk_result["holdings"]
            if h["riskLevel"] == "risky"
        ]
        
        # Get metrics
        metrics = risk_result["metrics"]
        
        prompt = f"""You are a portfolio advisor. Generate 3-5 actionable recommendations.

PORTFOLIO STATUS:
- Overall risk: {risk_result['portfolio']['level']} ({risk_result['portfolio']['score']}/100)
- Holdings: {metrics['holdingsCount']} across {metrics['sectorsCount']} sectors
- Max sector concentration: {metrics['maxSectorConcentration']:.1f}%
- Volatility score: {metrics['volatilityScore']}/10

HIGH RISK HOLDINGS:
{self._format_risky_holdings(risky_holdings) if risky_holdings else "None"}

USER RISK TOLERANCE: {user_risk_tolerance}

Respond with ONLY a JSON array of recommendation strings:
["<recommendation 1>", "<recommendation 2>", ...]

Be specific and actionable. Consider the user's risk tolerance."""

        try:
            response = await generate(
                prompt=prompt,
                system_prompt="You are a helpful financial advisor. Provide practical, actionable advice.",
                temperature=0.4,
                format="json"
            )
            
            result = parse_json_response(response)
            
            if isinstance(result, list):
                return result[:5]  # Max 5 recommendations
            elif isinstance(result, dict) and "recommendations" in result:
                return result["recommendations"][:5]
            else:
                return self._fallback_recommendations(risk_result, user_risk_tolerance)
                
        except Exception as e:
            logger.error(f"Recommendation generation failed: {str(e)}")
            return self._fallback_recommendations(risk_result, user_risk_tolerance)
    
    def _format_risky_holdings(self, holdings: List[Dict]) -> str:
        """Format risky holdings for prompt."""
        if not holdings:
            return "None"
        return "\n".join([
            f"- {h['symbol']}: {h['riskScore']}/100 - {', '.join(h['reasons'])}"
            for h in holdings
        ])
    
    def _fallback_recommendations(
        self, 
        risk_result: Dict[str, Any],
        user_risk_tolerance: str
    ) -> List[str]:
        """Generate rule-based recommendations."""
        recommendations = []
        metrics = risk_result["metrics"]
        
        # Diversification recommendation
        if metrics["holdingsCount"] < 5:
            recommendations.append(
                f"Consider adding more holdings for better diversification. "
                f"Currently only {metrics['holdingsCount']} holdings."
            )
        
        # Sector concentration
        if metrics["maxSectorConcentration"] > 40:
            recommendations.append(
                f"High sector concentration detected ({metrics['maxSectorConcentration']:.0f}%). "
                f"Consider diversifying into other sectors."
            )
        
        # Single stock risk
        if metrics["singleStockRisks"]:
            symbols = [r["symbol"] for r in metrics["singleStockRisks"]]
            recommendations.append(
                f"Reduce concentration in: {', '.join(symbols)}. "
                f"Each exceeds 20% of portfolio."
            )
        
        # Risk tolerance alignment
        portfolio_risk = risk_result["portfolio"]["level"]
        if user_risk_tolerance == "conservative" and portfolio_risk == "high":
            recommendations.append(
                "Portfolio risk exceeds your conservative tolerance. "
                "Consider shifting to defensive sectors."
            )
        elif user_risk_tolerance == "aggressive" and portfolio_risk == "low":
            recommendations.append(
                "Portfolio is conservative for your risk appetite. "
                "You may consider growth-oriented stocks."
            )
        
        if not recommendations:
            recommendations.append("Portfolio looks balanced. Continue monitoring regularly.")
        
        return recommendations
```

### 3.6 AI Service Requirements

```txt
# ai-service/requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
httpx==0.26.0
python-multipart==0.0.6
```

### 3.7 AI Service Dockerfile

```dockerfile
# ai-service/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 4. Frontend Implementation

### 4.1 Project Setup

```bash
# Create Vite + React + TypeScript project
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @tanstack/react-query zustand axios react-router-dom tailwindcss postcss autoprefixer
npm install @heroicons/react recharts
```

### 4.2 Main App Component

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PortfolioPage from './pages/PortfolioPage';
import AnalysisPage from './pages/AnalysisPage';
import AlertsPage from './pages/AlertsPage';

// Components
import Layout from './components/common/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/portfolio/:id" element={<PortfolioPage />} />
              <Route path="/portfolio/:id/analysis" element={<AnalysisPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
            </Route>
          </Route>
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

### 4.3 Auth Store (Zustand)

```typescript
// frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  requires2FA: boolean;
  tempToken: string | null;
  
  login: (email: string, password: string) => Promise<{ requires2FA: boolean }>;
  verify2FA: (code: string, isBackupCode?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  riskTolerance: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      requires2FA: false,
      tempToken: null,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        
        if (response.data.requires2FA) {
          set({
            requires2FA: true,
            tempToken: response.data.tempToken
          });
          return { requires2FA: true };
        }

        set({
          user: response.data.user,
          accessToken: response.data.accessToken,
          isAuthenticated: true,
          requires2FA: false,
          tempToken: null
        });

        localStorage.setItem('refreshToken', response.data.refreshToken);
        return { requires2FA: false };
      },

      verify2FA: async (code: string, isBackupCode = false) => {
        const { tempToken } = get();
        
        const response = await api.post('/auth/verify-2fa', {
          tempToken,
          code,
          isBackupCode
        });

        set({
          user: response.data.user,
          accessToken: response.data.accessToken,
          isAuthenticated: true,
          requires2FA: false,
          tempToken: null
        });

        localStorage.setItem('refreshToken', response.data.refreshToken);
      },

      register: async (data: RegisterData) => {
        const response = await api.post('/auth/register', data);
        
        set({
          user: response.data.user,
          accessToken: response.data.accessToken,
          isAuthenticated: true
        });

        localStorage.setItem('refreshToken', response.data.refreshToken);
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          requires2FA: false,
          tempToken: null
        });
        localStorage.removeItem('refreshToken');
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken });
        localStorage.setItem('refreshToken', refreshToken);
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
```

### 4.4 Analysis Results Component

```tsx
// frontend/src/components/analysis/AnalysisResults.tsx
import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon 
} from '@heroicons/react/24/solid';

interface HoldingAnalysis {
  symbol: string;
  riskScore: number;
  riskLevel: 'safe' | 'moderate' | 'risky';
  reasons: string[];
  recommendation: string;
}

interface AnalysisData {
  portfolioRisk: {
    score: number;
    level: 'low' | 'medium' | 'high';
    summary: string;
  };
  holdings: HoldingAnalysis[];
  recommendations: string[];
  analyzedAt: string;
}

interface Props {
  analysis: AnalysisData;
}

const getRiskIcon = (level: string) => {
  switch (level) {
    case 'safe':
    case 'low':
      return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
    case 'moderate':
    case 'medium':
      return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />;
    case 'risky':
    case 'high':
      return <XCircleIcon className="w-6 h-6 text-red-500" />;
    default:
      return null;
  }
};

const getRiskColor = (level: string): string => {
  switch (level) {
    case 'safe':
    case 'low':
      return 'bg-green-100 border-green-500 text-green-800';
    case 'moderate':
    case 'medium':
      return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    case 'risky':
    case 'high':
      return 'bg-red-100 border-red-500 text-red-800';
    default:
      return 'bg-gray-100 border-gray-500 text-gray-800';
  }
};

const AnalysisResults: React.FC<Props> = ({ analysis }) => {
  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className={`p-6 rounded-lg border-l-4 ${getRiskColor(analysis.portfolioRisk.level)}`}>
        <div className="flex items-center gap-3 mb-2">
          {getRiskIcon(analysis.portfolioRisk.level)}
          <h2 className="text-xl font-bold">
            Portfolio Risk: {analysis.portfolioRisk.score}/100
          </h2>
          <span className="px-2 py-1 rounded text-sm font-medium uppercase">
            {analysis.portfolioRisk.level}
          </span>
        </div>
        <p className="text-gray-700">{analysis.portfolioRisk.summary}</p>
      </div>

      {/* Holdings Analysis */}
      <div className="bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold p-4 border-b">Holdings Analysis</h3>
        <div className="divide-y">
          {analysis.holdings.map((holding) => (
            <div 
              key={holding.symbol} 
              className={`p-4 border-l-4 ${getRiskColor(holding.riskLevel)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getRiskIcon(holding.riskLevel)}
                  <span className="font-semibold">{holding.symbol}</span>
                </div>
                <span className="text-sm">
                  Risk Score: {holding.riskScore}/100
                </span>
              </div>
              
              {/* Reasons */}
              <ul className="list-disc list-inside text-sm text-gray-600 mb-2">
                {holding.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
              
              {/* Recommendation */}
              <p className="text-sm font-medium">
                💡 {holding.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">
          📋 Recommendations
        </h3>
        <ul className="space-y-2">
          {analysis.recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">{idx + 1}.</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Analysis Timestamp */}
      <p className="text-xs text-gray-500 text-right">
        Analyzed at: {new Date(analysis.analyzedAt).toLocaleString()}
      </p>
    </div>
  );
};

export default AnalysisResults;
```

### 4.5 WebSocket Hook for Real-Time Alerts

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface WebSocketMessage {
  type: 'price_alert' | 'portfolio_update' | 'news' | 'analysis_complete';
  data: any;
}

export const useWebSocket = (onMessage: (msg: WebSocketMessage) => void) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!accessToken) return;

    const wsUrl = `${import.meta.env.VITE_WS_URL}?token=${accessToken}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
      
      // Reconnect with exponential backoff
      if (reconnectAttempts.current < 5) {
        const delay = Math.pow(2, reconnectAttempts.current) * 1000;
        reconnectAttempts.current++;
        setTimeout(connect, delay);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [accessToken, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { isConnected, sendMessage };
};
```

---

## 5. Alert & News Services

### 5.1 Alert Service (Node.js)

```typescript
// alert-service/src/index.ts
import express from 'express';
import { Server as WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Redis for active alerts
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Kafka consumer
const kafka = new Kafka({
  clientId: 'alert-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'alert-service-group' });

// User WebSocket connections
const userConnections = new Map<string, Set<any>>();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
  // TODO: Verify JWT and get userId
  const userId = 'verified-user-id';

  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(ws);

  ws.on('close', () => {
    userConnections.get(userId)?.delete(ws);
  });
});

// Broadcast to user
const broadcastToUser = (userId: string, message: object) => {
  const connections = userConnections.get(userId);
  if (connections) {
    const data = JSON.stringify(message);
    connections.forEach(ws => {
      if (ws.readyState === 1) {
        ws.send(data);
      }
    });
  }
};

// Price update consumer
const startPriceConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'price.updates' });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const priceUpdate = JSON.parse(message.value!.toString());
      
      // Check all active alerts for this symbol
      const alertKeys = await redis.keys(`alert:*:${priceUpdate.symbol}`);
      
      for (const key of alertKeys) {
        const alert = JSON.parse(await redis.get(key) || '{}');
        
        let triggered = false;
        
        if (alert.alertType === 'price_above' && priceUpdate.price >= alert.targetValue) {
          triggered = true;
        } else if (alert.alertType === 'price_below' && priceUpdate.price <= alert.targetValue) {
          triggered = true;
        }
        
        if (triggered) {
          // Send real-time notification
          broadcastToUser(alert.userId, {
            type: 'price_alert',
            data: {
              symbol: priceUpdate.symbol,
              alertType: alert.alertType,
              targetValue: alert.targetValue,
              currentPrice: priceUpdate.price,
              message: `${priceUpdate.symbol} ${alert.alertType === 'price_above' ? 'crossed above' : 'fell below'} ₹${alert.targetValue}. Current: ₹${priceUpdate.price}`
            }
          });
          
          // Mark alert as triggered
          await redis.del(key);
        }
      }
    }
  });
};

startPriceConsumer();

server.listen(3002, () => {
  console.log('🔔 Alert Service running on port 3002');
});
```

### 5.2 News Service (Python + Cron)

```python
# news-service/app/main.py
from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import httpx
import feedparser
from typing import List, Dict
import os

app = FastAPI(title="News Service")
scheduler = AsyncIOScheduler()

# RSS Feed URLs (FREE)
RSS_FEEDS = [
    "https://news.google.com/rss/search?q=indian+stock+market&hl=en-IN",
    "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
]

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai-service:8000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:3001")


async def fetch_news_for_symbols(symbols: List[str]) -> List[Dict]:
    """Fetch news related to given stock symbols."""
    all_news = []
    
    for feed_url in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:20]:  # Limit per feed
                # Check if any symbol is mentioned
                title_lower = entry.title.lower()
                for symbol in symbols:
                    stock_name = symbol.split('.')[0].lower()
                    if stock_name in title_lower:
                        all_news.append({
                            "title": entry.title,
                            "link": entry.link,
                            "published": entry.get("published", ""),
                            "symbol": symbol
                        })
                        break
        except Exception as e:
            print(f"Error fetching feed: {e}")
    
    return all_news


async def analyze_news_sentiment(news_items: List[Dict]) -> List[Dict]:
    """Call AI service to analyze sentiment."""
    if not news_items:
        return []
    
    headlines = [n["title"] for n in news_items]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{AI_SERVICE_URL}/sentiment",
            json={"headlines": headlines}
        )
        
        if response.status_code == 200:
            sentiments = response.json()["results"]
            
            # Merge sentiment with news items
            for i, news in enumerate(news_items):
                if i < len(sentiments):
                    news["sentiment"] = sentiments[i].get("sentiment", "neutral")
                    news["sentimentScore"] = sentiments[i].get("score", 0)
                    news["summary"] = sentiments[i].get("summary", "")
            
            return news_items
    
    return news_items


async def daily_news_digest():
    """
    Generate daily news digest for all users.
    Runs at 6:00 AM IST.
    """
    print(f"Starting daily news digest at {datetime.now()}")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get all unique symbols from backend
            response = await client.get(
                f"{BACKEND_URL}/api/internal/all-symbols",
                headers={"X-Internal-Key": os.getenv("INTERNAL_API_KEY", "")}
            )
            
            if response.status_code != 200:
                print("Failed to fetch symbols")
                return
            
            symbols = response.json()["symbols"]
            
            # Fetch news
            news_items = await fetch_news_for_symbols(symbols)
            
            # Analyze sentiment
            analyzed_news = await analyze_news_sentiment(news_items)
            
            # Send to backend for distribution
            await client.post(
                f"{BACKEND_URL}/api/internal/distribute-digest",
                json={"news": analyzed_news, "date": datetime.now().isoformat()},
                headers={"X-Internal-Key": os.getenv("INTERNAL_API_KEY", "")}
            )
            
            print(f"Daily digest completed. Processed {len(analyzed_news)} news items.")
            
    except Exception as e:
        print(f"Daily digest error: {e}")


@app.on_event("startup")
async def startup():
    # Schedule daily digest at 6:00 AM IST (0:30 UTC)
    scheduler.add_job(daily_news_digest, 'cron', hour=0, minute=30)
    scheduler.start()
    print("📰 News Service started. Daily digest scheduled for 6:00 AM IST.")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "news-service"}


@app.post("/trigger-digest")
async def manual_trigger():
    """Manual trigger for testing."""
    await daily_news_digest()
    return {"status": "triggered"}
```

---

## 6. Infrastructure

### 6.1 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Frontend
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:3001/api
      - VITE_WS_URL=ws://localhost:3002
    depends_on:
      - backend

  # Backend API
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - MONGODB_URI=mongodb://mongo:27017/investwise
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - KAFKA_BROKER=kafka:9092
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - AI_SERVICE_URL=http://ai-service:8000
    depends_on:
      - mongo
      - redis
      - kafka

  # AI Service (Python)
  ai-service:
    build: ./ai-service
    ports:
      - "8000:8000"
    environment:
      - OLLAMA_HOST=http://ollama:11434
    depends_on:
      - ollama

  # Alert Service
  alert-service:
    build: ./alert-service
    ports:
      - "3002:3002"
    environment:
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKER=kafka:9092
    depends_on:
      - redis
      - kafka

  # News Service
  news-service:
    build: ./news-service
    ports:
      - "8001:8001"
    environment:
      - AI_SERVICE_URL=http://ai-service:8000
      - BACKEND_URL=http://backend:3001
    depends_on:
      - ai-service
      - backend

  # MongoDB
  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Kafka
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  # Ollama (Local LLM)
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  mongo_data:
  redis_data:
  ollama_data:
```

### 6.2 Kubernetes Deployment (Backend Example)

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app: investwise
    component: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: investwise
      component: backend
  template:
    metadata:
      labels:
        app: investwise
        component: backend
    spec:
      containers:
        - name: backend
          image: investwise/backend:latest
          ports:
            - containerPort: 3001
          env:
            - name: PORT
              value: "3001"
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: investwise-secrets
                  key: mongodb-uri
            - name: REDIS_HOST
              value: "redis-service"
            - name: KAFKA_BROKER
              value: "kafka-service:9092"
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: investwise-secrets
                  key: jwt-secret
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: investwise-secrets
                  key: encryption-key
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 15
            periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: investwise
    component: backend
  ports:
    - port: 3001
      targetPort: 3001
  type: ClusterIP
```

### 6.3 Environment Variables Template

```env
# .env.example

# Backend
PORT=3001
MONGODB_URI=mongodb://localhost:27017/investwise
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKER=localhost:9092

# Security (Generate these!)
JWT_SECRET=your-256-bit-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
ENCRYPTION_KEY=your-32-byte-hex-encryption-key

# AI Service
AI_SERVICE_URL=http://localhost:8000
OLLAMA_HOST=http://localhost:11434

# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3002
```

---

## Summary

### Technology Decisions

| Component | Technology | Reason |
|-----------|------------|--------|
| Backend | Express + TypeScript | Type safety, good ecosystem |
| Frontend | React + Vite | Fast build, modern tooling |
| Database | MongoDB | Flexible schema for portfolios |
| Cache | Redis | Rate limiting, sessions |
| Queue | Kafka | Event-driven architecture |
| AI | Direct Ollama calls | Simple, fast, no framework overhead |
| LLM | Llama 3.1 8B | FREE, local, good quality |

### AI Architecture (Key Decision)

```
❌ NOT USED:
- LangChain (abstraction overhead)
- CrewAI (overkill for deterministic tasks)
- LangGraph (simple linear flow, not a graph)

✅ USED:
- Direct HTTP calls to Ollama
- Structured JSON prompts
- Hybrid: Quantitative metrics + AI qualitative analysis
- Few-shot prompting for sentiment
- Rule-based fallbacks for reliability
```

### Security Implemented

| Feature | Implementation |
|---------|---------------|
| 2FA | TOTP (speakeasy) + backup codes |
| Encryption | AES-256-GCM for secrets |
| Rate Limiting | Redis-backed, tiered limits |
| Password | bcrypt with cost 12 |
| Sessions | JWT + refresh tokens |
