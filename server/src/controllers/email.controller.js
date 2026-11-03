import mailService from '../services/mail.service.js';
import { sendSuccess } from '../utils/response.js';
import { sanitizeRichText } from '../middleware/validation.middleware.js';

/**
 * Controller powering Dashboard Email Infrastructure, Delivery Logs, Composer, and SMTP Health
 */

/**
 * Retrieve paginated email delivery audit logs
 */
export const getEmailLogs = async (req, res, next) => {
  try {
    const result = await mailService.getEmailLogs(req.query);
    return sendSuccess(res, 200, 'Email delivery logs retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single email log record
 */
export const getEmailLogDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await mailService.getEmailLogById(id);
    return sendSuccess(res, 200, 'Email log details retrieved', log);
  } catch (error) {
    next(error);
  }
};

/**
 * Manually retry delivery of a failed email
 */
export const retryEmailDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await mailService.retryEmail(id);
    const message = result.success
      ? 'Email retried and delivered successfully'
      : `Email retry failed: ${result.error}`;
    return sendSuccess(res, 200, message, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Live preview of email templates for the dashboard composer
 */
export const previewEmailTemplate = async (req, res, next) => {
  try {
    const { type, data } = req.body;
    const preview = mailService.previewEmail({
      type: type || 'admin_reply',
      data: data || {},
    });
    return sendSuccess(res, 200, 'Email preview rendered successfully', preview);
  } catch (error) {
    next(error);
  }
};

/**
 * Dashboard Email Composer - Send new email or thread reply to customer
 */
export const composeAndSendEmail = async (req, res, next) => {
  try {
    const {
      to,
      recipientName,
      subject,
      message,
      threadHistory,
      attachments,
      relatedId,
      relatedType,
    } = req.body;

    const cleanMessage = sanitizeRichText(message);
    const sentBy = req.admin ? req.admin.username : 'LoopLayer Designs Team';

    const result = await mailService.sendReplyEmail({
      to,
      recipientName: recipientName || 'Customer',
      subject,
      message: cleanMessage,
      threadHistory: threadHistory || [],
      attachments: attachments || [],
      relatedId: relatedId || null,
      relatedType: relatedType || 'Direct',
      sentBy,
    });

    return sendSuccess(
      res,
      200,
      result.success ? 'Email dispatched successfully' : 'Email recorded but delivery failed',
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * SMTP Diagnostics & Status for Dashboard Settings
 */
export const getSMTPStatus = async (req, res, next) => {
  try {
    const diagnostics = mailService.getSMTPDiagnostics();
    return sendSuccess(res, 200, 'SMTP diagnostics retrieved', diagnostics);
  } catch (error) {
    next(error);
  }
};

/**
 * On-demand SMTP connection verification test
 */
export const testSMTPConnection = async (req, res, next) => {
  try {
    const verification = await mailService.verifySMTPConnection();
    const diagnostics = mailService.getSMTPDiagnostics();
    return sendSuccess(res, 200, `SMTP Verification: ${verification.status}`, {
      ...diagnostics,
      verification,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getEmailLogs,
  getEmailLogDetails,
  retryEmailDelivery,
  previewEmailTemplate,
  composeAndSendEmail,
  getSMTPStatus,
  testSMTPConnection,
};

