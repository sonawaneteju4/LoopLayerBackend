import { Router } from 'express';
import quoteController from '../controllers/quote.controller.js';
import { uploadQuoteFiles } from '../middleware/upload.middleware.js';
import { validate, quoteValidationRules } from '../middleware/validation.middleware.js';
import { quoteLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

/**
 * @route   POST /api/quote
 * @desc    Public quote request submission with file uploads
 * @access  Public (Rate limited)
 */
router.post(
  '/',
  quoteLimiter,
  uploadQuoteFiles,
  quoteValidationRules,
  validate,
  quoteController.submitQuote
);

export default router;

