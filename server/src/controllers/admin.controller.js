import Quote from '../models/Quote.js';
import Contact from '../models/Contact.js';
import quoteService from '../services/quote.service.js';
import contactService from '../services/contact.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Controller providing administrative dashboard capabilities
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalQuotes,
      pendingQuotes,
      reviewingQuotes,
      inProgressQuotes,
      completedQuotes,
      rejectedQuotes,
      todayQuotes,
      totalContacts,
      newContacts,
      recentQuotes,
      recentContacts,
    ] = await Promise.all([
      Quote.countDocuments(),
      Quote.countDocuments({ status: 'Pending' }),
      Quote.countDocuments({ status: 'Reviewing' }),
      Quote.countDocuments({ status: 'In Progress' }),
      Quote.countDocuments({ status: 'Completed' }),
      Quote.countDocuments({ status: 'Rejected' }),
      Quote.countDocuments({ createdAt: { $gte: startOfToday } }),
      Contact.countDocuments(),
      Contact.countDocuments({ status: 'New' }),
      Quote.find().sort({ createdAt: -1 }).limit(5).lean(),
      Contact.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const dashboardData = {
      overview: {
        totalQuotes,
        pending: pendingQuotes,
        reviewing: reviewingQuotes,
        inProgress: inProgressQuotes,
        completed: completedQuotes,
        rejected: rejectedQuotes,
        todayRequests: todayQuotes,
      },
      contactsSummary: {
        totalContacts,
        newInquiries: newContacts,
      },
      recentRequests: recentQuotes,
      recentContacts: recentContacts,
    };

    return sendSuccess(res, 200, 'Dashboard overview data retrieved successfully', dashboardData);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve paginated quotes list with filtering, searching, and sorting
 */
export const getQuotesList = async (req, res, next) => {
  try {
    const result = await quoteService.getQuotes(req.query);
    return sendSuccess(res, 200, 'Quotes retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get full quote details
 */
export const getQuoteDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quote = await quoteService.getQuoteById(id);
    return sendSuccess(res, 200, 'Quote details retrieved successfully', quote);
  } catch (error) {
    next(error);
  }
};

/**
 * Update quote status and internal notes
 */
export const updateQuote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, internalNotes } = req.body;
    const author = req.admin ? req.admin.username : 'Admin';

    const updatedQuote = await quoteService.updateQuote(id, {
      status,
      internalNotes,
      author,
    });

    return sendSuccess(res, 200, 'Quote updated successfully', updatedQuote);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete quote and its files
 */
export const deleteQuote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await quoteService.deleteQuote(id);
    return sendSuccess(res, 200, `Quote '${result.requestId}' deleted successfully`, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Download a single file belonging to a quote
 */
export const downloadSingleQuoteFile = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;
    await quoteService.streamSingleQuoteFile(id, fileId, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Download all files belonging to a quote as a ZIP archive
 */
export const downloadQuoteZip = async (req, res, next) => {
  try {
    const { id } = req.params;
    await quoteService.streamQuoteFilesZip(id, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Send email reply to customer from Quote details page
 */
export const replyToQuoteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, message, attachments } = req.body;
    const sentBy = req.admin ? req.admin.username : 'Admin';

    const result = await quoteService.sendCustomerReply(id, {
      subject,
      message,
      attachments: attachments || [],
      sentBy,
    });

    return sendSuccess(res, 200, 'Reply email dispatched and recorded in quote history', {
      requestId: result.quote.requestId,
      emailResult: result.emailResult,
      emailHistoryCount: result.quote.emailHistory.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve paginated contact inquiries list
 */
export const getContactsList = async (req, res, next) => {
  try {
    const result = await contactService.getContacts(req.query);
    return sendSuccess(res, 200, 'Contact inquiries retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get contact inquiry details
 */
export const getContactDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await contactService.getContactById(id);
    return sendSuccess(res, 200, 'Contact inquiry details retrieved successfully', contact);
  } catch (error) {
    next(error);
  }
};

/**
 * Update contact status (e.g. Read, Archived) and notes
 */
export const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const author = req.admin ? req.admin.username : 'Admin';

    const updatedContact = await contactService.updateContact(id, {
      status,
      note,
      author,
    });

    return sendSuccess(res, 200, 'Contact inquiry updated successfully', updatedContact);
  } catch (error) {
    next(error);
  }
};

/**
 * Reply to a contact inquiry via email
 */
export const replyToContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    const sentBy = req.admin ? req.admin.username : 'Admin';

    const result = await contactService.replyContact(id, {
      subject,
      message,
      sentBy,
    });

    return sendSuccess(res, 200, 'Reply email sent successfully and inquiry updated', {
      contactId: result.contact._id,
      status: result.contact.status,
      emailResult: result.emailResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete contact inquiry
 */
export const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await contactService.deleteContact(id);
    return sendSuccess(res, 200, 'Contact inquiry deleted successfully', result);
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboardSummary,
  getQuotesList,
  getQuoteDetails,
  updateQuote,
  deleteQuote,
  downloadSingleQuoteFile,
  downloadQuoteZip,
  replyToQuoteCustomer,
  getContactsList,
  getContactDetails,
  updateContact,
  replyToContact,
  deleteContact,
};

