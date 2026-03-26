// ========================================
// InvestWise Backend - Main Entry Point
// ========================================
// This is the main file that starts the Express server
// and initializes all connections (MongoDB, Redis, Kafka)
// ========================================

// Load environment variables first (before anything else!)
const { fileURLToPath } = require('node:url');
const { dirname } = require('node:path');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ----------------------------------------
// Import Dependencies
// ----------------------------------------
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import configuration modules
const { connectDB, disconnectDB } = require('./config/db');
const { connectRedis, disconnectRedis } = require('./config/redis');

// Import routes
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const holdingRoutes = require('./routes/holdings');
const importsRoutes = require('./routes/imports');
const marketRoutes = require('./routes/market');
const analysisRoutes = require('./routes/analysis');

// Import Kafka services
const kafkaProducer = require('./services/kafkaProducer');
const kafkaConsumer = require('./services/kafkaConsumer');

// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');

// ----------------------------------------
// Initialize Express App
// ----------------------------------------
const app = express();
const PORT = process.env.PORT || 3001;

// ----------------------------------------
// Security Middleware
// ----------------------------------------

// Helmet: Sets various HTTP headers for security
// - Removes X-Powered-By header
// - Sets X-Content-Type-Options: nosniff
// - Sets X-Frame-Options: DENY
// - And many more...
app.use(helmet());

// CORS: Cross-Origin Resource Sharing
// Allows the frontend (on different port/domain) to make requests
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5176',
      'http://127.0.0.1:5177',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// ----------------------------------------
// Body Parsing Middleware
// ----------------------------------------

// Parse JSON bodies (for POST/PUT requests)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----------------------------------------
// Request Logging Middleware
// ----------------------------------------
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  
  // Log request
  console.log(`[${timestamp}] ${method} ${url}`);
  
  // Track response time
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    let statusColor;
    if (status >= 400) {
      statusColor = '🔴';
    } else if (status >= 300) {
      statusColor = '🟡';
    } else {
      statusColor = '🟢';
    }
    console.log(`[${timestamp}] ${statusColor} ${status} ${method} ${url} ${duration}ms`);
  });
  
  next();
});

// ----------------------------------------
// API Routes
// ----------------------------------------

// Health check endpoint - used by load balancers and monitoring
app.get('/health', async (req, res) => {
  try {
    // Basic health response
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'InvestWise API',
    version: '1.0.0',
    description: 'AI-powered investment portfolio analyzer',
    documentation: '/api/docs',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      portfolios: '/api/portfolios',
      holdings: '/api/holdings',
      alerts: '/api/alerts',
      analysis: '/api/analysis',
    },
  });
});

// API version prefix
const API_PREFIX = '/api';

// Apply general rate limiter to all API routes
app.use(API_PREFIX, generalLimiter);

// Mount routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/portfolios`, portfolioRoutes);
app.use(`${API_PREFIX}/holdings`, holdingRoutes);
app.use(`${API_PREFIX}/imports`, importsRoutes);
app.use(`${API_PREFIX}/market`, marketRoutes);
app.use(`${API_PREFIX}/analysis`, analysisRoutes);

// Temporary test routes
app.get(`${API_PREFIX}/test`, (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
  });
});

// Echo endpoint for testing POST requests
app.post(`${API_PREFIX}/echo`, (req, res) => {
  res.json({
    message: 'Received your data!',
    data: req.body,
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------
// Error Handling Middleware
// ----------------------------------------

// 404 Handler - No route matched
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors,
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `${field} already exists`,
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired',
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ----------------------------------------
// Server Startup
// ----------------------------------------

const startServer = async () => {
  try {
    console.log('');
    console.log('🚀 ================================');
    console.log('   InvestWise API Server');
    console.log('   ================================');
    console.log('');
    
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await connectDB();
    
    // Connect to Redis
    console.log('🔴 Connecting to Redis...');
    connectRedis();
    
    // Connect to Kafka
    console.log('📨 Connecting to Kafka...');
    try {
      await kafkaProducer.connect();
      await kafkaConsumer.subscribe();
      await kafkaConsumer.startConsuming();
      console.log('✅ Kafka connected');
    } catch (kafkaError) {
      console.warn('⚠️ Kafka connection failed (service may not be available):', kafkaError.message);
      console.warn('   Analysis features will not work until Kafka is available');
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log('');
      console.log('   ================================');
      console.log(`   ✅ Server running!`);
      console.log(`   📍 URL: http://localhost:${PORT}`);
      console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('   ================================');
      console.log('');
      console.log('   Endpoints:');
      console.log(`   • Health:  http://localhost:${PORT}/health`);
      console.log(`   • API:     http://localhost:${PORT}/api`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ----------------------------------------
// Graceful Shutdown
// ----------------------------------------

const shutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
  
  try {
    // Close database connections
    await disconnectDB();
    await disconnectRedis();
    
    // Disconnect Kafka
    await kafkaProducer.disconnect();
    await kafkaConsumer.disconnect();
    
    console.log('✅ All connections closed. Goodbye!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start the server
startServer();
