const Portfolio = require('../models/Portfolio');
const { sendAnalysisRequest } = require('../services/kafkaProducer');
const logger = require('../utils/logger');

/**
 * Trigger portfolio analysis
 * POST /api/analysis/:id
 */
const triggerAnalysis = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.userId,
      isActive: true,
    });

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    // Check if portfolio has holdings
    const activeHoldings = portfolio.holdings.filter(h => h.isActive);
    if (activeHoldings.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Portfolio has no holdings to analyze',
      });
    }

    // Check if analysis is already in progress
    if (portfolio.analytics.analysisStatus === 'processing') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Analysis is already in progress for this portfolio',
        requestId: portfolio.analytics.analysisRequestId,
      });
    }

    // Send analysis request to Kafka
    const requestId = await sendAnalysisRequest(
      portfolio._id,
      req.userId,
      portfolio
    );

    // Update portfolio status
    portfolio.analytics.analysisStatus = 'processing';
    portfolio.analytics.analysisRequestId = requestId;
    await portfolio.save();

    logger.info('Analysis triggered', {
      userId: req.userId,
      portfolioId: portfolio._id,
      requestId,
      holdingsCount: activeHoldings.length,
    });

    res.status(202).json({
      message: 'Analysis request submitted',
      requestId,
      portfolioId: portfolio._id,
      status: 'processing',
      holdingsCount: activeHoldings.length,
    });
  } catch (error) {
    logger.error('Trigger analysis error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to trigger analysis',
    });
  }
};

/**
 * Get analysis status
 * GET /api/analysis/:id/status
 */
const getAnalysisStatus = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.userId,
      isActive: true,
    }).select('analytics');

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    res.json({
      status: portfolio.analytics.analysisStatus || 'not_started',
      requestId: portfolio.analytics.analysisRequestId,
      lastAnalyzedAt: portfolio.analytics.lastAnalyzedAt,
      processingTime: portfolio.analytics.processingTime,
    });
  } catch (error) {
    logger.error('Get analysis status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get analysis status',
    });
  }
};

/**
 * Get analysis results
 * GET /api/analysis/:id/results
 */
const getAnalysisResults = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.userId,
      isActive: true,
    });

    if (!portfolio) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Portfolio not found',
      });
    }

    if (!portfolio.analytics.lastAnalysis) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No analysis results available. Please trigger an analysis first.',
      });
    }

    // Get holdings with their individual analysis
    const holdingsWithAnalysis = portfolio.holdings
      .filter(h => h.isActive)
      .map(h => ({
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity,
        currentValue: h.currentValue,
        analysis: h.analysis,
      }));

    res.json({
      portfolioId: portfolio._id,
      portfolioName: portfolio.name,
      analyzedAt: portfolio.analytics.lastAnalyzedAt,
      processingTime: portfolio.analytics.processingTime,
      analysis: portfolio.analytics.lastAnalysis,
      holdings: holdingsWithAnalysis,
    });
  } catch (error) {
    logger.error('Get analysis results error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get analysis results',
    });
  }
};

module.exports = {
  triggerAnalysis,
  getAnalysisStatus,
  getAnalysisResults,
};
