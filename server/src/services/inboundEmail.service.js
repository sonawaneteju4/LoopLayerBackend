import crypto from 'crypto';
import InboundEmail from '../models/InboundEmail.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/response.js';

/**
 * Extracts normalized email address and display name from an RFC sender string.
 * Example: "John Doe <john@example.com>" -> { fromEmail: "john@example.com", fromName: "John Doe" }
 */
export const parseSender = (sender) => {
  if (!sender) return { fromEmail: 'unknown@example.com', fromName: '' };

  if (typeof sender === 'object') {
    return {
      fromEmail: (sender.email || sender.address || '').toLowerCase().trim(),
      fromName: (sender.name || '').trim(),
    };
  }

  const str = String(sender).trim();
  const match = str.match(/^(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)$/);

  if (match) {
    const fromName = (match[1] || '').trim();
    const fromEmail = (match[2] || '').toLowerCase().trim();
    return { fromEmail, fromName };
  }

  return { fromEmail: str.toLowerCase().replace(/[<>]/g, '').trim(), fromName: '' };
};

/**
 * Normalizes email recipient lists into arrays of trimmed, lowercase emails.
 */
export const normalizeRecipients = (recipients) => {
  if (!recipients) return [];
  if (Array.isArray(recipients)) {
    return recipients
      .map((r) => {
        if (typeof r === 'object' && r) return (r.email || r.address || '').toLowerCase().trim();
        return parseSender(r).fromEmail;
      })
      .filter((e) => e && e.includes('@'));
  }
  if (typeof recipients === 'string') {
    return recipients
      .split(',')
      .map((r) => parseSender(r).fromEmail)
      .filter((e) => e && e.includes('@'));
  }
  return [];
};

/**
 * Verifies Resend Svix webhook authenticity when RESEND_WEBHOOK_SECRET is configured.
 * Resend utilizes Svix headers: svix-id, svix-timestamp, svix-signature.
 */
export const verifyWebhookSignature = ({ headers, rawBody }) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // If not configured, allow processing but log diagnostic warning
    return { valid: true, skipped: true };
  }

  const svixId = headers['svix-id'] || headers['webhook-id'];
  const svixTimestamp = headers['svix-timestamp'] || headers['webhook-timestamp'];
  const svixSignature = headers['svix-signature'] || headers['webhook-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { valid: false, error: 'Missing required Svix webhook verification headers' };
  }

  // Prevent replay attacks (tolerance: 5 minutes)
  const timestampSec = parseInt(svixTimestamp, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > 300) {
    return { valid: false, error: 'Webhook timestamp expired (clock drift > 5m)' };
  }

  try {
    // Extract base64 secret if prefixed with whsec_
    const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret;
    const secretBytes = Buffer.from(secretKey, 'base64');

    const bodyString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const signedPayload = `${svixId}.${svixTimestamp}.${bodyString}`;

    const expectedSignature = crypto
      .createHmac('sha256', secretBytes)
      .update(signedPayload)
      .digest('base64');

    const signatures = svixSignature.split(' ').map((sig) => {
      const parts = sig.split(',');
      return parts.length > 1 ? parts[1] : parts[0];
    });

    const isMatch = signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature));
      } catch {
        return false;
      }
    });

    return { valid: isMatch, error: isMatch ? null : 'Invalid webhook signature' };
  } catch (err) {
    logger.error(`[Webhook] Signature verification error: ${err.message}`);
    return { valid: false, error: err.message };
  }
};

/**
 * Parses and ingests an inbound webhook payload from Resend or generic inbound sources.
 */
