import { Router } from 'express';
import webhookController from '../controllers/webhook.controller.js';

const router = Router();

/**
 * @route   POST /api/webhooks/resend/inbound
 * @desc    Resend Inbound Email Webhook endpoint
 * @access  Public (Authenticated via Svix Signature / Header)
 */
router.post('/resend/inbound', webhookController.handleResendInbound);
router.post('/inbound', webhookController.handleResendInbound);

export default router;
