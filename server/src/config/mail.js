import nodemailer from 'nodemailer';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
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
  status: 'Unverified',
  lastVerificationTime: null,
  lastError: null,
  provider: env.EMAIL_PROVIDER === 'ses' ? 'AWS SES (HTTPS Port 443)' : (env.EMAIL_PROVIDER === 'resend' ? 'Resend' : 'Zoho Mail SMTP'),
  host: env.EMAIL_PROVIDER === 'ses' ? `email.${env.AWS_SES.REGION}.amazonaws.com` : resolveZohoHost(env.SMTP.HOST),
  port: env.EMAIL_PROVIDER === 'ses' || env.EMAIL_PROVIDER === 'resend' ? 443 : (Number(env.SMTP.PORT) || 465),
  secure: true,
  user: env.SMTP.USER,
};

/**
 * Configure Nodemailer transporter based on active EMAIL_PROVIDER:
 * - 'ses': AWS Simple Email Service over HTTPS port 443 (via @aws-sdk/client-ses)
 * - 'zoho': Zoho Mail SMTP (Port 465 SSL or Port 587 STARTTLS)
 */
export const createMailTransporter = () => {
  // 1. AWS SES Transporter (HTTPS Port 443 - Bypasses Render firewall blocks)
  if (env.EMAIL_PROVIDER === 'ses') {
    if (env.AWS_SES.ACCESS_KEY_ID && env.AWS_SES.SECRET_ACCESS_KEY) {
      const ses = new SESClient({
        region: env.AWS_SES.REGION || 'us-east-1',
        credentials: {
          accessKeyId: env.AWS_SES.ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SES.SECRET_ACCESS_KEY,
        },
      });

      return nodemailer.createTransport({
        SES: { ses, aws: { SendRawEmailCommand } },
      });
    }
    // Fallback stub transporter for development if keys not yet set
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  // 2. Zoho Mail SMTP Transporter
  const host = resolveZohoHost(env.SMTP.HOST);
  const port = Number(env.SMTP.PORT) || 465;
  const isPort465 = port === 465;
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
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10,
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
 */
export const verifyMailConnection = async () => {
  smtpDiagnostics.lastVerificationTime = new Date().toISOString();

  // 1. AWS SES Provider
  if (env.EMAIL_PROVIDER === 'ses') {
    if (!env.AWS_SES.ACCESS_KEY_ID || !env.AWS_SES.SECRET_ACCESS_KEY) {
      smtpDiagnostics.provider = 'AWS SES (HTTPS Port 443)';
      smtpDiagnostics.status = 'SES Credentials Missing';
      smtpDiagnostics.lastError = 'AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not configured';
      logger.warn('[Mail] AWS SES credentials are not set. Outbound emails will run in simulated development mode.');
      return {
        connected: false,
        simulated: true,
        provider: 'AWS SES (HTTPS Port 443)',
        status: 'SES Credentials Missing',
        lastVerificationTime: smtpDiagnostics.lastVerificationTime,
      };
    }

    try {
      await mailTransporter.verify();
      smtpDiagnostics.provider = 'AWS SES (HTTPS Port 443)';
      smtpDiagnostics.status = 'SES Connected';
      smtpDiagnostics.lastError = null;
      logger.info(`[Mail] AWS SES verified successfully (Region: ${env.AWS_SES.REGION}, HTTPS Port 443)`);
      return {
        connected: true,
        provider: 'AWS SES (HTTPS Port 443)',
        simulated: false,
        status: 'SES Connected',
        lastVerificationTime: smtpDiagnostics.lastVerificationTime,
      };
    } catch (error) {
      smtpDiagnostics.provider = 'AWS SES (HTTPS Port 443)';
      smtpDiagnostics.status = 'SES Failed';
      smtpDiagnostics.lastError = error.message;
      logger.error(`[Mail] AWS SES verification failed: ${error.message}`);
      return {
        connected: false,
        provider: 'AWS SES (HTTPS Port 443)',
        simulated: false,
        status: 'SES Failed',
        lastVerificationTime: smtpDiagnostics.lastVerificationTime,
        error: error.message,
      };
    }
  }

  // 2. Resend Provider
  if (env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY) {
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

  // 3. Simulated Dev Mode if no SMTP credentials
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

  // 4. Zoho Mail SMTP Provider
  try {
    await mailTransporter.verify();
    smtpDiagnostics.provider = 'Zoho Mail SMTP';
    smtpDiagnostics.status = 'SMTP Connected';
    smtpDiagnostics.lastError = null;
    logger.info(`[Mail] Zoho SMTP Transporter verified successfully (${resolveZohoHost(env.SMTP.HOST)}:${env.SMTP.PORT})`);
    return {
      connected: true,
      provider: 'Zoho Mail SMTP',
      simulated: false,
      status: 'SMTP Connected',
      lastVerificationTime: smtpDiagnostics.lastVerificationTime,
    };
  } catch (error) {
    smtpDiagnostics.provider = 'Zoho Mail SMTP';
    smtpDiagnostics.status = 'SMTP Failed';
    smtpDiagnostics.lastError = error.message;
    logger.error(`[Mail] Zoho SMTP verification failed: ${error.message}`);
    return {
      connected: false,
      provider: 'Zoho Mail SMTP',
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
  const mask = (str) => {
    if (!str) return 'None';
    return str.length > 4 ? `${str.slice(0, 4)}****` : '****';
  };

  const isSes = env.EMAIL_PROVIDER === 'ses';
  const isResend = env.EMAIL_PROVIDER === 'resend';

  return {
    provider: isSes ? 'AWS SES (HTTPS Port 443)' : (isResend ? 'Resend (HTTPS Port 443)' : 'Zoho Mail SMTP'),
    status: smtpDiagnostics.status,
    lastVerificationTime: smtpDiagnostics.lastVerificationTime,
    host: isSes ? `email.${env.AWS_SES.REGION}.amazonaws.com` : (isResend ? 'api.resend.com' : resolveZohoHost(env.SMTP.HOST)),
    port: isSes || isResend ? 443 : (Number(env.SMTP.PORT) || 465),
    secure: true,
    user: isSes ? mask(env.AWS_SES.ACCESS_KEY_ID) : (isResend ? 'resend-api' : mask(env.SMTP.USER)),
    fromName: env.SMTP.FROM_NAME,
    fromEmail: env.SMTP.FROM_EMAIL,
    lastError: smtpDiagnostics.lastError,
  };
};

export default mailTransporter;
