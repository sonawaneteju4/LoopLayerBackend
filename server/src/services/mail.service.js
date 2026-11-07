import mailTransporter, {
  verifyMailConnection,
  getSMTPDiagnostics,
} from '../config/mail.js';
import env from '../config/env.js';
import EmailLog from '../models/EmailLog.js';
import logger, { logEmailFailure } from '../utils/logger.js';
import { ApiError } from '../utils/response.js';

// Import templates
import renderQuoteConfirmation from '../templates/quoteConfirmation.template.js';
import renderQuoteNotification from '../templates/quoteNotification.template.js';
import renderContactConfirmation from '../templates/contactConfirmation.template.js';
import renderContactNotification from '../templates/contactNotification.template.js';
import renderAdminReply from '../templates/reply.template.js';

/**
 * Sanitizes email subjects to prevent header injection attacks (CRLF injection)
 */
const sanitizeHeader = (str = '') => {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n]+/g, ' ').trim();
};

/**
 * Core dispatch function with zero-throw safety, delivery logging, and audit tracking
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} [options.recipientName] - Recipient name
 * @param {string} options.subject - Subject line
 * @param {string} options.html - Rendered HTML
 * @param {string} [options.text] - Plain text version
 * @param {string} options.type - Email type enum for audit log
 * @param {string} [options.relatedId] - Related request ID (e.g. LLD-2026-000001)
 * @param {string} [options.relatedType] - 'Quote' | 'Contact' | 'Direct' | 'System'
 * @param {Array<Object>} [options.attachments] - Nodemailer attachments
 * @param {Object} [options.metadata] - Extra context
 * @returns {Promise<{success: boolean, messageId?: string, emailLogId?: string, error?: string}>}
 */
