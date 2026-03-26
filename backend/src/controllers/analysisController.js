// ========================================
// Analysis Controller
// ========================================
// Handles portfolio analysis requests

const Portfolio = require('../models/Portfolio');
const kafkaProducer = require('../services/kafkaProducer');

// ----------------------------------------
// Request Portfolio Analysis
// ----------------------------------------

/**
 * POST /api/analysis/portfolio/:portfolioId
 * Trigger AI analysis for a portfolio
 */
const requestAnalysis = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { requestType = 'quick' } = req.body || {};
    const userId = req.user.userId;

    // Validate request type
    const validTypes = ['quick', 'full', 'rebalance'];
    if (!validTypes.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid request type. Valid types: ${validTypes.join(', ')}`,
      });
    }

    // Find the portfolio and verify ownership
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      user: userId,
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found',
      });
    }

    // Check if portfolio has holdings
    if (!portfolio.holdings || portfolio.holdings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio has no holdings to analyze',
      });
    }

    // Prepare holdings data for analysis
    const holdingsData = portfolio.holdings.map(h => ({
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity,
      averageCost: h.averageCost,
      sector: h.sector,
      assetType: h.assetType,
    }));

    // Send analysis request to Kafka
    const result = await kafkaProducer.sendAnalysisRequest({
      portfolioId: portfolio._id.toString(),
      userId,
      holdings: holdingsData,
      requestType,
    });

    res.status(202).json({
      success: true,
      message: 'Analysis request submitted',
      data: {
        portfolioId,
        requestType,
        status: 'pending',
        kafka: {
          partition: result.partition,
          offset: result.offset,
        },
      },
    });
  } catch (error) {
    console.error('Error requesting analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit analysis request',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Get Analysis Status
// ----------------------------------------

/**
 * GET /api/analysis/portfolio/:portfolioId
 * Get current analysis results for a portfolio
 */
const getAnalysis = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.user.userId;

    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      user: userId,
    }).select('analysis name');

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found',
      });
    }

    res.json({
      success: true,
      data: {
        portfolioId,
        portfolioName: portfolio.name,
        analysis: portfolio.analysis,
        hasAnalysis: !!portfolio.analysis?.lastAnalyzedAt,
      },
    });
  } catch (error) {
    console.error('Error getting analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analysis',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Request Batch Analysis
// ----------------------------------------

/**
 * POST /api/analysis/batch
 * Trigger analysis for multiple portfolios
 */
const requestBatchAnalysis = async (req, res) => {
  try {
    const { portfolioIds, requestType = 'quick' } = req.body;
    const userId = req.user.userId;

    if (!portfolioIds || !Array.isArray(portfolioIds) || portfolioIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'portfolioIds array is required',
      });
    }

    // Limit batch size
    if (portfolioIds.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 portfolios per batch request',
      });
    }

    // Find all portfolios
    const portfolios = await Portfolio.find({
      _id: { $in: portfolioIds },
      user: userId,
    });

    if (portfolios.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No portfolios found',
      });
    }

    // Prepare requests
    const requests = portfolios
      .filter(p => p.holdings && p.holdings.length > 0)
      .map(p => ({
        portfolioId: p._id.toString(),
        userId,
        holdings: p.holdings.map(h => ({
          symbol: h.symbol,
          name: h.name,
          quantity: h.quantity,
          averageCost: h.averageCost,
          sector: h.sector,
          assetType: h.assetType,
        })),
        requestType,
      }));

    if (requests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No portfolios with holdings to analyze',
      });
    }

    // Send batch request
    const result = await kafkaProducer.sendBatchAnalysisRequests(requests);

    res.status(202).json({
      success: true,
      message: `Batch analysis request submitted for ${requests.length} portfolios`,
      data: {
        submitted: requests.length,
        skipped: portfolios.length - requests.length,
        requestType,
      },
    });
  } catch (error) {
    console.error('Error requesting batch analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit batch analysis request',
      error: error.message,
    });
  }
};

// ----------------------------------------
// Get Kafka Status
// ----------------------------------------

/**
 * GET /api/analysis/status
 * Get Kafka producer/consumer status
 */
const getKafkaStatus = async (req, res) => {
  const kafkaConsumer = require('../services/kafkaConsumer');
  
  res.json({
    success: true,
    data: {
      producer: {
        healthy: kafkaProducer.isHealthy(),
      },
      consumer: kafkaConsumer.getStatus(),
    },
  });
};

module.exports = {
  requestAnalysis,
  getAnalysis,
  requestBatchAnalysis,
  getKafkaStatus,
};
