import { Router } from 'express';
import contactController from '../controllers/contact.controller.js';
import { validate, contactValidationRules } from '../middleware/validation.middleware.js';
import { contactLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

/**
 * @route   POST /api/contact
 * @desc    Submit public contact message
 * @access  Public (Rate limited)
 */
router.post(
  '/',
  contactLimiter,
  contactValidationRules,
  validate,
  contactController.submitContact
);

export default router;

