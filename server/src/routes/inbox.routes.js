import { Router } from 'express';
import inboxController from '../controllers/inbox.controller.js';
import authenticateAdmin from '../middleware/auth.middleware.js';

const router = Router();

// Protect all inbox management routes with Admin JWT authentication
router.use(authenticateAdmin);

/**
 * @route   GET /api/admin/inbox
 * @desc    Paginated inbound emails with search, filters, and sorting
 */
router.get('/', inboxController.getInboxEmails);

/**
 * @route   GET /api/admin/inbox/stats
 * @desc    Aggregate inbox counts for unread, spam, attachments, and categories
 */
router.get('/stats', inboxController.getInboxStats);

/**
 * @route   POST /api/admin/inbox/bulk
 * @desc    Execute batch actions (mark_read, mark_unread, archive, delete)
 */
router.post('/bulk', inboxController.bulkUpdateInboxEmails);

/**
 * @route   GET /api/admin/inbox/:id
 * @desc    Retrieve full inbound email details (headers, sanitized HTML, attachments)
 */
router.get('/:id', inboxController.getInboxEmailById);

/**
 * @route   PATCH /api/admin/inbox/:id
 * @desc    Update email status, isRead, or isStarred
 */
router.patch('/:id', inboxController.updateInboxEmail);

/**
 * @route   DELETE /api/admin/inbox/:id
 * @desc    Move to trash or permanently delete
 */
router.delete('/:id', inboxController.deleteInboxEmail);

/**
 * @route   GET /api/admin/inbox/:id/download-raw
 * @desc    Download raw EML (RFC822) or JSON payload
 */
router.get('/:id/download-raw', inboxController.downloadRawEmail);

export default router;

