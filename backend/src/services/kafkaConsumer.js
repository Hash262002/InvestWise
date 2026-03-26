// ========================================
// Kafka Consumer Service
// ========================================
// Consumes analysis results from AI Service using eachBatch mode
// for efficient batch processing and MongoDB bulkWrite

const { kafka, TOPICS, CONSUMER_GROUPS } = require('../config/kafka');
const Portfolio = require('../models/Portfolio');

class KafkaConsumerService {
  constructor() {
    this.consumer = kafka.consumer({
      groupId: CONSUMER_GROUPS.ANALYSIS_RESULTS,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      maxBytesPerPartition: 1048576, // 1MB
    });
    this.isConnected = false;
    this.isRunning = false;
  }

  // ----------------------------------------
  // Connection Management
  // ----------------------------------------

  async connect() {
    if (this.isConnected) return;

    try {
      await this.consumer.connect();
      this.isConnected = true;
      console.log('✅ Kafka Consumer connected');
    } catch (error) {
      console.error('❌ Kafka Consumer connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) return;

    try {
      this.isRunning = false;
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('📥 Kafka Consumer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka Consumer:', error.message);
    }
  }

  // ----------------------------------------
  // Subscribe and Start Consuming
  // ----------------------------------------

  async subscribe() {
    if (!this.isConnected) {
      await this.connect();
    }

    await this.consumer.subscribe({
      topic: TOPICS.ANALYSIS_RESULTS,
      fromBeginning: false,
    });

    console.log(`📥 Subscribed to topic: ${TOPICS.ANALYSIS_RESULTS}`);
  }

  async startConsuming() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🔄 Starting Kafka consumer...');

    await this.consumer.run({
      // Use eachBatch for efficient batch processing
      eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
        console.log(`📦 Received batch: ${batch.messages.length} messages from partition ${batch.partition}`);

        // Collect all analysis results from this batch
        const analysisResults = [];

        for (const message of batch.messages) {
          if (!isRunning() || isStale()) break;

          try {
            const value = JSON.parse(message.value.toString());
            analysisResults.push({
              offset: message.offset,
              ...value,
            });
          } catch (error) {
            console.error(`❌ Failed to parse message at offset ${message.offset}:`, error.message);
          }

          // Resolve offset after processing each message
          resolveOffset(message.offset);

          // Send heartbeat periodically
          await heartbeat();
        }

        // Process batch with bulkWrite for efficiency
        if (analysisResults.length > 0) {
          await this.processBatchResults(analysisResults);
        }
      },
    });
  }

  // ----------------------------------------
  // Batch Processing with bulkWrite
  // ----------------------------------------

  async processBatchResults(results) {
    const bulkOps = [];
    const successfulUpdates = [];
    const failedUpdates = [];

    for (const result of results) {
      try {
        if (result.status === 'completed' && result.analysis) {
          // Build the update operations (may return multiple ops for per-holding updates)
          const updateOps = this.buildUpdateOperation(result);
          if (updateOps && updateOps.length > 0) {
            bulkOps.push(...updateOps);
            successfulUpdates.push(result.portfolioId);
          }
        } else if (result.status === 'failed') {
          console.warn(`⚠️ Analysis failed for portfolio ${result.portfolioId}: ${result.error}`);
          failedUpdates.push(result.portfolioId);
        }
      } catch (error) {
        console.error(`❌ Error processing result for portfolio ${result.portfolioId}:`, error.message);
        failedUpdates.push(result.portfolioId);
      }
    }

    // Execute bulkWrite if there are operations
    if (bulkOps.length > 0) {
      try {
        const bulkResult = await Portfolio.bulkWrite(bulkOps, { ordered: false });
        console.log(`✅ Batch update completed:`, {
          matched: bulkResult.matchedCount,
          modified: bulkResult.modifiedCount,
          portfolioIds: successfulUpdates,
        });
      } catch (error) {
        console.error('❌ Bulk write failed:', error.message);
      }
    }

    if (failedUpdates.length > 0) {
      console.warn(`⚠️ Failed updates: ${failedUpdates.join(', ')}`);
    }
  }

  // ----------------------------------------
  // Build MongoDB Update Operation
  // ----------------------------------------

  buildUpdateOperation(result) {
    const { portfolioId, analysis } = result;

    // Map AI service response to Portfolio schema
    const updateData = {
      'analysis.lastAnalyzedAt': new Date(),
    };

    // Risk score (scale from 0-10 to 0-100)
    if (analysis.riskScore !== undefined) {
      updateData['analysis.riskScore'] = analysis.riskScore * 10;
      updateData['analysis.riskLevel'] = this.getRiskLevel(analysis.riskScore * 10);
    }

    // Diversification score
    if (analysis.diversificationScore !== undefined) {
      updateData['analysis.diversificationScore'] = analysis.diversificationScore * 10;
    }

    // Summary
    if (analysis.summary) {
      updateData['analysis.summary'] = analysis.summary;
    }

    // Sector allocation
    if (analysis.sectorWeights) {
      updateData['analysis.sectorAllocation'] = analysis.sectorWeights;
    }

    // Portfolio-level metrics
    if (analysis.portfolioMetrics) {
      updateData['analysis.portfolioMetrics'] = analysis.portfolioMetrics;
    }

    // Recommendations
    if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
      updateData['analysis.recommendations'] = analysis.recommendations.map(rec => {
        if (typeof rec === 'string') {
          return {
            type: 'review',
            message: rec,
            priority: 'medium',
            createdAt: new Date(),
          };
        }
        return {
          type: rec.type || 'review',
          message: rec.message || rec,
          priority: rec.priority || 'medium',
          createdAt: new Date(),
        };
      });
    }

    // Build the primary portfolio update
    const ops = [{
      updateOne: {
        filter: { _id: portfolioId },
        update: { $set: updateData },
        upsert: false,
      },
    }];

    // Per-holding analysis — update each embedded holding's analysis subdocument
    if (analysis.holdingAnalyses && Array.isArray(analysis.holdingAnalyses)) {
      for (const ha of analysis.holdingAnalyses) {
        ops.push({
          updateOne: {
            filter: {
              _id: portfolioId,
              'holdings.symbol': ha.symbol,
            },
            update: {
              $set: {
                'holdings.$.analysis.riskLevel': ha.riskLevel || 'medium',
                'holdings.$.analysis.recommendation': ha.recommendation || 'hold',
                'holdings.$.analysis.recommendationReason': ha.recommendationReason || '',
                'holdings.$.analysis.portfolioWeightPct': ha.portfolioWeightPct || 0,
                'holdings.$.analysis.concentrationRisk': ha.concentrationRisk || false,
                'holdings.$.analysis.unrealizedPnl': ha.unrealizedPnl || 0,
                'holdings.$.analysis.unrealizedPnlPct': ha.unrealizedPnlPct || 0,
                'holdings.$.analysis.lastAnalyzedAt': new Date(),
              },
            },
          },
        });
      }
    }

    return ops;
  }

  // ----------------------------------------
  // Helper Methods
  // ----------------------------------------

  getRiskLevel(score) {
    if (score <= 33) return 'low';
    if (score <= 66) return 'medium';
    return 'high';
  }

  // ----------------------------------------
  // Health Check
  // ----------------------------------------

  isHealthy() {
    return this.isConnected && this.isRunning;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      running: this.isRunning,
      topic: TOPICS.ANALYSIS_RESULTS,
      consumerGroup: CONSUMER_GROUPS.ANALYSIS_RESULTS,
    };
  }
}

// Singleton instance
const kafkaConsumer = new KafkaConsumerService();

module.exports = kafkaConsumer;
