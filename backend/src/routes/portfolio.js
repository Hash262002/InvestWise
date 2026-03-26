const express = require('express');
const router = express.Router();
const multer = require('multer');

const portfolioController = require('../controllers/portfolioController');
const { authenticate } = require('../middleware/auth');
const { portfolioCreateLimiter, importLimiter } = require('../middleware/rateLimiter');
const {
  validateCreatePortfolio,
  validateUpdatePortfolio,
  validateImportHoldings,
  validateObjectId,
  validatePagination,
} = require('../middleware/validator');

// Configure multer for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/portfolios
 * @desc    Get all portfolios for current user
 * @access  Private
 */
router.get('/', validatePagination, portfolioController.getPortfolios);

/**
 * @route   GET /api/portfolios/:id
 * @desc    Get single portfolio by ID
 * @access  Private
 */
router.get('/:id', validateObjectId, portfolioController.getPortfolio);

/**
 * @route   POST /api/portfolios
 * @desc    Create a new portfolio
 * @access  Private
 */
router.post('/', portfolioCreateLimiter, validateCreatePortfolio, portfolioController.createPortfolio);

/**
 * @route   PUT /api/portfolios/:id
 * @desc    Update portfolio
 * @access  Private
 */
router.put('/:id', validateUpdatePortfolio, portfolioController.updatePortfolio);

/**
 * @route   DELETE /api/portfolios/:id
 * @desc    Delete portfolio (soft delete)
 * @access  Private
 */
router.delete('/:id', validateObjectId, portfolioController.deletePortfolio);

/**
 * @route   POST /api/portfolios/parse-csv
 * @desc    Parse CSV file and return holdings (without saving)
 * @access  Private
 */
router.post('/parse-csv', importLimiter, upload.single('file'), portfolioController.parseCSV);

/**
 * @route   POST /api/portfolios/:id/import
 * @desc    Import holdings to portfolio
 * @access  Private
 */
router.post('/:id/import', importLimiter, validateImportHoldings, portfolioController.importHoldings);

/**
 * @route   POST /api/portfolios/:id/holdings
 * @desc    Add single holding to portfolio
 * @access  Private
 */
router.post('/:id/holdings', validateObjectId, portfolioController.addHolding);

/**
 * @route   DELETE /api/portfolios/:id/holdings/:holdingId
 * @desc    Remove holding from portfolio
 * @access  Private
 */
router.delete('/:id/holdings/:holdingId', portfolioController.removeHolding);

module.exports = router;
