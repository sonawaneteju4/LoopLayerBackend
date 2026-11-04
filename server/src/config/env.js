import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from process cwd, server dir, or project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Validate and export application environment variables.
 * Fails fast on startup if critical configuration is missing in production.
 */
const requiredEnvVars = [
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
];

const isProduction = process.env.NODE_ENV === 'production';

// In production, enforce that all critical credentials are provided
if (isProduction) {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[Config] Fatal: Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'https://looplayerdesing.com',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'https://looplayerdesign.com',
        'https://www.looplayerdesign.com',
        'https://looplayerdesing.com',
        'https://www.looplayerdesing.com',
        'http://localhost:3000',
        'http://localhost:5173',
      ],

  // Database
  MONGODB_URI:
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/looplayer_designs',

  // Authentication & Security
  JWT_SECRET: process.env.JWT_SECRET || 'looplayer_super_secret_jwt_dev_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  ADMIN_SETUP_SECRET:
    process.env.ADMIN_SETUP_SECRET || 'looplayer_initial_admin_setup_secret_key',

  // Cloudinary Configuration
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    FOLDER: process.env.CLOUDINARY_FOLDER || 'looplayer/quotes',
  },

  // Zoho Mail / SMTP Configuration
  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.zoho.in',
    PORT: parseInt(process.env.SMTP_PORT, 10) || 465,
    SECURE: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASS || '',
    FROM_NAME: process.env.FROM_NAME || 'LoopLayer Designs',
    FROM_EMAIL: process.env.FROM_EMAIL || 'orders@looplayerdesing.com',
    FROM:
      process.env.SMTP_FROM ||
      `"${process.env.FROM_NAME || 'LoopLayer Designs'}" <${process.env.FROM_EMAIL || 'orders@looplayerdesing.com'}>`,
    ADMIN_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL || 'orders@looplayerdesing.com',
  },

  // HTTP Email API (Bypasses Render Free Tier SMTP port blocking over HTTPS port 443)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM:
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    `"${process.env.FROM_NAME || 'LoopLayer Designs'}" <${process.env.FROM_EMAIL || 'orders@looplayerdesing.com'}>`,

  // Upload limits
  UPLOAD: {
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 20,
    MAX_FILE_COUNT: parseInt(process.env.MAX_FILE_COUNT, 10) || 10,
    ALLOWED_EXTENSIONS: [
      'jpg',
      'jpeg',
      'png',
      'pdf',
      'ai',
      'eps',
      'svg',
      'dst',
      'pes',
      'zip',
    ],
  },

  // Rate Limiting
  RATE_LIMIT: {
    GLOBAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    GLOBAL_MAX: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX, 10) || 300,
    PUBLIC_WINDOW_MS: 60 * 60 * 1000, // 1 hour
    PUBLIC_MAX: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX, 10) || 10,
    AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    AUTH_MAX: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 5,
  },
};

export default env;

