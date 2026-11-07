import inboundEmailService from '../services/inboundEmail.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Resend Inbound Email Webhook Receiver
 * Endpoint: POST /api/webhooks/resend/inbound
 */
export const handleResendInbound = async (req, res, next) => {
  try {
    // 1. Signature Verification (Svix headers)
    const verification = inboundEmailService.verifyWebhookSignature({
      headers: req.headers,
      rawBody: req.body,
    });

    if (!verification.valid) {
      logger.warn(`[Webhook:Resend] Rejected unauthorized webhook: ${verification.error}`);
      return sendError(res, 401, 'Unauthorized webhook signature', [verification.error]);
    }

    // 2. Process and ingest the inbound email
    const result = await inboundEmailService.processInboundWebhook(req.body, req.headers);

    return sendSuccess(res, 200, result.message, {
      duplicate: result.duplicate,
      emailId: result.emailId,
    });
  } catch (error) {
    logger.error(`[Webhook:Resend] Error processing webhook: ${error.message}`);
    next(error);
  }
};

export default {
  handleResendInbound,
};
