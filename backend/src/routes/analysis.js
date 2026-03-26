const express = require('express');
const router = express.Router();

const analysisController = require('../controllers/analysisController');
const { authenticate } = require('../middleware/auth');
const { analysisLimiter } = require('../middleware/rateLimiter');
const { validateAnalysisRequest } = require('../middleware/validator');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/analysis/:id
 * @desc    Trigger portfolio analysis
 * @access  Private
 */
router.post('/:id', analysisLimiter, validateAnalysisRequest, analysisController.triggerAnalysis);

/**
 * @route   GET /api/analysis/:id/status
 * @desc    Get analysis status
 * @access  Private
 */
router.get('/:id/status', validateAnalysisRequest, analysisController.getAnalysisStatus);

/**
 * @route   GET /api/analysis/:id/results
 * @desc    Get analysis results
 * @access  Private
 */
router.get('/:id/results', validateAnalysisRequest, analysisController.getAnalysisResults);

module.exports = router;
