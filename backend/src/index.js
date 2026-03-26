const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { connectKafka, disconnectKafka } = require('./config/kafka');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const analysisRoutes = require('./routes/analysis');
const marketRoutes = require('./routes/market');

// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// NoSQL injection prevention
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized potentially malicious key: ${key}`, {
      ip: req.ip,
      path: req.path,
    });
  },
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mongodb: 'unknown',
        redis: 'unknown',
        kafka: 'unknown',
      },
    };

    // Check MongoDB
    const mongoose = require('mongoose');
    health.services.mongodb = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Check Redis
    const { getRedisClient } = require('./config/redis');
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      health.services.redis = 'connected';
    }

    // Check Kafka
    const { isKafkaConnected } = require('./config/kafka');
    health.services.kafka = isKafkaConnected() ? 'connected' : 'disconnected';

    const allHealthy = Object.values(health.services).every(s => s === 'connected');
    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/market', marketRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    await disconnectKafka();
    logger.info('Kafka disconnected');
    
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    logger.info('MongoDB connected');

    await connectRedis();
    logger.info('Redis connected');

    await connectKafka();
    logger.info('Kafka connected');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
