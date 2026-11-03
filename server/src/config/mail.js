import nodemailer from 'nodemailer';
import env from './env.js';
import logger from '../utils/logger.js';

/**
 * Configure Nodemailer transporter tailored for Zoho Mail SMTP
 * Zoho Mail supports:
 * - Port 465 with SSL/TLS (secure: true)
 * - Port 587 with STARTTLS (secure: false, requireTLS: true)
 */
export const createMailTransporter = () => {
  const isPort465 = Number(env.SMTP.PORT) === 465;

  const transportConfig = {
    host: env.SMTP.HOST,
    port: Number(env.SMTP.PORT),
    secure: env.SMTP.SECURE ?? isPort465,
    auth: {
      user: env.SMTP.USER,
      pass: env.SMTP.PASS,
    },
    pool: true, // Use pooled connections for performance
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10, // Max 10 messages/sec to adhere to Zoho limits
    tls: {
      // Do not fail on invalid certs in development
      rejectUnauthorized: env.NODE_ENV === 'production',
    },
  };

  const transporter = nodemailer.createTransport(transportConfig);

  return transporter;
};

export const mailTransporter = createMailTransporter();

/**
 * Verifies Zoho SMTP connectivity at startup
 */
export const verifyMailConnection = async () => {
  if (!env.SMTP.USER || !env.SMTP.PASS) {
    logger.warn('[Mail] SMTP credentials are not fully configured in .env. Outbound emails will be simulated or logged.');
    return false;
  }

  try {
    await mailTransporter.verify();
    logger.info(`[Mail] Zoho SMTP Transporter verified successfully (${env.SMTP.HOST}:${env.SMTP.PORT})`);
    return true;
  } catch (error) {
    logger.error(`[Mail] Zoho SMTP verification failed: ${error.message}`);
    return false;
  }
};

export default mailTransporter;

