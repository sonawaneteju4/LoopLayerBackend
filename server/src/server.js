import app from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { verifyMailConnection } from './config/mail.js';
import logger, { logServerEvent } from './utils/logger.js';

let server;

/**
 * Bootstrap and initialize all services
 */
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Check SMTP transport in background
    verifyMailConnection().catch((err) => {
      logger.warn(`[Mail] Background SMTP verification encountered an issue: ${err.message}`);
    });

    // 3. Start listening on configured port
    const PORT = env.PORT || 5000;
    server = app.listen(PORT, () => {
      logServerEvent('SERVER_STARTED', {
        port: PORT,
        environment: env.NODE_ENV,
        nodeVersion: process.version,
      });
      logger.info(`=================================================`);
      logger.info(`🚀 LoopLayer Designs API running on port ${PORT}`);
      logger.info(`🌐 Environment: ${env.NODE_ENV}`);
      logger.info(`🔒 Security headers: Helmet enabled, CORS active`);
      logger.info(`=================================================`);
    });
  } catch (error) {
    logger.error(`[Server] Initialization failed: ${error.message}`, {
      stack: error.stack,
    });
    process.exit(1);
  }
};

/**
 * Graceful shutdown sequence
 */
const gracefulShutdown = async (signal) => {
  logger.info(`[Server] Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('[Server] HTTP server stopped accepting connections');
      await disconnectDB();
      logger.info('[Server] Graceful shutdown completed. Exiting process.');
      process.exit(0);
    });

    // Force exit after 10s timeout
    setTimeout(() => {
      logger.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Process-level termination listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Process-level unhandled exception catchers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Process] Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error) => {
  logger.error(`[Process] Uncaught Exception: ${error.message}`, {
    stack: error.stack,
  });
  gracefulShutdown('uncaughtException');
});

startServer();

export default server;

