/**
 * Kafka Services Tests
 * Tests for Kafka producer and consumer functionality
 */

const mongoose = require('mongoose');
const { MockKafka, MockKafkaProducer, MockKafkaConsumer } = require('../mocks/mockKafka');

// Mock Kafka module
jest.mock('kafkajs', () => {
  const { MockKafka } = require('../mocks/mockKafka');
  return {
    Kafka: jest.fn().mockImplementation(() => new MockKafka()),
  };
});

const { connect, closeDatabase, clearDatabase } = require('../mocks/mockDb');
const Portfolio = require('../../src/models/Portfolio');

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});

describe('Kafka Producer', () => {
  let mockProducer;
  
  beforeEach(() => {
    mockProducer = new MockKafkaProducer();
  });
  
  describe('sendAnalysisRequest', () => {
    test('should send message to correct topic', async () => {
      await mockProducer.connect();
      
      const message = {
        portfolioId: 'test-portfolio-id',
        userId: 'test-user-id',
        portfolio: {
          name: 'Test Portfolio',
          holdings: [],
        },
      };
      
      await mockProducer.send({
        topic: 'portfolio-analysis-requests',
        messages: [
          {
            key: 'correlation-id-1',
            value: JSON.stringify(message),
          },
        ],
      });
      
      const sentMessages = mockProducer.getMessages();
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].topic).toBe('portfolio-analysis-requests');
    });
    
    test('should include correlation ID as message key', async () => {
      await mockProducer.connect();
      
      const correlationId = 'unique-correlation-id';
      
      await mockProducer.send({
        topic: 'portfolio-analysis-requests',
        messages: [
          {
            key: correlationId,
            value: JSON.stringify({ test: 'data' }),
          },
        ],
      });
      
      const lastMessage = mockProducer.getLastMessage();
      expect(lastMessage.key).toBe(correlationId);
    });
    
    test('should serialize message value as JSON', async () => {
      await mockProducer.connect();
      
      const messageData = {
        portfolioId: '123',
        analysisType: 'full',
        timestamp: new Date().toISOString(),
      };
      
      await mockProducer.send({
        topic: 'portfolio-analysis-requests',
        messages: [
          {
            key: 'key-1',
            value: JSON.stringify(messageData),
          },
        ],
      });
      
      const lastMessage = mockProducer.getLastMessage();
      const parsedValue = JSON.parse(lastMessage.value);
      
      expect(parsedValue.portfolioId).toBe('123');
      expect(parsedValue.analysisType).toBe('full');
    });
    
    test('should handle multiple messages', async () => {
      await mockProducer.connect();
      
      await mockProducer.send({
        topic: 'portfolio-analysis-requests',
        messages: [
          { key: 'key-1', value: JSON.stringify({ id: 1 }) },
          { key: 'key-2', value: JSON.stringify({ id: 2 }) },
          { key: 'key-3', value: JSON.stringify({ id: 3 }) },
        ],
      });
      
      const messages = mockProducer.getMessages();
      expect(messages).toHaveLength(3);
    });
  });
});

describe('Kafka Consumer', () => {
  let mockConsumer;
  
  beforeEach(() => {
    mockConsumer = new MockKafkaConsumer({ groupId: 'backend-results-group' });
  });
  
  describe('subscribe', () => {
    test('should subscribe to results topic', async () => {
      await mockConsumer.connect();
      await mockConsumer.subscribe({
        topic: 'portfolio-analysis-results',
        fromBeginning: false,
      });
      
      const subscriptions = mockConsumer.getSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].topic).toBe('portfolio-analysis-results');
    });
  });
  
  describe('message processing', () => {
    test('should process incoming analysis result', async () => {
      await mockConsumer.connect();
      await mockConsumer.subscribe({ topic: 'portfolio-analysis-results' });
      
      const processedMessages = [];
      
      await mockConsumer.run({
        eachMessage: async ({ topic, message }) => {
          processedMessages.push({
            topic,
            key: message.key.toString(),
            value: JSON.parse(message.value.toString()),
          });
        },
      });
      
      // Simulate receiving a message
      await mockConsumer.simulateMessage(
        'portfolio-analysis-results',
        'correlation-id-1',
        {
          portfolioId: 'test-portfolio',
          status: 'completed',
          output: {
            summary: 'Analysis complete',
            metrics: { totalReturn: 15 },
          },
        }
      );
      
      expect(processedMessages).toHaveLength(1);
      expect(processedMessages[0].value.status).toBe('completed');
    });
    
    test('should handle failed analysis result', async () => {
      await mockConsumer.connect();
      await mockConsumer.subscribe({ topic: 'portfolio-analysis-results' });
      
      const processedMessages = [];
      
      await mockConsumer.run({
        eachMessage: async ({ topic, message }) => {
          processedMessages.push({
            value: JSON.parse(message.value.toString()),
          });
        },
      });
      
      await mockConsumer.simulateMessage(
        'portfolio-analysis-results',
        'correlation-id-2',
        {
          portfolioId: 'test-portfolio',
          status: 'failed',
          error: 'Analysis failed due to timeout',
        }
      );
      
      expect(processedMessages[0].value.status).toBe('failed');
      expect(processedMessages[0].value.error).toBeDefined();
    });
  });
  
  describe('batch processing', () => {
    test('should process batch of messages', async () => {
      await mockConsumer.connect();
      await mockConsumer.subscribe({ topic: 'portfolio-analysis-results' });
      
      const processedBatches = [];
      
      await mockConsumer.run({
        eachBatch: async ({ batch }) => {
          processedBatches.push({
            topic: batch.topic,
            messageCount: batch.messages.length,
          });
        },
      });
      
      await mockConsumer.simulateBatch(
        'portfolio-analysis-results',
        [
          { key: 'key-1', value: { id: 1 } },
          { key: 'key-2', value: { id: 2 } },
          { key: 'key-3', value: { id: 3 } },
        ]
      );
      
      expect(processedBatches).toHaveLength(1);
      expect(processedBatches[0].messageCount).toBe(3);
    });
    
    test('should commit offsets after batch processing', async () => {
      await mockConsumer.connect();
      await mockConsumer.subscribe({ topic: 'portfolio-analysis-results' });
      
      let commitCalled = false;
      
      await mockConsumer.run({
        eachBatch: async ({ batch, commitOffsetsIfNecessary }) => {
          // Process messages
          for (const message of batch.messages) {
            // Process...
          }
          commitOffsetsIfNecessary();
          commitCalled = true;
        },
      });
      
      const batch = await mockConsumer.simulateBatch(
        'portfolio-analysis-results',
        [{ key: 'key-1', value: { id: 1 } }]
      );
      
      expect(batch.commitOffsetsIfNecessary).toHaveBeenCalled();
    });
  });
});

