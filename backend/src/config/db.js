// ========================================
// MongoDB Connection Configuration
// ========================================
// This file handles the connection to MongoDB using Mongoose
// Mongoose is an ODM (Object Document Mapper) that provides:
// - Schema definitions
// - Data validation
// - Query building
// - Middleware hooks
// ========================================

const mongoose = require('mongoose');

/**
 * Connect to MongoDB
 * 
 * This function establishes a connection to the MongoDB database.
 * It uses environment variables for configuration and handles
 * connection errors gracefully.
 * 
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variables
    // Format: mongodb://username:password@host:port/database
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/investwise';

    // Mongoose connection options
    const options = {
      // These options help with connection stability
      // and are recommended for production use
    };

    // Attempt to connect
    const conn = await mongoose.connect(mongoURI, options);

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // Exit process with failure code
    // In production, you might want to retry instead
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 * 
 * Use this for graceful shutdown
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('📦 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
