// ========================================
// Holding Routes
// ========================================
// Routes for holding management:
// - PUT /api/holdings/:id - Update holding
// - DELETE /api/holdings/:id - Delete holding
// ========================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const holdingController = require('../controllers/holdingController');

// Apply auth middleware to all routes
router.use(protect);

// ----------------------------------------
// Holding Routes
// ----------------------------------------

// PUT update holding
router.put('/:id', holdingController.updateHolding);

// DELETE holding
router.delete('/:id', holdingController.deleteHolding);

// ========================================
// Exports
// ========================================

module.exports = router;
