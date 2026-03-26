// ========================================
// Analysis Routes
// ========================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  requestAnalysis,
  getAnalysis,
  requestBatchAnalysis,
  getKafkaStatus,
} = require('../controllers/analysisController');

// ----------------------------------------
// Analysis Endpoints
// ----------------------------------------

// Get Kafka status (admin use)
router.get('/status', protect, getKafkaStatus);

// Get analysis results for a portfolio
router.get('/portfolio/:portfolioId', protect, getAnalysis);

// Request analysis for a single portfolio
router.post('/portfolio/:portfolioId', protect, requestAnalysis);

// Request batch analysis for multiple portfolios
router.post('/batch', protect, requestBatchAnalysis);

module.exports = router;
