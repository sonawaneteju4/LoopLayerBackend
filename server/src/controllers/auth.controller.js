import authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Controller handling Admin authentication operations
 */
export const setupAdmin = async (req, res, next) => {
  try {
    const { username, password, setupSecret } = req.body;
    const admin = await authService.setupAdmin({ username, password, setupSecret });
    return sendSuccess(res, 201, 'Administrator account created successfully', admin);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const authResult = await authService.loginAdmin({ username, password });
    return sendSuccess(res, 200, 'Authentication successful', authResult);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // In JWT stateless architecture, client purges the token
    return sendSuccess(res, 200, 'Logged out successfully. Invalidate session on client.', {
      loggedOut: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Current administrator profile retrieved', req.admin);
  } catch (error) {
    next(error);
  }
};

export default {
  setupAdmin,
  login,
  logout,
  getMe,
};

