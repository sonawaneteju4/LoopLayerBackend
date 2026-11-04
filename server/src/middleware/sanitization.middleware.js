import sanitizeHtml from 'sanitize-html';

/**
 * Recursive Mongo NoSQL injection sanitization.
 * Strips any object keys starting with '$' or containing '.' from req.body, req.query, and req.params.
 */
export const mongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

/**
 * Recursive XSS sanitization for string fields in requests.
 * Uses sanitize-html to remove dangerous scripts and tags.
 */
export const xssClean = (req, res, next) => {
  const clean = (val) => {
    if (typeof val === 'string') {
      return sanitizeHtml(val, {
        allowedTags: [], // Strip all HTML tags from simple inputs
        allowedAttributes: {},
      }).trim();
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const k of Object.keys(val)) {
        // Skip rich text fields if they will be sanitized separately
        if (k !== 'html' && k !== 'htmlContent' && k !== 'projectRequirements') {
          val[k] = clean(val[k]);
        }
      }
    } else if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        val[i] = clean(val[i]);
      }
    }
    return val;
  };

  if (req.body && typeof req.body === 'object') {
    clean(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    clean(req.query);
  }

  next();
};

export default {
  mongoSanitize,
  xssClean,
};
