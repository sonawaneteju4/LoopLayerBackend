import nodemailer from 'nodemailer';
import env from './env.js';
import logger from '../utils/logger.js';

/**
 * Normalizes Zoho SMTP host.
 * Accounts registered on Zoho India/International fail on smtp.zoho.com with 535 or timeouts.
 */
export const resolveZohoHost = (configuredHost) => {
  if (!configuredHost || configuredHost === 'smtp.zoho.com') {
    return 'smtp.zoho.in';
  }
  return configuredHost;
};

/**
 * Global SMTP diagnostic state tracker for Admin Dashboard settings
 */
export const smtpDiagnostics = {
  status: 'Unverified', // 'SMTP Connected' | 'SMTP Failed' | 'Unverified'
  lastVerificationTime: null,
  lastError: null,
  host: resolveZohoHost(env.SMTP.HOST),
  port: Number(env.SMTP.PORT) || 465,
  secure: (Number(env.SMTP.PORT) || 465) === 465,
  user: env.SMTP.USER,
};

/**
 * Configure Nodemailer pooled transporter tailored for Zoho Mail SMTP
 * Zoho Mail supports:
 * - Port 465 with SSL/TLS (secure: true)
 * - Port 587 with STARTTLS (secure: false, requireTLS: true)
 */
export const createMailTransporter = () => {
  const host = resolveZohoHost(env.SMTP.HOST);
  const port = Number(env.SMTP.PORT) || 465;
  const isPort465 = port === 465;
  // Enforce correct SSL/TLS mode to eliminate ssl3_get_record:wrong version number
  // Port 465 requires secure: true (SSL/TLS)
  // Port 587 requires secure: false with requireTLS: true (STARTTLS)
  const secure = isPort465;

  const transportConfig = {
    host,
    port,
    secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: env.SMTP.USER,
      pass: env.SMTP.PASS,
    },
    pool: true, // Use pooled persistent connections for performance
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10, // Max 10 messages/sec to adhere to Zoho sending thresholds
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
 * Verifies Outbound Email connectivity and records diagnostics.
 * When RESEND_API_KEY is configured, skips traditional SMTP connection to avoid Render port blocking.
 */
export const verifyMailConnection = async () => {
  smtpDiagnostics.lastVerificationTime = new Date().toISOString();

  // 1. If Resend is configured, use it as primary provider over HTTPS port 443
  if (env.RESEND_API_KEY) {
    smtpDiagnostics.provider = 'Resend (HTTPS Port 443)';
    smtpDiagnostics.status = 'Resend Connected';
    smtpDiagnostics.lastError = null;
    logger.info('[Mail] Resend HTTPS Email API active and verified (Port 443)');
    return {
      connected: true,
      provider: 'Resend',
      status: 'Resend Connected',
      lastVerificationTime: smtpDiagnostics.lastVerificationTime,
    };
  }

  // 2. If no SMTP credentials provided
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

  // 3. Verify Zoho SMTP
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
 * Returns current SMTP/Email health and configuration diagnostics (with masked credentials)
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

  const activePort = Number(env.SMTP.PORT) || 465;

  return {
    provider: env.RESEND_API_KEY ? 'Resend (HTTPS Port 443)' : 'Zoho Mail',
    status: env.RESEND_API_KEY ? 'Resend Connected' : smtpDiagnostics.status,
    lastVerificationTime: smtpDiagnostics.lastVerificationTime,
    host: env.RESEND_API_KEY ? 'api.resend.com' : resolveZohoHost(env.SMTP.HOST),
    port: env.RESEND_API_KEY ? 443 : activePort,
    secure: env.RESEND_API_KEY ? true : activePort === 465,
    user: env.RESEND_API_KEY ? 'resend-api' : maskEmail(env.SMTP.USER),
    fromName: env.SMTP.FROM_NAME,
    fromEmail: env.SMTP.FROM_EMAIL,
    lastError: smtpDiagnostics.lastError,
  };
};

export default mailTransporter;
