/**
 * Jest Test Setup - Runs before all tests
 */

const mongoose = require('mongoose');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/investwise_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';

// Increase timeout for async operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  /**
   * Generate a valid MongoDB ObjectId
   */
  generateObjectId: () => new mongoose.Types.ObjectId(),
  
  /**
   * Create a mock user object
   */
  createMockUser: (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword123',
    createdAt: new Date(),
    ...overrides,
  }),
  
  /**
   * Create a mock portfolio object
   */
  createMockPortfolio: (userId, overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    name: 'Test Portfolio',
    description: 'A test portfolio',
    currency: 'INR',
    type: 'growth',
    totalInvested: 100000,
    currentValue: 115000,
    holdings: [],
    createdAt: new Date(),
    ...overrides,
  }),
  
  /**
   * Create a mock holding object
   */
  createMockHolding: (overrides = {}) => ({
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    assetType: 'stock',
    exchange: 'NSE',
    sector: 'Energy',
    quantity: 100,
    averageCost: 2500,
    totalCost: 250000,
    currency: 'INR',
    currentValue: 275000,
    ...overrides,
  }),
  
  /**
   * Wait for a specified time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Console output suppression for cleaner test output
if (process.env.SUPPRESS_LOGS !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging
    error: console.error,
  };
}

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
