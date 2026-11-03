import mongoose from 'mongoose';
import os from 'os';
import env from '../config/env.js';
import { getSMTPDiagnostics } from '../config/mail.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Maps Mongoose readyState number to human-readable string
 */
const getMongoStateString = (state) => {
  switch (state) {
    case 0:
      return 'DISCONNECTED';
    case 1:
      return 'CONNECTED';
    case 2:
      return 'CONNECTING';
    case 3:
      return 'DISCONNECTING';
    default:
      return 'UNKNOWN';
  }
};

/**
 * Formats seconds into human-readable duration (e.g. "2h 15m 4s")
 */
const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(' ');
};

/**
 * Comprehensive Deep Health Check API
 * Checks Server, MongoDB Atlas, Zoho SMTP, Cloudinary, and System Memory
 */
export const getHealth = async (req, res) => {
  const startTime = Date.now();

  // 1. Database Health & Ping
  let dbStatus = getMongoStateString(mongoose.connection.readyState);
  let dbLatencyMs = null;
  let isDbHealthy = mongoose.connection.readyState === 1;

  if (isDbHealthy && mongoose.connection.db) {
    try {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbLatencyMs = Date.now() - pingStart;
    } catch (err) {
      isDbHealthy = false;
      dbStatus = `ERROR: ${err.message}`;
    }
  }

  // 2. SMTP Health
  const smtpDiagnostics = getSMTPDiagnostics();

  // 3. Cloudinary Storage Configuration
  const isCloudinaryConfigured = Boolean(
    env.CLOUDINARY.CLOUD_NAME &&
      env.CLOUDINARY.API_KEY &&
      env.CLOUDINARY.API_SECRET
  );

  // 4. Memory & Process Metrics
  const memoryUsage = process.memoryUsage();
  const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  const processUptimeSeconds = process.uptime();

  // 5. Overall System Status Evaluation
  // Status: 'UP', 'DEGRADED', or 'DOWN'
  let overallStatus = 'UP';
  if (!isDbHealthy) {
    overallStatus = 'DEGRADED';
  }

  const httpStatusCode = overallStatus === 'DOWN' ? 503 : 200;
  const executionTimeMs = Date.now() - startTime;

  const healthData = {
    status: overallStatus,
    service: 'LoopLayer Designs Backend API',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.round(processUptimeSeconds),
      formatted: formatUptime(processUptimeSeconds),
    },
    latencyMs: executionTimeMs,
    dependencies: {
      database: {
        provider: 'MongoDB Atlas',
        status: dbStatus,
        healthy: isDbHealthy,
        latencyMs: dbLatencyMs,
        host: mongoose.connection.host || 'Unknown',
        name: mongoose.connection.name || 'Unknown',
      },
      smtp: {
        provider: 'Zoho Mail',
        status: smtpDiagnostics.status,
        host: smtpDiagnostics.host,
        port: smtpDiagnostics.port,
        secure: smtpDiagnostics.secure,
        account: smtpDiagnostics.user,
        lastVerification: smtpDiagnostics.lastVerificationTime,
      },
      storage: {
        provider: 'Cloudinary',
        status: isCloudinaryConfigured ? 'CONFIGURED' : 'UNCONFIGURED',
        cloudName: env.CLOUDINARY.CLOUD_NAME || 'None',
        folder: env.CLOUDINARY.FOLDER,
      },
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCores: os.cpus().length,
      memory: {
        heapUsed: formatMB(memoryUsage.heapUsed),
        heapTotal: formatMB(memoryUsage.heapTotal),
        rss: formatMB(memoryUsage.rss),
        external: formatMB(memoryUsage.external),
      },
    },
  };

  return res.status(httpStatusCode).json({
    success: overallStatus !== 'DOWN',
    message: `System status: ${overallStatus}`,
    data: healthData,
  });
};

/**
 * Liveness Probe (Kubernetes / Docker / Pingdom / UptimeRobot)
 * Returns 200 OK fast without pinging external dependencies
 */
export const getLiveness = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Process is alive',
    data: {
      status: 'ALIVE',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Readiness Probe (Checks if database is connected to accept traffic)
 */
export const getReadiness = (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;

  if (isDbReady) {
    return res.status(200).json({
      success: true,
      message: 'Service is ready to handle traffic',
      data: {
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      },
    });
  }

  return res.status(503).json({
    success: false,
    message: 'Service not ready: Database disconnected',
    errors: ['Database connection is not established'],
    data: {
      status: 'NOT_READY',
      database: getMongoStateString(mongoose.connection.readyState),
      timestamp: new Date().toISOString(),
    },
  });
};

export default {
  getHealth,
  getLiveness,
  getReadiness,
};

