// ========================================
// Kafka Configuration
// ========================================

const { Kafka, logLevel } = require('kafkajs');

// ----------------------------------------
// Kafka Client Configuration
// ----------------------------------------

const kafka = new Kafka({
  clientId: 'investwise-backend',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 300,
    retries: 10,
    maxRetryTime: 30000,
  },
  logLevel: process.env.NODE_ENV === 'production' ? logLevel.ERROR : logLevel.INFO,
});

// ----------------------------------------
// Topics Configuration
// ----------------------------------------

const TOPICS = {
  ANALYSIS_REQUESTS: 'portfolio.analysis.requests',
  ANALYSIS_RESULTS: 'portfolio.analysis.results',
};

// ----------------------------------------
// Consumer Groups
// ----------------------------------------

const CONSUMER_GROUPS = {
  ANALYSIS_RESULTS: 'backend-analysis-results-group',
};

module.exports = {
  kafka,
  TOPICS,
  CONSUMER_GROUPS,
};
