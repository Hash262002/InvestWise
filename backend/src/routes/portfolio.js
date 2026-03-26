// ========================================
// Portfolio Routes
// ========================================
// Routes for portfolio management:
// - GET /api/portfolios - Get all user portfolios
// - POST /api/portfolios - Create new portfolio
// - GET /api/portfolios/:id - Get portfolio with holdings
// - PUT /api/portfolios/:id - Update portfolio
// - DELETE /api/portfolios/:id - Delete portfolio
// - POST /api/portfolios/:id/holdings - Add holding to portfolio
// - POST /api/portfolios/:id/holdings/batch - Add multiple holdings (batch import)
// - PUT /api/portfolios/:id/holdings/:holdingId - Update a holding
// - DELETE /api/portfolios/:id/holdings/:holdingId - Delete a holding
// ========================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const portfolioController = require('../controllers/portfolioController');
const holdingController = require('../controllers/holdingController');

// Apply auth middleware to all routes
router.use(protect);

// ----------------------------------------
// Portfolio Routes
// ----------------------------------------

// GET all portfolios for user
router.get('/', portfolioController.getPortfolios);

// POST create new portfolio
router.post('/', portfolioController.createPortfolio);

// GET single portfolio by ID
router.get('/:id', portfolioController.getPortfolioById);

// PUT update portfolio
router.put('/:id', portfolioController.updatePortfolio);

// DELETE portfolio
router.delete('/:id', portfolioController.deletePortfolio);

// ----------------------------------------
// Holding Routes (nested under portfolio)
// ----------------------------------------

// POST add holding to portfolio
router.post('/:id/holdings', holdingController.addHolding);

// POST add multiple holdings to portfolio (batch import)
router.post('/:id/holdings/batch', holdingController.addHoldingsBatch);

// PUT update a holding
router.put('/:id/holdings/:holdingId', holdingController.updateHolding);

// DELETE a holding
router.delete('/:id/holdings/:holdingId', holdingController.deleteHolding);

// ========================================
// Exports
// ========================================

module.exports = router;
