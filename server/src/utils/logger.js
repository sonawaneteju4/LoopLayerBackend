import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom console formatting for development
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level}: ${stack || message}${metaString}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    process.env.NODE_ENV === 'production' ? json() : combine(colorize(), consoleFormat)
  ),
  defaultMeta: { service: 'looplayer-backend' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
    }),
  ],
});

// Always attach console in non-test environments
if (process.env.NODE_ENV !== 'test') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        colorize(),
        consoleFormat
      ),
    })
  );
}

// Morgan HTTP stream adapter
export const morganStream = {
  write: (message) => {
    logger.info(message.trim(), { context: 'HTTP' });
  },
};

/**
 * Domain-specific audit and diagnostic logging helpers
 */
export const logAuth = (action, username, success, meta = {}) => {
  logger.info(`[AUTH] ${action} - User: ${username} - Success: ${success}`, {
    category: 'AUTH',
    action,
    username,
    success,
    ...meta,
  });
};

export const logUpload = (requestId, fileCount, filesMeta = {}) => {
  logger.info(`[UPLOAD] Request ${requestId} uploaded ${fileCount} file(s)`, {
    category: 'UPLOAD',
    requestId,
    fileCount,
    files: filesMeta,
  });
};

export const logEmailFailure = (recipient, template, error) => {
  logger.error(`[EMAIL FAILURE] Failed to send ${template} to ${recipient}: ${error.message}`, {
    category: 'EMAIL_FAILURE',
    recipient,
    template,
    error: error.message,
    stack: error.stack,
  });
};

export const logServerEvent = (event, details = {}) => {
  logger.info(`[SERVER EVENT] ${event}`, {
    category: 'SERVER_EVENT',
    ...details,
  });
};

export default logger;

