import inboundEmailService from '../services/inboundEmail.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Controller for Admin Inbound Email Inbox
 */

export const getInboxEmails = async (req, res, next) => {
  try {
    const result = await inboundEmailService.getInboundEmails(req.query);
    return sendSuccess(res, 200, 'Inbound emails retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getInboxStats = async (req, res, next) => {
  try {
    const stats = await inboundEmailService.getInboxStats();
    return sendSuccess(res, 200, 'Inbox statistics retrieved', stats);
  } catch (error) {
    next(error);
  }
};

export const getInboxEmailById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const peek = req.query.peek === 'true';
    const email = await inboundEmailService.getInboundEmailById(id, { peek });
    return sendSuccess(res, 200, 'Email details retrieved', email);
  } catch (error) {
    next(error);
  }
};

export const updateInboxEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isRead, status, isStarred } = req.body;
    const updated = await inboundEmailService.updateInboundEmail(id, {
      isRead,
      status,
      isStarred,
    });
    return sendSuccess(res, 200, 'Email updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const deleteInboxEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';
    const result = await inboundEmailService.deleteInboundEmail(id, { permanent });
    return sendSuccess(
      res,
      200,
      permanent ? 'Email permanently deleted' : 'Email moved to trash',
      result
    );
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateInboxEmails = async (req, res, next) => {
  try {
    const { ids, action } = req.body;
    const result = await inboundEmailService.bulkUpdateInboundEmails({ ids, action });
    return sendSuccess(res, 200, `Bulk action '${action}' applied to ${result.count} email(s)`, result);
  } catch (error) {
    next(error);
  }
};

export const downloadRawEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'eml'; // 'eml' | 'json'
    const data = await inboundEmailService.getRawEmailData(id);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="email-${id}.json"`
      );
      return res.send(JSON.stringify(data.rawPayload, null, 2));
    }

    res.setHeader('Content-Type', 'message/rfc822');
    res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
    return res.send(data.emlContent);
  } catch (error) {
    next(error);
  }
};

export default {
  getInboxEmails,
  getInboxStats,
  getInboxEmailById,
  updateInboxEmail,
  deleteInboxEmail,
  bulkUpdateInboxEmails,
  downloadRawEmail,
};
