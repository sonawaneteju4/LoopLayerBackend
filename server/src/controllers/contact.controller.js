import contactService from '../services/contact.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Public Contact Controller
 */
export const submitContact = async (req, res, next) => {
  try {
    const contact = await contactService.createContact(req.body);
    return sendSuccess(
      res,
      201,
      'Thank you for reaching out! Your message has been received and our team will get back to you shortly.',
      {
        id: contact._id,
        status: contact.status,
        name: contact.name,
        subject: contact.subject,
        createdAt: contact.createdAt,
      }
    );
  } catch (error) {
    next(error);
  }
};

export default {
  submitContact,
};

