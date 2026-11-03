import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

/**
 * Establishes connection to MongoDB Atlas with production connection pooling & resilient event listeners.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: env.NODE_ENV !== 'production', // Don't auto-build indexes in production
    });

    logger.info(`[Database] MongoDB Atlas Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`[Database] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('[Database] Connection disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('[Database] Connection re-established successfully');
    });

    return conn;
  } catch (error) {
    logger.error(`[Database] Connection failed: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Cleanly closes MongoDB connection during graceful shutdown
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('[Database] MongoDB connection closed gracefully');
  } catch (error) {
    logger.error(`[Database] Error during disconnect: ${error.message}`);
  }
};

export default connectDB;

