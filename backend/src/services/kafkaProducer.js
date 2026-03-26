const { v4: uuidv4 } = require('uuid');
const { getProducer } = require('../config/kafka');
const logger = require('../utils/logger');

/**
 * Send analysis request to Kafka topic
 */
const sendAnalysisRequest = async (portfolioId, userId, portfolio) => {
  const producer = getProducer();
  
  if (!producer) {
    throw new Error('Kafka producer not connected');
  }

  const message = {
    messageId: uuidv4(),
    portfolioId: portfolioId.toString(),
    userId: userId.toString(),
    portfolio: {
      name: portfolio.name,
      totalInvested: portfolio.totalInvested,
      currentValue: portfolio.currentValue,
      currency: portfolio.currency,
      type: portfolio.type,
      holdings: portfolio.holdings
        .filter(h => h.isActive)
        .map(h => ({
          symbol: h.symbol,
          name: h.name,
          assetType: h.assetType,
          sector: h.sector,
          exchange: h.exchange,
          quantity: h.quantity,
          averageCost: h.averageCost,
          totalCost: h.totalCost,
          currentValue: h.currentValue,
        })),
    },
    requestedAt: new Date().toISOString(),
  };

  const topic = process.env.KAFKA_REQUEST_TOPIC || 'portfolio-analysis-requests';

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: portfolioId.toString(),
          value: JSON.stringify(message),
          headers: {
            'correlation-id': message.messageId,
            'source': 'backend-service',
          },
        },
      ],
    });

    logger.info('Analysis request sent to Kafka', {
      messageId: message.messageId,
      portfolioId,
      topic,
    });

    return message.messageId;
  } catch (error) {
    logger.error('Failed to send analysis request:', error);
    throw error;
  }
};

module.exports = {
  sendAnalysisRequest,
};