export const sendMail = async ({
  to,
  recipientName = '',
  subject,
  html,
  text = '',
  type = 'custom',
  relatedId = null,
  relatedType = 'System',
  attachments = [],
  metadata = {},
}) => {
  const cleanSubject = sanitizeHeader(subject);
  const cleanTo = to.toLowerCase().trim();
  const fallbackText = text || html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

  // Create initial pending/in-flight EmailLog record
  let logRecord;
  try {
    logRecord = new EmailLog({
      recipient: cleanTo,
      recipientName: recipientName.trim(),
      subject: cleanSubject,
      type,
      relatedId,
      relatedType,
      htmlContent: html,
      textContent: fallbackText,
      status: 'Failed', // Initial pessimistic state until delivery succeeds
      attachments: attachments.map((a) => ({
        filename: a.filename || 'attachment',
        url: a.path || a.href || '',
        size: a.size || 0,
      })),
      metadata,
    });
    await logRecord.save();
  } catch (dbErr) {
    logger.error(`[Mail] Could not create EmailLog record: ${dbErr.message}`);
  }

  // Handle development mode when SMTP credentials are not yet configured
  if (!env.SMTP.USER && !env.SMTP.PASS && !env.RESEND_API_KEY) {
    logger.warn(`[Mail] Simulated send (missing SMTP credentials) -> To: ${cleanTo} | Subject: "${cleanSubject}"`);
    if (logRecord) {
      logRecord.status = 'Delivered';
      logRecord.sentAt = new Date();
      logRecord.messageId = `simulated-${Date.now()}`;
      logRecord.metadata = { ...logRecord.metadata, simulated: true };
      await logRecord.save();
    }
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
      emailLogId: logRecord?._id,
    };
  }

  // 1. If RESEND_API_KEY is configured, dispatch via HTTPS (Port 443 - bypasses Render Free Tier SMTP blocking)
  if (env.RESEND_API_KEY) {
    try {
      const resendPayload = {
        from: env.RESEND_FROM || env.SMTP.FROM,
        to: [cleanTo],
        subject: cleanSubject,
        html,
        text: fallbackText,
      };

      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const resendAttachments = attachments
          .filter((a) => a && (a.content || a.path))
          .map((a) => ({
            filename: a.filename || a.name || 'attachment',
            content: a.content,
            path: a.path,
          }));
        if (resendAttachments.length > 0) {
          resendPayload.attachments = resendAttachments;
        }
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendPayload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || `Resend HTTP Error ${res.status}`);
      }

      const messageId = resData.id || `resend-${Date.now()}`;
      if (logRecord) {
        logRecord.status = 'Delivered';
        logRecord.sentAt = new Date();
        logRecord.messageId = messageId;
        logRecord.errorMessage = null;
        logRecord.metadata = { ...logRecord.metadata, provider: 'Resend HTTPS' };
        await logRecord.save();
      }

      logger.info(`[Mail:Resend] Delivered successfully to ${cleanTo} (${type}) | ID: ${messageId}`);
      return {
        success: true,
        messageId,
        emailLogId: logRecord?._id,
      };
    } catch (httpError) {
      logger.warn(`[Mail:Resend] HTTPS dispatch error: ${httpError.message}. Retrying via Zoho SMTP...`);
    }
  }

  // 2. Execute SMTP transport (Zoho Mail)
  try {
    const mailOptions = {
      from: env.SMTP.FROM,
      to: cleanTo,
      subject: cleanSubject,
      html,
      text: fallbackText,
      attachments: Array.isArray(attachments)
        ? attachments.map((a) => {
            if (typeof a === 'string') return { filename: a };
            return {
              filename: a.filename || a.name || 'attachment',
              content: a.content ? Buffer.from(a.content, 'base64') : undefined,
              path: a.path || (a.url && a.url.startsWith('http') ? a.url : undefined),
            };
          })
        : [],
    };

    const info = await mailTransporter.sendMail(mailOptions);

    // Update EmailLog on success
    if (logRecord) {
      logRecord.status = 'Delivered';
      logRecord.sentAt = new Date();
      logRecord.messageId = info.messageId;
      logRecord.errorMessage = null;
      await logRecord.save();
    }

    logger.info(`[Mail] Delivered successfully to ${cleanTo} (${type}) | Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      emailLogId: logRecord?._id,
    };
  } catch (error) {
    // Record delivery failure in audit log
    if (logRecord) {
      logRecord.status = 'Failed';
      logRecord.errorMessage = error.message;
      logRecord.lastAttemptAt = new Date();
      await logRecord.save();
    }

    logEmailFailure(cleanTo, cleanSubject, error);
    return {
      success: false,
      error: error.message,
      emailLogId: logRecord?._id,
    };
  }
};

/**
 * 1. Customer Quote Confirmation
 */
export const sendQuoteConfirmation = async (quote) => {
  const { subject, html, text } = renderQuoteConfirmation(quote);

  return sendMail({
    to: quote.customer.email,
    recipientName: `${quote.customer.firstName || ''} ${quote.customer.lastName || ''}`.trim(),
    subject,
    html,
    text,
    type: 'quote_confirmation',
    relatedId: quote.requestId,
    relatedType: 'Quote',
    metadata: {
      service: quote.service,
      quoteId: quote._id,
    },
  });
};

/**
 * 2. Admin Quote Notification
 */
export const sendQuoteNotification = async (quote) => {
  const { subject, html, text } = renderQuoteNotification(quote);

  return sendMail({
    to: env.SMTP.ADMIN_EMAIL,
    recipientName: 'LoopLayer Admin Desk',
    subject,
    html,
    text,
    type: 'quote_notification',
    relatedId: quote.requestId,
    relatedType: 'Quote',
    metadata: {
      service: quote.service,
      customerEmail: quote.customer?.email,
      quoteId: quote._id,
    },
  });
};

/**
 * 3. Customer Contact Confirmation
 */
export const sendContactConfirmation = async (contact) => {
  const { subject, html, text } = renderContactConfirmation(contact);

  return sendMail({
    to: contact.email,
    recipientName: contact.name,
    subject,
    html,
    text,
    type: 'contact_confirmation',
    relatedId: String(contact._id),
    relatedType: 'Contact',
    metadata: {
      subject: contact.subject,
      contactId: contact._id,
    },
  });
};

/**
 * 4. Admin Contact Notification
 */
export const sendContactNotification = async (contact) => {
  const { subject, html, text } = renderContactNotification(contact);

  return sendMail({
    to: env.SMTP.ADMIN_EMAIL,
    recipientName: 'LoopLayer Admin Desk',
    subject,
    html,
    text,
    type: 'contact_notification',
    relatedId: String(contact._id),
    relatedType: 'Contact',
    metadata: {
      contactName: contact.name,
      contactEmail: contact.email,
      contactId: contact._id,
    },
  });
};

/**
 * 5. Admin Reply Email (Sent directly from dashboard)
 */
export const sendReplyEmail = async ({
  to,
  recipientName = 'Customer',
  subject,
  message,
  threadHistory = [],
  attachments = [],
  relatedId = null,
  relatedType = 'System',
  sentBy = 'LoopLayer Designs Team',
}) => {
  const { subject: renderedSubject, html, text } = renderAdminReply({
    recipientName,
    subject,
    message,
    threadHistory,
    attachments,
    sentBy,
    referenceId: relatedId,
  });

  return sendMail({
    to,
    recipientName,
    subject: renderedSubject,
    html,
    text,
    type: 'admin_reply',
    relatedId,
    relatedType,
    attachments,
    metadata: {
      sentBy,
      threadCount: threadHistory.length,
    },
  });
};

/**
 * 6. Retry Failed Email from Dashboard
 */
export const retryEmail = async (emailLogId) => {
  const logRecord = await EmailLog.findById(emailLogId);
  if (!logRecord) {
    throw ApiError.notFound(`Email log record '${emailLogId}' not found`);
  }

  logRecord.attemptCount += 1;
  logRecord.lastAttemptAt = new Date();

  // If in simulated mode
  if (!env.SMTP.USER || !env.SMTP.PASS) {
    logRecord.status = 'Delivered';
    logRecord.sentAt = new Date();
    logRecord.messageId = `simulated-retry-${Date.now()}`;
    logRecord.errorMessage = null;
    await logRecord.save();
    return {
      success: true,
      simulated: true,
      messageId: logRecord.messageId,
      emailLog: logRecord,
    };
  }

  try {
    const mailOptions = {
      from: env.SMTP.FROM,
      to: logRecord.recipient,
      subject: logRecord.subject,
      html: logRecord.htmlContent,
      text: logRecord.textContent,
      attachments: logRecord.attachments.map((a) => ({
        filename: a.filename,
        path: a.url,
      })),
    };

    const info = await mailTransporter.sendMail(mailOptions);

    logRecord.status = 'Delivered';
    logRecord.sentAt = new Date();
    logRecord.messageId = info.messageId;
    logRecord.errorMessage = null;
    await logRecord.save();

    logger.info(`[Mail] Retry succeeded for log ${emailLogId} to ${logRecord.recipient}`);
    return {
      success: true,
      messageId: info.messageId,
      emailLog: logRecord,
    };
  } catch (error) {
    logRecord.status = 'Failed';
    logRecord.errorMessage = error.message;
    await logRecord.save();

    logger.error(`[Mail] Retry failed for log ${emailLogId}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      emailLog: logRecord,
    };
  }
};

