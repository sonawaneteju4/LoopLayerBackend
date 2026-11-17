import { Router } from 'express';

const router = Router();

/**
 * Inbound Email Webhook has been retired in favor of Zoho Mail.
 * Respond with 200 OK to immediately stop Svix / Resend retry loops.
 */
const retiredWebhookHandler = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Inbound email webhook has been retired. Incoming emails are managed directly via Zoho Mail.',
  });
};

router.all('/', retiredWebhookHandler);
router.all('/inbound-email', retiredWebhookHandler);
router.all('/resend/inbound', retiredWebhookHandler);
router.all('/inbound', retiredWebhookHandler);

export default router;
