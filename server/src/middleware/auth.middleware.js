import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import Admin from '../models/Admin.js';
import { ApiError } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Protects admin routes by verifying Bearer JWT access tokens.
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      throw ApiError.unauthorized('Authentication token missing or invalid format (Bearer token or ?token= required)');
    }

    // Verify token signature and expiration
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Verify admin still exists in database
    const admin = await Admin.findById(decoded.id).select('-password').lean();

    if (!admin) {
      logger.warn(`[AUTH] Token presented for non-existent admin ID: ${decoded.id}`);
      throw ApiError.unauthorized('Admin account associated with this token no longer exists');
    }

    // Attach admin context to request
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(error);
    }
    next(error);
  }
};

export default authenticateAdmin;

