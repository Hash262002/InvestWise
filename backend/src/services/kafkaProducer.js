// ========================================
// Kafka Producer Service
// ========================================
// Produces analysis request messages to Kafka

const { kafka, TOPICS } = require('../config/kafka');

class KafkaProducerService {
  constructor() {
    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });
    this.isConnected = false;
  }

  // ----------------------------------------
  // Connection Management
  // ----------------------------------------

  async connect() {
    if (this.isConnected) return;

    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log('✅ Kafka Producer connected');
    } catch (error) {
      console.error('❌ Kafka Producer connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) return;

    try {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('📤 Kafka Producer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka Producer:', error.message);
    }
  }

  // ----------------------------------------
  // Send Analysis Request
  // ----------------------------------------

  /**
   * Send portfolio analysis request to AI Service
   * 
   * @param {Object} params
   * @param {string} params.portfolioId - Portfolio ID
   * @param {string} params.userId - User ID
   * @param {Array} params.holdings - Array of holdings
   * @param {string} params.requestType - 'quick' | 'full' | 'rebalance'
   * @returns {Promise<Object>} - Send result with partition and offset
   */
  async sendAnalysisRequest({ portfolioId, userId, holdings, requestType = 'quick' }) {
    if (!this.isConnected) {
      await this.connect();
    }

    const message = {
      portfolioId,
      userId,
      holdings,
      requestType,
      timestamp: Date.now(),
    };

    try {
      const result = await this.producer.send({
        topic: TOPICS.ANALYSIS_REQUESTS,
        messages: [
          {
            key: portfolioId, // Use portfolioId as key for partition ordering
            value: JSON.stringify(message),
            headers: {
              'correlation-id': `${portfolioId}-${Date.now()}`,
              'request-type': requestType,
            },
          },
        ],
      });

      console.log(`📤 Analysis request sent for portfolio: ${portfolioId}`, {
        topic: result[0].topicName,
        partition: result[0].partition,
        offset: result[0].baseOffset,
      });

      return {
        success: true,
        topic: result[0].topicName,
        partition: result[0].partition,
        offset: result[0].baseOffset,
        portfolioId,
        requestType,
      };
    } catch (error) {
      console.error(`❌ Failed to send analysis request for portfolio: ${portfolioId}`, error.message);
      throw error;
    }
  }

  // ----------------------------------------
  // Batch Send (for multiple portfolios)
  // ----------------------------------------

  /**
   * Send multiple analysis requests in a batch
   * 
   * @param {Array<Object>} requests - Array of analysis request objects
   * @returns {Promise<Object>} - Batch send result
   */
  async sendBatchAnalysisRequests(requests) {
    if (!this.isConnected) {
      await this.connect();
    }

    const messages = requests.map(req => ({
      key: req.portfolioId,
      value: JSON.stringify({
        portfolioId: req.portfolioId,
        userId: req.userId,
        holdings: req.holdings,
        requestType: req.requestType || 'quick',
        timestamp: Date.now(),
      }),
      headers: {
        'correlation-id': `${req.portfolioId}-${Date.now()}`,
        'request-type': req.requestType || 'quick',
      },
    }));

    try {
      const result = await this.producer.send({
        topic: TOPICS.ANALYSIS_REQUESTS,
        messages,
      });

      console.log(`📤 Batch analysis request sent: ${requests.length} portfolios`);

      return {
        success: true,
        count: requests.length,
        result,
      };
    } catch (error) {
      console.error('❌ Failed to send batch analysis requests:', error.message);
      throw error;
    }
  }

  // ----------------------------------------
  // Health Check
  // ----------------------------------------

  isHealthy() {
    return this.isConnected;
  }
}

// Singleton instance
const kafkaProducer = new KafkaProducerService();

module.exports = kafkaProducer;