export const processInboundWebhook = async (payload, headers = {}) => {
  // Support both Resend webhook wrappers { type: "email.received", data: { ... } } and direct payloads
  const data = payload?.data || payload;

  if (!data || typeof data !== 'object') {
    throw ApiError.badRequest('Invalid or empty webhook payload');
  }

  // Extract / generate Message-ID for deduplication
  const resendId = data.email_id || data.id || '';
  const messageId =
    data.message_id ||
    data.headers?.['message-id'] ||
    data.headers?.['Message-ID'] ||
    (resendId ? `<${resendId}@resend.com>` : null) ||
    `<LLD-${Date.now()}-${crypto.randomBytes(6).toString('hex')}@inbound.looplayerdesign.com>`;

  // 1. Strict deduplication check: check if this messageId was already recorded
  const existing = await InboundEmail.findOne({
    $or: [{ messageId }, ...(resendId ? [{ resendId }] : [])],
  });

  if (existing) {
    logger.info(`[Inbox] Duplicate inbound email ignored: ${messageId}`);
    return {
      success: true,
      duplicate: true,
      message: 'Email already received and indexed',
      emailId: existing._id,
    };
  }

  // 2. Parse sender details
  const rawFrom = data.from || data.sender || '';
  const { fromEmail, fromName } = parseSender(rawFrom);

  if (!fromEmail || !fromEmail.includes('@')) {
    throw ApiError.badRequest(`Missing or invalid sender email in payload: '${rawFrom}'`);
  }

  // 3. Parse recipient lists
  const toEmail = normalizeRecipients(data.to);
  const cc = normalizeRecipients(data.cc);
  const bcc = normalizeRecipients(data.bcc);
  const replyTo = data.reply_to ? parseSender(data.reply_to).fromEmail : '';

  // 4. Content bodies
  const subject = (data.subject || '').trim() || '(No Subject)';
  const htmlBody = data.html || data.html_body || '';
  const textBody =
    data.text ||
    data.text_body ||
    (htmlBody ? htmlBody.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '');

  // 5. Parse attachments
  const rawAttachments = Array.isArray(data.attachments) ? data.attachments : [];
  const attachments = rawAttachments.map((att, idx) => ({
    id: att.id || `att_${idx}_${Date.now()}`,
    filename: att.filename || att.name || `attachment_${idx + 1}`,
    url: att.url || att.download_url || '',
    size: Number(att.size) || (att.content ? Buffer.byteLength(att.content, 'base64') : 0),
    mime: att.content_type || att.mime || 'application/octet-stream',
    content: att.content || null,
    contentId: att.content_id || '',
  }));

  // 6. Spam score detection
  const spamScore =
    typeof data.spam_score === 'number'
      ? data.spam_score
      : parseFloat(data.headers?.['x-spam-score'] || '0') || 0;

  const status = spamScore >= 5 || data.spam_status === 'spam' ? 'spam' : 'received';

  // 7. Store in MongoDB
  const emailRecord = new InboundEmail({
    messageId,
    resendId,
    fromEmail,
    fromName,
    toEmail: toEmail.length > 0 ? toEmail : ['orders@looplayerdesign.com'],
    cc,
    bcc,
    replyTo,
    subject,
    textBody,
    htmlBody,
    attachments,
    headers: data.headers || {},
    spamScore,
    status,
    isRead: false,
    receivedAt: data.created_at || data.date ? new Date(data.created_at || data.date) : new Date(),
    rawPayload: payload,
  });

  await emailRecord.save();

  logger.info(
    `[Inbox] Inbound email saved: From: ${fromEmail} | Subject: "${subject}" | Attachments: ${attachments.length} | ID: ${emailRecord._id}`
  );

  return {
    success: true,
    duplicate: false,
    message: 'Inbound email received and indexed successfully',
    emailId: emailRecord._id,
    record: emailRecord,
  };
};

/**
 * Retrieves paginated inbound emails with search, status filters, and sorting.
 */
