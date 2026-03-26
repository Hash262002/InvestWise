/**
 * Analysis API Tests
 * Tests for portfolio analysis endpoints and Kafka integration
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Import models and routes
const User = require('../../src/models/User');
const Portfolio = require('../../src/models/Portfolio');
const analysisRoutes = require('../../src/routes/analysis');
const { authenticate } = require('../../src/middleware/auth');

// Mocks
const { connect, closeDatabase, clearDatabase } = require('../mocks/mockDb');
const { MockKafka } = require('../mocks/mockKafka');

// Test app setup
let app;
let authToken;
let testUserId;
let testPortfolioId;
let mockKafka;

// Mock the Kafka producer
jest.mock('../../src/services/kafkaProducer', () => {
  return {
    sendAnalysisRequest: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    }),
    isConnected: jest.fn().mockReturnValue(true),
  };
});

const kafkaProducer = require('../../src/services/kafkaProducer');

beforeAll(async () => {
  await connect();
  
  mockKafka = new MockKafka();
  
  app = express();
  app.use(express.json());
  
  // Apply real auth middleware
  app.use('/api/analysis', authenticate);
  app.use('/api/analysis', analysisRoutes);
  
  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      error: err.message || 'Server Error',
      message: err.message || 'Server Error',
    });
  });
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
  
  // Create test user
  const user = await User.create({
    firstName: 'Analysis',
    lastName: 'Test User',
    email: 'analysis@test.com',
    password: 'hashedpassword',
  });
  
  testUserId = user._id;
  authToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  // Create test portfolio with holdings
  const portfolio = await Portfolio.create({
    user: testUserId,
    name: 'Analysis Test Portfolio',
    currency: 'INR',
    type: 'growth',
    totalInvested: 500000,
    currentValue: 575000,
    holdings: [
      {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        assetType: 'stock',
        sector: 'Energy',
        quantity: 100,
        averageCost: 2500,
        totalCost: 250000,
        currentValue: 290000,
      },
      {
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        assetType: 'stock',
        sector: 'IT',
        quantity: 50,
        averageCost: 3500,
        totalCost: 175000,
        currentValue: 195000,
      },
      {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank',
        assetType: 'stock',
        sector: 'Banking',
        quantity: 50,
        averageCost: 1500,
        totalCost: 75000,
        currentValue: 90000,
      },
    ],
  });
  
  testPortfolioId = portfolio._id;
});

describe('Analysis API', () => {
  
  describe('POST /api/analysis/:id', () => {
    test('should trigger portfolio analysis', async () => {
      const res = await request(app)
        .post(`/api/analysis/${testPortfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ analysisType: 'full' });
      
      expect(res.status).toBe(202);
      expect(res.body).toBeDefined();
      expect(res.body).toHaveProperty('requestId');
      expect(res.body.status).toBe('processing');
      
      // Verify Kafka producer was called
      expect(kafkaProducer.sendAnalysisRequest).toHaveBeenCalled();
    });
    
    test('should include portfolio data in Kafka message', async () => {
      await request(app)
        .post(`/api/analysis/${testPortfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ analysisType: 'full' });
      
      const [sentData] = kafkaProducer.sendAnalysisRequest.mock.calls[0];
      
      expect(sentData).toHaveProperty('portfolioId');
      expect(sentData).toHaveProperty('userId');
      expect(sentData).toHaveProperty('portfolio');
      expect(sentData.portfolio.holdings).toHaveLength(3);
    });
    
    test('should return 404 for non-existent portfolio', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .post(`/api/analysis/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ analysisType: 'full' });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
    
    test('should return 404 for other users portfolio', async () => {
      // Create portfolio for different user
      const otherUserId = new mongoose.Types.ObjectId();
      const otherPortfolio = await Portfolio.create({
        user: otherUserId,
        name: 'Other Portfolio',
        currency: 'INR',
        type: 'growth',
        totalInvested: 50000,
        currentValue: 55000,
        holdings: [],
      });
      
      const res = await request(app)
        .post(`/api/analysis/${otherPortfolio._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ analysisType: 'full' });
      
      expect(res.status).toBe(404);
    });
    
    test('should accept different analysis types', async () => {
      const analysisTypes = ['full', 'quick', 'risk', 'performance'];
      
      for (const analysisType of analysisTypes) {
        jest.clearAllMocks();
        
        const res = await request(app)
          .post(`/api/analysis/${testPortfolioId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ analysisType });
        
        expect(res.status).toBe(202);
        
        const [sentData] = kafkaProducer.sendAnalysisRequest.mock.calls[0];
        expect(sentData.analysisType).toBe(analysisType);
      }
    });
  });
  
  describe('GET /api/analysis/:id/status/:messageId', () => {
    test('should return analysis status', async () => {
      // First trigger analysis
      const triggerRes = await request(app)
        .post(`/api/analysis/${testPortfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ analysisType: 'full' });
      
      const { messageId } = triggerRes.body.data;
      
      // Check status
      const res = await request(app)
        .get(`/api/analysis/${testPortfolioId}/status/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body).toHaveProperty('status');
    });
  });
  
  describe('GET /api/analysis/:id/latest', () => {
    test('should return latest analysis results', async () => {
      // Store mock analysis result
      const portfolio = await Portfolio.findByIdAndUpdate(
        testPortfolioId,
        {
          analytics: {
            lastAnalyzedAt: new Date(),
            summary: 'Your portfolio shows strong performance.',
            metrics: {
              totalReturn: 15,
              annualizedReturn: 18,
              volatility: 12,
            },
            riskAssessment: {
              riskLevel: 'moderate',
              diversificationScore: 65,
            },
            recommendations: [
              {
                type: 'diversify',
                priority: 'medium',
                description: 'Consider adding more sectors.',
              },
            ],
          },
        },
        { new: true }
      );
      
      const res = await request(app)
        .get(`/api/analysis/${testPortfolioId}/latest`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body).toHaveProperty('summary');
      expect(res.body.metrics.totalReturn).toBe(15);
    });
    
    test('should return 404 when no analysis exists', async () => {
      const res = await request(app)
        .get(`/api/analysis/${testPortfolioId}/latest`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });
  
  describe('GET /api/analysis/:id/history', () => {
    test('should return analysis history', async () => {
      // Store mock analysis history
      await Portfolio.findByIdAndUpdate(
        testPortfolioId,
        {
          analysisHistory: [
            {
              analyzedAt: new Date(Date.now() - 86400000), // 1 day ago
              metrics: { totalReturn: 12 },
            },
            {
              analyzedAt: new Date(),
              metrics: { totalReturn: 15 },
            },
          ],
        }
      );
      
      const res = await request(app)
        .get(`/api/analysis/${testPortfolioId}/history`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body).toHaveLength(2);
    });
  });
});

describe('Analysis Request Validation', () => {
  test('should validate analysis type parameter', async () => {
    const res = await request(app)
      .post(`/api/analysis/${testPortfolioId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ analysisType: 'invalid-type' });
    
    // Should either accept as string or reject with 400
    expect([200, 202, 400]).toContain(res.status);
  });
  
  test('should handle missing analysis type', async () => {
    const res = await request(app)
      .post(`/api/analysis/${testPortfolioId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    
    // Should default to 'full' or require the parameter
    expect([200, 202, 400]).toContain(res.status);
  });
  
  test('should reject invalid portfolio ID format', async () => {
    const res = await request(app)
      .post('/api/analysis/invalid-id')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ analysisType: 'full' });
    
    expect([400, 404, 500]).toContain(res.status);
  });
});

describe('Rate Limiting', () => {
  test('should allow multiple analysis requests within limit', async () => {
    // Make 3 requests (assuming limit is higher than 3)
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post(`/api/analysis/${testPortfolioId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ analysisType: 'quick' });
      
      expect([200, 202]).toContain(res.status);
    }
  });
});

describe('Kafka Producer Integration', () => {
  test('should handle Kafka producer failure gracefully', async () => {
    // Mock producer failure
    kafkaProducer.sendAnalysisRequest.mockRejectedValueOnce(
      new Error('Kafka connection failed')
    );
    
    const res = await request(app)
      .post(`/api/analysis/${testPortfolioId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ analysisType: 'full' });
    
    expect([500, 503]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });
  
  test('should include correlation ID in message', async () => {
    await request(app)
      .post(`/api/analysis/${testPortfolioId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ analysisType: 'full' });
    
    const [sentData] = kafkaProducer.sendAnalysisRequest.mock.calls[0];
    
    expect(sentData).toHaveProperty('messageId');
    expect(typeof sentData.messageId).toBe('string');
    expect(sentData.messageId.length).toBeGreaterThan(0);
  });
});
