import nodemailer from 'nodemailer';
import env from './env.js';
import logger from '../utils/logger.js';

/**
 * Global SMTP diagnostic state tracker for Admin Dashboard settings
 */
export const smtpDiagnostics = {
  status: 'Unverified', // 'SMTP Connected' | 'SMTP Failed' | 'Unverified'
  lastVerificationTime: null,
  lastError: null,
  host: env.SMTP.HOST,
  port: Number(env.SMTP.PORT),
  secure: env.SMTP.SECURE,
  user: env.SMTP.USER,
};

/**
 * Configure Nodemailer pooled transporter tailored for Zoho Mail SMTP
 * Zoho Mail supports:
 * - Port 465 with SSL/TLS (secure: true)
 * - Port 587 with STARTTLS (secure: false, requireTLS: true)
 */
export const createMailTransporter = () => {
  const port = Number(env.SMTP.PORT) || 465;
  const isPort465 = port === 465;
  // Enforce correct SSL/TLS mode to eliminate ssl3_get_record:wrong version number
  // Port 465 requires secure: true (SSL/TLS)
  // Port 587 requires secure: false with requireTLS: true (STARTTLS)
  const secure = isPort465;

  const transportConfig = {
    host: env.SMTP.HOST,
    port: port,
    secure: secure,
    auth: {
      user: env.SMTP.USER,
      pass: env.SMTP.PASS,
    },
    pool: true, // Use pooled persistent connections for performance
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10, // Max 10 messages/sec to adhere to Zoho sending thresholds
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: env.NODE_ENV === 'production',
    },
  };

  if (!secure && port === 587) {
    transportConfig.requireTLS = true;
  }

  return nodemailer.createTransport(transportConfig);
};

export const mailTransporter = createMailTransporter();

/**
 * Verifies Zoho SMTP connectivity and records diagnostics
 */
export const verifyMailConnection = async () => {
  smtpDiagnostics.lastVerificationTime = new Date().toISOString();

  if (!env.SMTP.USER || !env.SMTP.PASS) {
    smtpDiagnostics.status = 'SMTP Connected (Simulated / Dev)';
    smtpDiagnostics.lastError = null;
    logger.warn('[Mail] SMTP credentials are not configured. Outbound emails will run in simulated development mode.');
    return {
      connected: true,
      simulated: true,
      status: 'SMTP Connected (Simulated / Dev)',
      lastVerificationTime: smtpDiagnostics.lastVerificationTime,
    };
  }

  try {
    await mailTransporter.verify();
    smtpDiagnostics.status = 'SMTP Connected';
    smtpDiagnostics.lastError = null;
    logger.info(`[Mail] Zoho SMTP Transporter verified successfully (${env.SMTP.HOST}:${env.SMTP.PORT})`);
    return {
      connected: true,
      simulated: false,
      status: 'SMTP Connected',
      lastVerificationTime: smtpDiagnostics.lastVerificationTime,
    };
  } catch (error) {
    smtpDiagnostics.status = 'SMTP Failed';
    smtpDiagnostics.lastError = error.message;
    logger.error(`[Mail] Zoho SMTP verification failed: ${error.message}`);
    return {
      connected: false,
      simulated: false,
      status: 'SMTP Failed',
      lastVerificationTime: smtpDiagnostics.lastVerificationTime,
      error: error.message,
    };
  }
};

/**
 * Returns current SMTP health and configuration diagnostics (with masked credentials)
 */
export const getSMTPDiagnostics = () => {
  const maskEmail = (email) => {
    if (!email) return 'None';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const masked = name.length > 2 ? `${name.slice(0, 2)}****` : '****';
    return `${masked}@${parts[1]}`;
  };

  return {
    status: smtpDiagnostics.status,
    lastVerificationTime: smtpDiagnostics.lastVerificationTime,
    host: env.SMTP.HOST,
    port: Number(env.SMTP.PORT),
    secure: env.SMTP.SECURE,
    user: maskEmail(env.SMTP.USER),
    fromName: env.SMTP.FROM_NAME,
    fromEmail: env.SMTP.FROM_EMAIL,
    lastError: smtpDiagnostics.lastError,
  };
};

export default mailTransporter;