export const getInboundEmails = async ({
  page = 1,
  limit = 20,
  filter = 'all', // 'all' | 'unread' | 'read' | 'today' | 'last_7_days' | 'spam' | 'with_attachments' | 'archived' | 'starred'
  search = '',
  sortField = 'receivedAt',
  sortOrder = 'desc',
} = {}) => {
  const query = {};

  // Status & category filter
  switch (filter) {
    case 'unread':
      query.isRead = false;
      query.status = { $ne: 'trash' };
      break;
    case 'read':
      query.isRead = true;
      query.status = { $ne: 'trash' };
      break;
    case 'today': {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query.receivedAt = { $gte: startOfToday };
      query.status = { $nin: ['trash', 'archived'] };
      break;
    }
    case 'last_7_days': {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.receivedAt = { $gte: sevenDaysAgo };
      query.status = { $nin: ['trash', 'archived'] };
      break;
    }
    case 'with_attachments':
      query['attachments.0'] = { $exists: true };
      query.status = { $nin: ['trash', 'archived'] };
      break;
    case 'spam':
      query.status = 'spam';
      break;
    case 'archived':
      query.status = 'archived';
      break;
    case 'starred':
      query.isStarred = true;
      query.status = { $ne: 'trash' };
      break;
    case 'trash':
      query.status = 'trash';
      break;
    case 'all':
    default:
      query.status = { $nin: ['trash', 'archived'] };
      break;
  }

  // Search logic across sender, subject, and text body
  if (search && search.trim() !== '') {
    const term = search.trim();
    const regex = new RegExp(term, 'i');
    query.$or = [
      { fromEmail: regex },
      { fromName: regex },
      { subject: regex },
      { textBody: regex },
      { toEmail: regex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

  const [emails, total] = await Promise.all([
    InboundEmail.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .select('-rawPayload')
      .lean(),
    InboundEmail.countDocuments(query),
  ]);

  return {
    emails,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Retrieves aggregate inbox statistics for counters and dashboard pills.
 */
export const getInboxStats = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    all,
    unread,
    read,
    today,
    last7Days,
    withAttachments,
    spam,
    archived,
    starred,
  ] = await Promise.all([
    InboundEmail.countDocuments({ status: { $nin: ['trash', 'archived'] } }),
    InboundEmail.countDocuments({ isRead: false, status: { $nin: ['trash', 'archived'] } }),
    InboundEmail.countDocuments({ isRead: true, status: { $nin: ['trash', 'archived'] } }),
    InboundEmail.countDocuments({
      receivedAt: { $gte: startOfToday },
      status: { $nin: ['trash', 'archived'] },
    }),
    InboundEmail.countDocuments({
      receivedAt: { $gte: sevenDaysAgo },
      status: { $nin: ['trash', 'archived'] },
    }),
    InboundEmail.countDocuments({
      'attachments.0': { $exists: true },
      status: { $nin: ['trash', 'archived'] },
    }),
    InboundEmail.countDocuments({ status: 'spam' }),
    InboundEmail.countDocuments({ status: 'archived' }),
    InboundEmail.countDocuments({ isStarred: true, status: { $ne: 'trash' } }),
  ]);

  return {
    all,
    unread,
    read,
    today,
    last7Days,
    withAttachments,
    spam,
    archived,
    starred,
  };
};

/**
 * Retrieves full details for a single inbound email.
 * Automatically marks email as read unless peek=true.
 */
export const getInboundEmailById = async (id, { peek = false } = {}) => {
  const email = await InboundEmail.findById(id).select('+rawPayload');
  if (!email) {
    throw ApiError.notFound(`Inbound email '${id}' not found`);
  }

  if (!peek && !email.isRead) {
    email.isRead = true;
    await email.save();
  }

  return email;
};

/**
 * Updates status, isRead, or isStarred for a single email.
 */
export const updateInboundEmail = async (id, { isRead, status, isStarred }) => {
  const email = await InboundEmail.findById(id);
  if (!email) {
    throw ApiError.notFound(`Inbound email '${id}' not found`);
  }

  if (typeof isRead === 'boolean') email.isRead = isRead;
  if (typeof isStarred === 'boolean') email.isStarred = isStarred;
  if (status && ['received', 'archived', 'spam', 'trash'].includes(status)) {
    email.status = status;
  }

  await email.save();
  return email;
};

/**
 * Deletes or trashes an inbound email.
 */
export const deleteInboundEmail = async (id, { permanent = false } = {}) => {
  const email = await InboundEmail.findById(id);
  if (!email) {
    throw ApiError.notFound(`Inbound email '${id}' not found`);
  }

  if (permanent || email.status === 'trash') {
    await InboundEmail.findByIdAndDelete(id);
    return { success: true, deleted: true, permanent: true };
  }

  email.status = 'trash';
  await email.save();
  return { success: true, deleted: true, permanent: false };
};

/**
 * Performs bulk actions on multiple emails.
 */
export const bulkUpdateInboundEmails = async ({ ids = [], action }) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw ApiError.badRequest('No email IDs provided for bulk action');
  }

  let updateQuery = {};
  switch (action) {
    case 'mark_read':
      updateQuery = { $set: { isRead: true } };
      break;
    case 'mark_unread':
      updateQuery = { $set: { isRead: false } };
      break;
    case 'archive':
      updateQuery = { $set: { status: 'archived' } };
      break;
    case 'unarchive':
      updateQuery = { $set: { status: 'received' } };
      break;
    case 'spam':
      updateQuery = { $set: { status: 'spam' } };
      break;
    case 'star':
      updateQuery = { $set: { isStarred: true } };
      break;
    case 'unstar':
      updateQuery = { $set: { isStarred: false } };
      break;
    case 'trash':
      updateQuery = { $set: { status: 'trash' } };
      break;
    case 'delete':
      await InboundEmail.deleteMany({ _id: { $in: ids } });
      return { success: true, count: ids.length, permanent: true };
    default:
      throw ApiError.badRequest(`Unknown bulk action: '${action}'`);
  }

  const result = await InboundEmail.updateMany({ _id: { $in: ids } }, updateQuery);
  return { success: true, count: result.modifiedCount || ids.length };
};

/**
 * Reconstructs or extracts raw payload / EML text for developer inspection and download.
 */
export const getRawEmailData = async (id) => {
  const email = await InboundEmail.findById(id).select('+rawPayload');
  if (!email) {
    throw ApiError.notFound(`Inbound email '${id}' not found`);
  }

  // Format RFC 822-style representation
  const headerLines = [
    `Message-ID: ${email.messageId}`,
    `Date: ${email.receivedAt.toUTCString()}`,
    `From: ${email.fromName ? `"${email.fromName}" <${email.fromEmail}>` : email.fromEmail}`,
    `To: ${email.toEmail.join(', ')}`,
    email.cc?.length ? `Cc: ${email.cc.join(', ')}` : null,
    email.replyTo ? `Reply-To: ${email.replyTo}` : null,
    `Subject: ${email.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${email.htmlBody ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8'}`,
  ]
    .filter(Boolean)
    .join('\r\n');

  const emlContent = `${headerLines}\r\n\r\n${email.htmlBody || email.textBody || ''}`;

  return {
    rawPayload: email.rawPayload || email.toObject(),
    emlContent,
    filename: `email-${email.messageId.replace(/[^a-zA-Z0-9_-]/g, '_')}.eml`,
  };
};

export default {
  parseSender,
  normalizeRecipients,
  verifyWebhookSignature,
  processInboundWebhook,
  getInboundEmails,
  getInboxStats,
  getInboundEmailById,
  updateInboundEmail,
  deleteInboundEmail,
  bulkUpdateInboundEmails,
  getRawEmailData,
};

