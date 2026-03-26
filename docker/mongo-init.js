// MongoDB Initialization Script
// This script runs when the MongoDB container starts for the first time

// Switch to admin database to authenticate
db = db.getSiblingDB('admin');

// Create application database
db = db.getSiblingDB('investwise');

// Create application user with read/write permissions
db.createUser({
  user: 'investwise_app',
  pwd: 'investwise_secret_123',
  roles: [
    {
      role: 'readWrite',
      db: 'investwise',
    },
  ],
});

print('Created investwise_app user');

// Create collections with schema validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'Must be a valid email address',
        },
        password: {
          bsonType: 'string',
          minLength: 60,
          description: 'Hashed password (bcrypt)',
        },
        firstName: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 50,
        },
        lastName: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 50,
        },
        isActive: {
          bsonType: 'bool',
        },
        isEmailVerified: {
          bsonType: 'bool',
        },
      },
    },
  },
});

print('Created users collection');

db.createCollection('portfolios', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user', 'name'],
      properties: {
        user: {
          bsonType: 'objectId',
          description: 'Reference to user',
        },
        name: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100,
        },
        totalInvested: {
          bsonType: 'number',
          minimum: 0,
        },
        currentValue: {
          bsonType: 'number',
          minimum: 0,
        },
        currency: {
          bsonType: 'string',
          enum: ['INR', 'USD', 'EUR', 'GBP'],
        },
      },
    },
  },
});

print('Created portfolios collection');

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

db.portfolios.createIndex({ user: 1 });
db.portfolios.createIndex({ user: 1, name: 1 });
db.portfolios.createIndex({ 'holdings.symbol': 1 });
db.portfolios.createIndex({ createdAt: 1 });

print('Created indexes');

print('MongoDB initialization completed successfully!');
