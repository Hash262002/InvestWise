const Portfolio = require('../models/Portfolio');
const logger = require('../utils/logger');

// Batch buffer for accumulating results
let batchBuffer = [];
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 50;
const BATCH_TIMEOUT_MS = parseInt(process.env.BATCH_TIMEOUT_MS) || 5000;
let batchTimer = null;

/**
 * Start the batch consumer for analysis results
 */
const startBatchConsumer = async (consumer) => {
  // Start batch processing timer
  batchTimer = setInterval(async () => {
    if (batchBuffer.length > 0) {
      await processBatch();
    }
  }, BATCH_TIMEOUT_MS);

  // Run consumer
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const result = JSON.parse(message.value.toString());
        
        logger.info('Received analysis result', {
          portfolioId: result.portfolioId,
          status: result.status,
          partition,
          offset: message.offset,
        });

        // Add to batch buffer
        batchBuffer.push(result);

        // Process batch if buffer is full
        if (batchBuffer.length >= BATCH_SIZE) {
          await processBatch();
        }
      } catch (error) {
        logger.error('Error processing Kafka message:', {
          error: error.message,
          partition,
          offset: message.offset,
        });
      }
    },
  });

  logger.info('Batch consumer started', {
    batchSize: BATCH_SIZE,
    batchTimeout: BATCH_TIMEOUT_MS,
  });
};

/**
 * Process accumulated batch of results
 */
const processBatch = async () => {
  if (batchBuffer.length === 0) return;

  // Take all buffered messages
  const batch = [...batchBuffer];
  batchBuffer = []; // Clear buffer immediately

  logger.info(`Processing batch of ${batch.length} analysis results`);

  try {
    // Separate completed and failed results
    const completed = batch.filter(r => r.status === 'completed');
    const failed = batch.filter(r => r.status === 'failed');

    // Build bulk operations for successful analyses
    if (completed.length > 0) {
      const bulkOps = completed.map(result => ({
        updateOne: {
          filter: { _id: result.portfolioId },
          update: {
            $set: {
              // Store complete analysis
              'analytics.lastAnalysis': {
                summary: result.analysis?.summary || '',
                metrics: result.analysis?.metrics || {},
                riskAssessment: result.analysis?.riskAssessment || {},
                recommendations: result.analysis?.recommendations || [],
              },
              'analytics.lastAnalyzedAt': new Date(result.completedAt),
              'analytics.processingTime': result.processingTime,
              'analytics.analysisStatus': 'completed',
              'analytics.analysisRequestId': result.messageId,
              
              // Update portfolio-level metrics from analysis
              ...(result.analysis?.riskAssessment?.diversificationScore && {
                'analytics.lastAnalysis.riskAssessment.diversificationScore': 
                  result.analysis.riskAssessment.diversificationScore,
              }),
            },
          },
        },
      }));

      // Execute bulk write
      const bulkResult = await Portfolio.bulkWrite(bulkOps, { ordered: false });
      
      logger.info('Bulk update completed', {
        matched: bulkResult.matchedCount,
        modified: bulkResult.modifiedCount,
        batchSize: completed.length,
      });

      // Update individual holdings with analysis results
      for (const result of completed) {
        if (result.analysis?.holdings && result.analysis.holdings.length > 0) {
          await updateHoldingsAnalysis(result.portfolioId, result.analysis.holdings);
        }
      }
    }

    // Handle failed analyses
    if (failed.length > 0) {
      const failedOps = failed.map(result => ({
        updateOne: {
          filter: { _id: result.portfolioId },
          update: {
            $set: {
              'analytics.analysisStatus': 'failed',
              'analytics.lastError': result.error || 'Unknown error',
              'analytics.lastAnalyzedAt': new Date(),
            },
          },
        },
      }));

      await Portfolio.bulkWrite(failedOps, { ordered: false });

      logger.warn(`${failed.length} analyses failed`, {
        portfolioIds: failed.map(f => f.portfolioId),
      });
    }

  } catch (error) {
    logger.error('Batch processing error:', {
      error: error.message,
      batchSize: batch.length,
    });
    
    // On error, push failed items back to buffer for retry (limited)
    // Only retry once by checking if already retried
    const retryItems = batch.filter(r => !r._retried).map(r => ({ ...r, _retried: true }));
    if (retryItems.length > 0 && batchBuffer.length < BATCH_SIZE * 2) {
      batchBuffer.push(...retryItems);
      logger.info(`Queued ${retryItems.length} items for retry`);
    }
  }
};

/**
 * Update holdings with individual analysis results
 */
const updateHoldingsAnalysis = async (portfolioId, holdingsAnalysis) => {
  try {
    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) return;

    for (const holdingAnalysis of holdingsAnalysis) {
      const holdingIndex = portfolio.holdings.findIndex(
        h => h.symbol === holdingAnalysis.symbol && h.isActive
      );

      if (holdingIndex >= 0) {
        portfolio.holdings[holdingIndex].analysis = {
          sentiment: holdingAnalysis.sentiment || null,
          recommendation: holdingAnalysis.recommendation || null,
          summary: holdingAnalysis.analysis || '',
          analyzedAt: new Date(),
        };
      }
    }

    await portfolio.save();
  } catch (error) {
    logger.error('Failed to update holdings analysis:', {
      portfolioId,
      error: error.message,
    });
  }
};

/**
 * Stop the batch consumer
 */
const stopBatchConsumer = async () => {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }

  // Process any remaining items
  if (batchBuffer.length > 0) {
    logger.info(`Processing remaining ${batchBuffer.length} items before shutdown`);
    await processBatch();
  }
};

/**
 * Get current batch buffer size (for monitoring)
 */
const getBatchBufferSize = () => batchBuffer.length;

module.exports = {
  startBatchConsumer,
  processBatch,
  stopBatchConsumer,
  getBatchBufferSize,
};
