import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Standard rate limiter response generator
 */
const createLimitHandler = (message) => (req, res) => {
  logger.warn(`[RATE LIMIT] Exceeded on ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  res.status(429).json({
    success: false,
    message,
    errors: ['Rate limit exceeded. Maximum 20 requests per 15 minutes.'],
  });
};

/**
 * Global rate limiter: protect entire API against basic DDoS and scraping
 */
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.GLOBAL_WINDOW_MS,
  max: env.RATE_LIMIT.GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many requests from this IP address. Please try again after 15 minutes.'),
});

/**
 * Quote submission rate limiter: prevents spam quote submissions and file uploads
 */
export const quoteLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.PUBLIC_WINDOW_MS,
  max: env.RATE_LIMIT.PUBLIC_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('You have reached the limit for quote requests. Please try again later.'),
});

/**
 * Contact submission rate limiter: prevents contact form abuse
 */
export const contactLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.PUBLIC_WINDOW_MS,
  max: env.RATE_LIMIT.PUBLIC_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('You have reached the limit for contact messages. Please try again later.'),
});

/**
 * Auth rate limiter: protects login endpoint from credential brute-force attacks
 */
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT.AUTH_WINDOW_MS,
  max: env.RATE_LIMIT.AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed login attempts
  handler: createLimitHandler('Too many failed login attempts. Please wait 15 minutes before trying again.'),
});

/**
 * Setup rate limiter: prevents probing the admin setup endpoint
 */
export const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Admin setup attempts exceeded.'),
});

/**
 * Webhook rate limiter: allows high-throughput inbound email webhooks while preventing DDoS
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many webhook requests. Please throttle incoming events.'),
});

export default {
  globalLimiter,
  quoteLimiter,
  contactLimiter,
  authLimiter,
  setupLimiter,
  webhookLimiter,
};

