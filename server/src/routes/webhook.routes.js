import { Router } from 'express';
import webhookController from '../controllers/webhook.controller.js';
import { webhookLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// Apply rate limiter to inbound webhooks
router.use(webhookLimiter);

/**
 * @route   POST /api/inbound-email & /api/webhooks/resend/inbound
 * @desc    Resend Inbound Email Webhook endpoint
 * @access  Public (Authenticated via Svix Signature / Header)
 */
router.post('/', webhookController.handleResendInbound);
router.post('/inbound-email', webhookController.handleResendInbound);
router.post('/resend/inbound', webhookController.handleResendInbound);
router.post('/inbound', webhookController.handleResendInbound);

export default router;

