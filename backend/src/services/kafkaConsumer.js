const Portfolio = require('../models/Portfolio');
const logger = require('../utils/logger');

// Batch buffer for accumulating results
let batchBuffer = [];
const BATCH_SIZE = Number.parseInt(process.env.BATCH_SIZE) || 50;
const BATCH_TIMEOUT_MS = Number.parseInt(process.env.BATCH_TIMEOUT_MS) || 5000;
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
        
        logger.info('Received analysis result from Kafka', {
          portfolioId: result.portfolioId || result.portfolio_id,
          status: result.status,
          messageId: result.messageId || result.message_id,
          partition,
          offset: message.offset,
          messageKeys: Object.keys(result),
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
          messageValue: message.value.toString().substring(0, 200),
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
 * Extract field values handling both camelCase and snake_case from Pydantic
 */
const extractResultFields = (result) => ({
  portfolioId: result.portfolioId || result.portfolio_id,
  messageId: result.messageId || result.message_id,
  completedAt: result.completedAt || result.completed_at,
  processingTime: result.processingTime || result.processing_time,
  analysis: result.analysis || {},
});

/**
 * Build bulk operations for successful analyses
 */
const buildCompletedBulkOps = (completed) => {
  return completed.map(result => {
    const { portfolioId, messageId, completedAt, processingTime, analysis } = 
      extractResultFields(result);
    
    return {
      updateOne: {
        filter: { _id: portfolioId },
        update: {
          $set: {
            'analytics.lastAnalysis': {
              summary: analysis.summary || '',
              metrics: analysis.metrics || {},
              riskAssessment: analysis.riskAssessment || {},
              overallSentiment: analysis.overallSentiment || 'neutral',
              overallRecommendation: analysis.overallRecommendation || 'hold',
              recommendations: analysis.recommendations || [],
            },
            'analytics.lastAnalyzedAt': new Date(completedAt),
            'analytics.processingTime': processingTime,
            'analytics.analysisStatus': 'completed',
            'analytics.analysisRequestId': messageId,
          },
        },
      },
    };
  });
};

/**
 * Execute bulk write for completed analyses
 */
const executeBulkWrite = async (bulkOps) => {
  const bulkResult = await Portfolio.bulkWrite(bulkOps, { ordered: false });
  
  logger.info('Bulk update completed', {
    matched: bulkResult.matchedCount,
    modified: bulkResult.modifiedCount,
    batchSize: bulkOps.length,
  });
  
  return bulkResult;
};

/**
 * Update holdings analysis for completed results
 */
const updateCompletedHoldingsAnalysis = async (completed) => {
  for (const result of completed) {
    const { portfolioId, analysis } = extractResultFields(result);
    
    if (analysis.holdings && analysis.holdings.length > 0) {
      await updateHoldingsAnalysis(portfolioId, analysis.holdings);
    }
  }
};

/**
 * Handle failed analyses
 */
const handleFailedAnalyses = async (failed) => {
  if (failed.length === 0) return;
  
  const failedOps = failed.map(result => {
    const { portfolioId } = extractResultFields(result);
    const error = result.error || 'Unknown error';
    
    return {
      updateOne: {
        filter: { _id: portfolioId },
        update: {
          $set: {
            'analytics.analysisStatus': 'failed',
            'analytics.lastError': error,
            'analytics.lastAnalyzedAt': new Date(),
          },
        },
      },
    };
  });

  await Portfolio.bulkWrite(failedOps, { ordered: false });

  logger.warn(`${failed.length} analyses failed`, {
    portfolioIds: failed.map(f => extractResultFields(f).portfolioId),
  });
};

/**
 * Reset processing status for failed items
 */
const resetProcessingStatus = async (batch, errorMessage) => {
  const failedPortfolioIds = batch
    .map(r => extractResultFields(r).portfolioId)
    .filter(Boolean);
  
  if (failedPortfolioIds.length === 0) return;

  const resetResult = await Portfolio.updateMany(
    { 
      _id: { $in: failedPortfolioIds },
      'analytics.analysisStatus': 'processing'
    },
    {
      $set: {
        'analytics.analysisStatus': 'failed',
        'analytics.lastError': errorMessage,
      },
    }
  );
  
  logger.warn('Reset processing status for portfolios with errors', {
    modified: resetResult.modifiedCount,
    portfolioIds: failedPortfolioIds,
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

    // Process successful analyses
    if (completed.length > 0) {
      try {
        const bulkOps = buildCompletedBulkOps(completed);
        await executeBulkWrite(bulkOps);
        await updateCompletedHoldingsAnalysis(completed);
      } catch (bulkError) {
        logger.error('Bulk write error:', {
          error: bulkError.message,
          batchSize: completed.length,
          details: bulkError.writeErrors || [],
        });
        throw bulkError;
      }
    }

    // Process failed analyses
    await handleFailedAnalyses(failed);

  } catch (error) {
    logger.error('Batch processing error:', {
      error: error.message,
      stack: error.stack,
      batchSize: batch.length,
    });
    
    // Attempt to reset processing status for failed items
    try {
      await resetProcessingStatus(batch, error.message);
    } catch (resetError) {
      logger.error('Failed to reset processing status:', {
        error: resetError.message,
      });
    }
    
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
