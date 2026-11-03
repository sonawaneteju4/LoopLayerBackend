import { Router } from 'express';
import emailController from '../controllers/email.controller.js';
import authenticateAdmin from '../middleware/auth.middleware.js';
import {
  validate,
  composeEmailValidationRules,
  previewEmailValidationRules,
} from '../middleware/validation.middleware.js';

const router = Router();

// Protect all email management routes with admin JWT authentication
router.use(authenticateAdmin);

/**
 * @route   GET /api/admin/emails/settings/smtp-status
 * @desc    SMTP connectivity status and health metrics
 */
router.get('/settings/smtp-status', emailController.getSMTPStatus);

/**
 * @route   POST /api/admin/emails/settings/smtp-test
 * @desc    Trigger active live SMTP connection verification
 */
router.post('/settings/smtp-test', emailController.testSMTPConnection);

/**
 * @route   GET /api/admin/emails
 * @desc    Paginated email delivery logs and audit history with search/filter
 */
router.get('/', emailController.getEmailLogs);

/**
 * @route   GET /api/admin/emails/:id
 * @desc    Retrieve full email log details including rendered HTML
 */
router.get('/:id', emailController.getEmailLogDetails);

/**
 * @route   POST /api/admin/emails/:id/retry
 * @desc    Manually retry dispatching a previously failed email
 */
router.post('/:id/retry', emailController.retryEmailDelivery);

/**
 * @route   POST /api/admin/emails/preview
 * @desc    Generate a real-time live HTML preview of any email template
 */
router.post('/preview', previewEmailValidationRules, validate, emailController.previewEmailTemplate);

/**
 * @route   POST /api/admin/emails/send
 * @desc    Dashboard Email Composer - Compose and send direct branded email
 */
router.post('/send', composeEmailValidationRules, validate, emailController.composeAndSendEmail);

export default router;

