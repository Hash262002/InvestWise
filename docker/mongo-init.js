// ========================================
// MongoDB Initialization Script
// ========================================
// This script runs when MongoDB container starts for the first time
// It creates the database, collections, and indexes
// ========================================

// Switch to investwise database
db = db.getSiblingDB('investwise');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'User email - required and must be unique'
        },
        password: {
          bsonType: 'string',
          description: 'Hashed password - required'
        },
        firstName: {
          bsonType: 'string',
          description: 'First name - required'
        },
        lastName: {
          bsonType: 'string',
          description: 'Last name - required'
        }
      }
    }
  }
});

db.createCollection('portfolios');
db.createCollection('holdings');
db.createCollection('alerts');

// Create indexes for better query performance
print('Creating indexes...');

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ 'security.lockUntil': 1 });
db.users.createIndex({ createdAt: -1 });

// Portfolios indexes
db.portfolios.createIndex({ user: 1, name: 1 });
db.portfolios.createIndex({ user: 1, isActive: 1 });
db.portfolios.createIndex({ 'analysis.lastAnalyzedAt': 1 });

// Holdings indexes
db.holdings.createIndex({ portfolio: 1, symbol: 1 }, { unique: true });
db.holdings.createIndex({ user: 1, symbol: 1 });
db.holdings.createIndex({ portfolio: 1, sector: 1 });
db.holdings.createIndex({ symbol: 1, 'marketData.lastUpdatedAt': 1 });

// Alerts indexes
db.alerts.createIndex({ 'asset.symbol': 1, status: 1 });
db.alerts.createIndex({ user: 1, status: 1 });
db.alerts.createIndex({ expiresAt: 1, status: 1 });
db.alerts.createIndex({ status: 1, lastTriggeredAt: 1 });

print('MongoDB initialization complete!');
print('Database: investwise');
print('Collections: users, portfolios, holdings, alerts');
