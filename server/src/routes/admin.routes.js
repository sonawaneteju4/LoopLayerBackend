import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import authenticateAdmin from '../middleware/auth.middleware.js';
import {
  validate,
  updateQuoteStatusValidationRules,
  replyQuoteValidationRules,
  updateContactStatusValidationRules,
  replyContactValidationRules,
} from '../middleware/validation.middleware.js';

const router = Router();

// Enforce admin JWT authentication across all admin endpoints
router.use(authenticateAdmin);

/**
 * ==========================================
 * DASHBOARD METRICS
 * ==========================================
 */

/**
 * @route   GET /api/admin/dashboard
 * @desc    Aggregate overview metrics, card counters, and recent activity
 */
router.get('/dashboard', adminController.getDashboardSummary);

/**
 * ==========================================
 * QUOTES MANAGEMENT
 * ==========================================
 */

/**
 * @route   GET /api/admin/quotes
 * @desc    Paginated list of quotes with filters, global search, and sorting
 */
router.get('/quotes', adminController.getQuotesList);

/**
 * @route   GET /api/admin/quotes/:id
 * @desc    Get complete details of a single quote by ID or Request ID
 */
router.get('/quotes/:id', adminController.getQuoteDetails);

/**
 * @route   PATCH /api/admin/quotes/:id
 * @desc    Update quote status and append internal notes
 */
router.patch(
  '/quotes/:id',
  updateQuoteStatusValidationRules,
  validate,
  adminController.updateQuote
);

/**
 * @route   DELETE /api/admin/quotes/:id
 * @desc    Permanently delete a quote and purge its Cloudinary assets
 */
router.delete('/quotes/:id', adminController.deleteQuote);

/**
 * @route   GET /api/admin/quotes/:id/download-zip
 * @desc    Dynamically stream all quote files bundled as a single ZIP archive
 */
router.get('/quotes/:id/download-zip', adminController.downloadQuoteZip);

/**
 * @route   POST /api/admin/quotes/:id/reply
 * @desc    Send direct email reply to customer and log to email history
 */
router.post(
  '/quotes/:id/reply',
  replyQuoteValidationRules,
  validate,
  adminController.replyToQuoteCustomer
);

/**
 * ==========================================
 * CONTACT INQUIRIES MANAGEMENT
 * ==========================================
 */

/**
 * @route   GET /api/admin/contacts
 * @desc    Paginated list of contact messages with search & status filters
 */
router.get('/contacts', adminController.getContactsList);

/**
 * @route   GET /api/admin/contacts/:id
 * @desc    View single contact message details
 */
router.get('/contacts/:id', adminController.getContactDetails);

/**
 * @route   PATCH /api/admin/contact/:id (and /contacts/:id)
 * @desc    Update status (e.g. Read, Archived) and append internal notes
 */
router.patch(
  ['/contact/:id', '/contacts/:id'],
  updateContactStatusValidationRules,
  validate,
  adminController.updateContact
);

/**
 * @route   POST /api/admin/contact/:id/reply (and /contacts/:id/reply)
 * @desc    Reply directly to contact inquiry via email
 */
router.post(
  ['/contact/:id/reply', '/contacts/:id/reply'],
  replyContactValidationRules,
  validate,
  adminController.replyToContact
);

/**
 * @route   DELETE /api/admin/contact/:id (and /contacts/:id)
 * @desc    Delete contact inquiry
 */
router.delete(['/contact/:id', '/contacts/:id'], adminController.deleteContact);

export default router;

