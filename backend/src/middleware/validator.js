const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

/**
 * User registration validation
 */
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must be less than 100 characters'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters')
    .matches(/^[a-zA-Z\s-]+$/)
    .withMessage('First name can only contain letters, spaces, and hyphens'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters')
    .matches(/^[a-zA-Z\s-]+$/)
    .withMessage('Last name can only contain letters, spaces, and hyphens'),
  
  handleValidationErrors,
];

/**
 * User login validation
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors,
];

/**
 * Portfolio creation validation
 */
const validateCreatePortfolio = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Portfolio name is required and must be less than 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('type')
    .optional()
    .isIn(['retirement', 'growth', 'income', 'trading', 'other'])
    .withMessage('Invalid portfolio type'),
  
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  
  handleValidationErrors,
];

/**
 * Portfolio update validation
 */
const validateUpdatePortfolio = [
  param('id')
    .isMongoId()
    .withMessage('Invalid portfolio ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Portfolio name must be less than 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  handleValidationErrors,
];

/**
 * Holdings import validation
 */
const validateImportHoldings = [
  param('id')
    .isMongoId()
    .withMessage('Invalid portfolio ID'),
  
  body('holdings')
    .isArray({ min: 1, max: 100 })
    .withMessage('Holdings must be an array with 1-100 items'),
  
  body('holdings.*.symbol')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Symbol is required and must be less than 20 characters')
    .matches(/^[A-Za-z0-9.-]+$/)
    .withMessage('Symbol can only contain letters, numbers, dots, and hyphens'),
  
  body('holdings.*.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and must be less than 100 characters'),
  
  body('holdings.*.quantity')
    .isFloat({ min: 0.0001 })
    .withMessage('Quantity must be a positive number'),
  
  body('holdings.*.averageCost')
    .isFloat({ min: 0 })
    .withMessage('Average cost must be a non-negative number'),
  
  body('holdings.*.sector')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Sector must be less than 50 characters'),
  
  body('holdings.*.assetType')
    .optional()
    .isIn(['stock', 'mutual_fund', 'etf', 'bond', 'crypto', 'other'])
    .withMessage('Invalid asset type'),
  
  handleValidationErrors,
];

/**
 * Analysis request validation
 */
const validateAnalysisRequest = [
  param('id')
    .isMongoId()
    .withMessage('Invalid portfolio ID'),
  
  handleValidationErrors,
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  handleValidationErrors,
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z_]+$/)
    .withMessage('Invalid sort field'),
  
  handleValidationErrors,
];

/**
 * Sanitize input - remove dangerous characters
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potential MongoDB operators
      return obj.replace(/[${}]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip keys starting with $ (MongoDB operators)
        if (!key.startsWith('$')) {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
};

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateCreatePortfolio,
  validateUpdatePortfolio,
  validateImportHoldings,
  validateAnalysisRequest,
  validateObjectId,
  validatePagination,
  sanitizeInput,
};
