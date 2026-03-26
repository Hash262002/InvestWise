const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

let kafka = null;
let producer = null;
let consumer = null;
let isConnected = false;

const connectKafka = async () => {
  try {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    
    kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'investwise-backend',
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    // Initialize producer
    producer = kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });

    await producer.connect();
    logger.info('Kafka producer connected');

    // Initialize consumer for analysis results
    consumer = kafka.consumer({
      groupId: 'backend-results-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();
    logger.info('Kafka consumer connected');

    // Subscribe to results topic
    const resultsTopic = process.env.KAFKA_RESULT_TOPIC || 'portfolio-analysis-results';
    await consumer.subscribe({
      topic: resultsTopic,
      fromBeginning: false,
    });

    isConnected = true;
    
    // Start consuming (handled by kafkaConsumer service)
    const { startBatchConsumer } = require('../services/kafkaConsumer');
    await startBatchConsumer(consumer);

    return { producer, consumer };
  } catch (error) {
    logger.error('Kafka connection failed:', error);
    throw error;
  }
};

const getProducer = () => producer;
const getConsumer = () => consumer;
const isKafkaConnected = () => isConnected;

const disconnectKafka = async () => {
  try {
    if (producer) {
      await producer.disconnect();
      producer = null;
    }
    if (consumer) {
      await consumer.disconnect();
      consumer = null;
    }
    isConnected = false;
    logger.info('Kafka disconnected');
  } catch (error) {
    logger.error('Error disconnecting Kafka:', error);
  }
};

module.exports = {
  connectKafka,
  getProducer,
  getConsumer,
  isKafkaConnected,
  disconnectKafka,
};
