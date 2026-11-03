import { body, query, param, validationResult } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import { ApiError } from '../utils/response.js';
import { cleanupTempFiles } from './upload.middleware.js';

/**
 * Executes validation rules and passes formatted errors or proceeds to next middleware
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  // Cleanup uploaded temp files if validation fails
  if (req.files && Array.isArray(req.files)) {
    cleanupTempFiles(req.files);
  }

  const extractedErrors = errors.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value,
  }));

  return next(ApiError.unprocessable('Validation failed. Please verify input data.', extractedErrors));
};

/**
 * Sanitizes rich text HTML message
 */
export const sanitizeRichText = (dirtyHtml) => {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  return sanitizeHtml(dirtyHtml, {
    allowedTags: [
      'p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'span', 'div'
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['style'],
      div: ['style'],
      p: ['style'],
    },
  });
};

/**
 * Validation rules for submitting a Quote request
 */
export const quoteValidationRules = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 60 })
    .withMessage('First name cannot exceed 60 characters'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 60 })
    .withMessage('Last name cannot exceed 60 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ max: 30 })
    .withMessage('Phone number is too long'),

  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 80 })
    .withMessage('Country name is too long'),

  body('service')
    .trim()
    .notEmpty()
    .withMessage('Service selection is required')
    .isLength({ max: 100 })
    .withMessage('Service name is too long'),

  body('width')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Width must be a valid number')
    .toFloat(),

  body('height')
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage('Height must be a valid number')
    .toFloat(),

  body('unit')
    .optional()
    .trim()
    .isIn(['in', 'cm', 'mm', 'px'])
    .withMessage('Unit must be one of: in, cm, mm, px'),

  body('projectRequirements')
    .trim()
    .notEmpty()
    .withMessage('Project requirements cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Project requirements cannot exceed 5000 characters'),
];

/**
 * Validation rules for Contact Form submission
 */
export const contactValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Phone number cannot exceed 30 characters'),

  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 5000 })
    .withMessage('Message cannot exceed 5000 characters'),
];

/**
 * Validation rules for Admin Setup
 */
export const setupAdminValidationRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain alphanumeric characters, underscores, and dashes'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('setupSecret')
    .trim()
    .notEmpty()
    .withMessage('Admin setup secret is required'),
];

/**
 * Validation rules for Admin Login
 */
export const loginValidationRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for updating Quote status / internal notes
 */
export const updateQuoteStatusValidationRules = [
  body('status')
    .optional()
    .trim()
    .isIn(['Pending', 'Reviewing', 'In Progress', 'Completed', 'Rejected'])
    .withMessage('Invalid status value. Must be Pending, Reviewing, In Progress, Completed, or Rejected'),

  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Internal note cannot exceed 2000 characters'),
];

/**
 * Validation rules for sending email reply to customer from Quote
 */
export const replyQuoteValidationRules = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Email subject is required')
    .isLength({ max: 250 })
    .withMessage('Email subject cannot exceed 250 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message body is required'),
];

/**
 * Validation rules for updating Contact status
 */
export const updateContactStatusValidationRules = [
  body('status')
    .optional()
    .trim()
    .isIn(['New', 'Read', 'Replied', 'Archived'])
    .withMessage('Invalid status value. Must be New, Read, Replied, or Archived'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Note cannot exceed 2000 characters'),
];

/**
 * Validation rules for replying to Contact
 */
export const replyContactValidationRules = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Reply subject is required')
    .isLength({ max: 250 })
    .withMessage('Subject cannot exceed 250 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Reply message is required'),
];

/**
 * Validation rules for Dashboard Email Composer
 */
export const composeEmailValidationRules = [
  body('to')
    .trim()
    .notEmpty()
    .withMessage('Recipient email address is required')
    .isEmail()
    .withMessage('A valid recipient email address is required')
    .normalizeEmail(),

  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Email subject is required')
    .isLength({ max: 250 })
    .withMessage('Email subject cannot exceed 250 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Email message body is required'),
];

export const previewEmailValidationRules = [
  body('type')
    .optional()
    .trim()
    .isIn([
      'quote_confirmation',
      'quote_notification',
      'contact_confirmation',
      'contact_notification',
      'admin_reply',
      'custom',
    ])
    .withMessage('Invalid template type for preview'),
];

export default {
  validate,
  sanitizeRichText,
  quoteValidationRules,
  contactValidationRules,
  setupAdminValidationRules,
  loginValidationRules,
  updateQuoteStatusValidationRules,
  replyQuoteValidationRules,
  updateContactStatusValidationRules,
  replyContactValidationRules,
  composeEmailValidationRules,
  previewEmailValidationRules,
};

