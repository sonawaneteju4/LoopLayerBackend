import Contact from '../models/Contact.js';
import mailService from './mail.service.js';
import { sanitizeRichText } from '../middleware/validation.middleware.js';
import { ApiError } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Handle new contact inquiry submission from public website
 */
export const createContact = async (contactData) => {
  const contact = new Contact({
    name: contactData.name,
    email: contactData.email.toLowerCase().trim(),
    phone: contactData.phone || '',
    subject: contactData.subject,
    message: contactData.message,
    status: 'New',
  });

  const savedContact = await contact.save();

  // Send non-blocking emails
  mailService
    .sendContactConfirmationToCustomer(savedContact)
    .catch((err) => logger.error(`[Mail] Async error in customer contact confirmation: ${err.message}`));

  mailService
    .sendContactAlertToAdmin(savedContact)
    .catch((err) => logger.error(`[Mail] Async error in admin contact alert: ${err.message}`));

  return savedContact;
};

/**
 * Retrieve paginated, filtered, and searchable contact inquiries
 */
export const getContacts = async ({
  page = 1,
  limit = 10,
  status = '',
  search = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const query = {};

  if (status && status !== 'All') {
    query.status = status;
  }

  if (search && search.trim() !== '') {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { subject: searchRegex },
      { message: searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  const sortCriteria = { [sortBy]: sortDirection };

  const [contacts, total] = await Promise.all([
    Contact.find(query).sort(sortCriteria).skip(skip).limit(limitNum).lean(),
    Contact.countDocuments(query),
  ]);

  return {
    contacts,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Get contact inquiry by ID
 */
export const getContactById = async (id) => {
  const contact = await Contact.findById(id);
  if (!contact) {
    throw ApiError.notFound(`Contact inquiry with ID '${id}' not found`);
  }
  return contact;
};

/**
 * Update contact inquiry status and add notes
 */
export const updateContact = async (id, { status, note, author = 'Admin' }) => {
  const contact = await Contact.findById(id);
  if (!contact) {
    throw ApiError.notFound(`Contact inquiry with ID '${id}' not found`);
  }

  if (status) {
    contact.status = status;
  }

  if (note && note.trim()) {
    contact.internalNotes.push({
      note: note.trim(),
      author,
      createdAt: new Date(),
    });
  }

  await contact.save();
  return contact;
};

/**
 * Reply directly to a contact inquiry via email
 */
export const replyContact = async (id, { subject, message, sentBy = 'Admin' }) => {
  const contact = await Contact.findById(id);
  if (!contact) {
    throw ApiError.notFound(`Contact inquiry with ID '${id}' not found`);
  }

  const cleanMessage = sanitizeRichText(message);

  // Send reply email to contact sender
  const emailResult = await mailService.sendDirectCustomerEmail({
    to: contact.email,
    subject: `Re: ${subject || contact.subject}`,
    richTextMessage: cleanMessage,
  });

  // Record in contact reply history and update status to 'Replied'
  contact.replies.push({
    subject: subject || `Re: ${contact.subject}`,
    message: cleanMessage,
    sentBy,
    sentAt: new Date(),
    messageId: emailResult.messageId || null,
  });

  contact.status = 'Replied';

  await contact.save();

  return {
    contact,
    emailResult,
  };
};

/**
 * Delete contact inquiry
 */
export const deleteContact = async (id) => {
  const contact = await Contact.findByIdAndDelete(id);
  if (!contact) {
    throw ApiError.notFound(`Contact inquiry with ID '${id}' not found`);
  }
  return { id, deleted: true };
};

export default {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  replyContact,
  deleteContact,
};

