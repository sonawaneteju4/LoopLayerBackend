import env from '../config/env.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/response.js';

/**
 * 404 Not Found Middleware for unmatched routes
 */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralized Application Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert generic Error to ApiError if not already an instance
  if (!(error instanceof ApiError)) {
    // MongoDB / Mongoose Cast Error (e.g., invalid ObjectId)
    if (error.name === 'CastError') {
      const message = `Invalid value '${error.value}' for field '${error.path}'`;
      error = ApiError.badRequest(message);
    }
    // Mongoose Validation Error
    else if (error.name === 'ValidationError') {
      const fieldErrors = Object.values(error.errors || {}).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      error = ApiError.unprocessable('Validation failed', fieldErrors);
    }
    // MongoDB Duplicate Key Error (E11000)
    else if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue || {})[0] || 'field';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateField] : '';
      const message = `Duplicate value '${duplicateValue}' for field '${duplicateField}'. Must be unique.`;
      error = ApiError.conflict(message);
    }
    // Multer Upload Errors
    else if (error.name === 'MulterError') {
      let message = 'File upload error';
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = `File size exceeds the allowable limit of ${env.UPLOAD.MAX_FILE_SIZE_MB}MB`;
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        message = `Maximum number of allowed files is ${env.UPLOAD.MAX_FILE_COUNT}`;
      } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        message = `Unexpected upload field: '${error.field}'`;
      }
      error = ApiError.badRequest(message);
    }
    // JWT Authentication Errors
    else if (error.name === 'JsonWebTokenError') {
      error = new ApiError(401, 'Invalid authentication token');
    } else if (error.name === 'TokenExpiredError') {
      error = new ApiError(401, 'Authentication token has expired. Please log in again.');
    }
    // Body-parser invalid JSON syntax
    else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      error = ApiError.badRequest('Malformed JSON in request body');
    }
    // Fallback unhandled server error
    else {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Internal Server Error';
      error = new ApiError(statusCode, message, [], false, error.stack);
    }
  }

  // Log error with Winston
  const logDetails = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
  };

  if (error.statusCode >= 500) {
    logger.error(`[SERVER ERROR] ${req.method} ${req.originalUrl} - ${error.message}`, {
      ...logDetails,
      stack: error.stack,
    });
  } else {
    logger.warn(`[CLIENT ERROR] ${req.method} ${req.originalUrl} - ${error.message}`, logDetails);
  }

  // Response payload adhering to strict format:
  // { success: false, message: "...", errors: [] }
  const responsePayload = {
    success: false,
    message: error.message,
    errors: error.errors && error.errors.length > 0 ? error.errors : [],
  };

  // Include stack trace only in development
  if (env.NODE_ENV === 'development' && error.statusCode >= 500) {
    responsePayload.stack = error.stack;
  }

  return res.status(error.statusCode || 500).json(responsePayload);
};

export default {
  notFoundHandler,
  errorHandler,
};

