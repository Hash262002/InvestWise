// ========================================
// Models Index
// ========================================
// Central export point for all Mongoose models
// Import from here: const { User, Portfolio } = require('./models');
// ========================================

const User = require('./User');
const Portfolio = require('./Portfolio');
const Holding = require('./Holding');
const Alert = require('./Alert');

module.exports = {
  User,
  Portfolio,
  Holding,
  Alert,
};