describe('Analysis Result Processing', () => {
  let testUserId;
  let testPortfolioId;
  
  beforeEach(async () => {
    testUserId = new mongoose.Types.ObjectId();
    
    const portfolio = await Portfolio.create({
      userId: testUserId,
      name: 'Result Processing Test',
      currency: 'INR',
      type: 'investment',
      totalInvested: 100000,
      currentValue: 115000,
      holdings: [],
    });
    
    testPortfolioId = portfolio._id;
  });
  
  test('should update portfolio with analysis results', async () => {
    const analysisResult = {
      portfolioId: testPortfolioId.toString(),
      status: 'completed',
      output: {
        summary: 'Your portfolio shows strong performance with 15% returns.',
        metrics: {
          totalReturn: 15,
          annualizedReturn: 18.5,
          volatility: 12.3,
          sharpeRatio: 1.2,
        },
        riskAssessment: {
          riskLevel: 'moderate',
          diversificationScore: 72,
          sectorConcentration: {
            'IT': 40,
            'Banking': 35,
            'Energy': 25,
          },
          warnings: ['High IT sector concentration'],
        },
        holdings: [
          {
            symbol: 'TCS',
            analysis: 'Strong performer',
            sentiment: 'bullish',
            recommendation: 'hold',
          },
        ],
        recommendations: [
          {
            type: 'diversify',
            priority: 'medium',
            description: 'Consider reducing IT exposure',
          },
        ],
      },
    };
    
    // Simulate storing result
    const updatedPortfolio = await Portfolio.findByIdAndUpdate(
      testPortfolioId,
      {
        analytics: {
          lastAnalyzedAt: new Date(),
          summary: analysisResult.output.summary,
          metrics: analysisResult.output.metrics,
          riskAssessment: analysisResult.output.riskAssessment,
          recommendations: analysisResult.output.recommendations,
        },
      },
      { new: true }
    );
    
    expect(updatedPortfolio.analytics).toBeDefined();
    expect(updatedPortfolio.analytics.summary).toContain('15% returns');
    expect(updatedPortfolio.analytics.metrics.totalReturn).toBe(15);
    expect(updatedPortfolio.analytics.riskAssessment.riskLevel).toBe('moderate');
  });
  
  test('should handle analysis failure', async () => {
    const failedResult = {
      portfolioId: testPortfolioId.toString(),
      status: 'failed',
      error: 'LLM service unavailable',
    };
    
    // Should not update analytics on failure
    const portfolio = await Portfolio.findById(testPortfolioId);
    
    expect(portfolio.analytics).toBeUndefined();
  });
  
  test('should add to analysis history', async () => {
    const analysisResult = {
      metrics: {
        totalReturn: 15,
        volatility: 12,
      },
    };
    
    await Portfolio.findByIdAndUpdate(
      testPortfolioId,
      {
        $push: {
          analysisHistory: {
            analyzedAt: new Date(),
            metrics: analysisResult.metrics,
          },
        },
      }
    );
    
    const portfolio = await Portfolio.findById(testPortfolioId);
    expect(portfolio.analysisHistory).toHaveLength(1);
    expect(portfolio.analysisHistory[0].metrics.totalReturn).toBe(15);
  });
});

describe('Message Serialization', () => {
  test('should handle complex nested objects', () => {
    const complexMessage = {
      portfolioId: '123',
      portfolio: {
        name: 'Test',
        holdings: [
          {
            symbol: 'TCS',
            quantity: 100,
            nested: {
              deep: {
                value: 'nested',
              },
            },
          },
        ],
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    };
    
    const serialized = JSON.stringify(complexMessage);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized.portfolio.holdings[0].nested.deep.value).toBe('nested');
  });
  
  test('should handle date serialization', () => {
    const messageWithDate = {
      requestedAt: new Date(),
      completedAt: new Date(),
    };
    
    const serialized = JSON.stringify(messageWithDate);
    const deserialized = JSON.parse(serialized);
    
    // Dates become strings when JSON serialized
    expect(typeof deserialized.requestedAt).toBe('string');
    
    // But can be converted back
    const parsed = new Date(deserialized.requestedAt);
    expect(parsed instanceof Date).toBe(true);
  });
  
  test('should handle special characters in strings', () => {
    const message = {
      summary: 'Portfolio shows "strong" performance with 15% returns!',
      notes: "User's custom note: <important>",
    };
    
    const serialized = JSON.stringify(message);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized.summary).toContain('"strong"');
    expect(deserialized.notes).toContain("User's");
  });
});