/**
 * 7. Live Email Preview for Dashboard Composer
 */
export const previewEmail = ({ type, data = {} }) => {
  switch (type) {
    case 'quote_confirmation':
      return renderQuoteConfirmation(data);
    case 'quote_notification':
      return renderQuoteNotification(data);
    case 'contact_confirmation':
      return renderContactConfirmation(data);
    case 'contact_notification':
      return renderContactNotification(data);
    case 'admin_reply':
    default:
      return renderAdminReply(data);
  }
};

/**
 * 8. Query Email Delivery History / Logs
 */
export const getEmailLogs = async ({
  page = 1,
  limit = 20,
  status = '',
  type = '',
  search = '',
  recipient = '',
  relatedId = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const query = {};

  if (status && status !== 'All') {
    query.status = status;
  }

  if (type && type !== 'All') {
    query.type = type;
  }

  if (recipient) {
    query.recipient = { $regex: recipient.trim(), $options: 'i' };
  }

  if (relatedId) {
    query.relatedId = relatedId.trim();
  }

  if (search && search.trim() !== '') {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    query.$or = [
      { recipient: searchRegex },
      { recipientName: searchRegex },
      { subject: searchRegex },
      { relatedId: searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

  const [logs, total] = await Promise.all([
    EmailLog.find(query).sort({ [sortBy]: sortDirection }).skip(skip).limit(limitNum).lean(),
    EmailLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * 9. Get Single Email Log Detail
 */
export const getEmailLogById = async (id) => {
  const log = await EmailLog.findById(id).lean();
  if (!log) {
    throw ApiError.notFound(`Email log with ID '${id}' not found`);
  }
  return log;
};

// ==========================================
// BACKWARD-COMPATIBILITY ALIASES
// ==========================================
export const sendQuoteConfirmationToCustomer = sendQuoteConfirmation;
export const sendQuoteAlertToAdmin = sendQuoteNotification;
export const sendContactConfirmationToCustomer = sendContactConfirmation;
export const sendContactAlertToAdmin = sendContactNotification;
export const sendDirectCustomerEmail = async ({ to, subject, richTextMessage, attachments = [] }) => {
  return sendReplyEmail({
    to,
    subject,
    message: richTextMessage,
    attachments,
  });
};

export { verifyMailConnection, getSMTPDiagnostics };

export default {
  sendMail,
  sendQuoteConfirmation,
  sendQuoteNotification,
  sendContactConfirmation,
  sendContactNotification,
  sendReplyEmail,
  verifySMTPConnection: verifyMailConnection,
  retryEmail,
  previewEmail,
  getEmailLogs,
  getEmailLogById,
  getSMTPDiagnostics,
  // Backward compatibility:
  sendQuoteConfirmationToCustomer,
  sendQuoteAlertToAdmin,
  sendContactConfirmationToCustomer,
  sendContactAlertToAdmin,
  sendDirectCustomerEmail,
};
