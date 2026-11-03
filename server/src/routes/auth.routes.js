import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import authenticateAdmin from '../middleware/auth.middleware.js';
import {
  validate,
  loginValidationRules,
  setupAdminValidationRules,
} from '../middleware/validation.middleware.js';
import { authLimiter, setupLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

/**
 * @route   POST /api/auth/setup-admin
 * @desc    Initial secure creation of the sole administrator account
 * @access  Protected by ADMIN_SETUP_SECRET & Single-Admin constraint
 */
router.post(
  '/setup-admin',
  setupLimiter,
  setupAdminValidationRules,
  validate,
  authController.setupAdmin
);

/**
 * @route   POST /api/auth/login
 * @desc    Admin login & JWT issuance
 * @access  Public (Rate limited)
 */
router.post(
  '/login',
  authLimiter,
  loginValidationRules,
  validate,
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Admin session logout / token invalidation
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve authenticated admin profile
 * @access  Private (Admin token required)
 */
router.get('/me', authenticateAdmin, authController.getMe);

export default router;

