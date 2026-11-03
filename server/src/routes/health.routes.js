import { Router } from 'express';
import healthController from '../controllers/health.controller.js';

const router = Router();

/**
 * @route   GET /health or /api/health
 * @desc    Comprehensive deep system health check (DB, SMTP, Storage, Memory)
 * @access  Public
 */
router.get('/', healthController.getHealth);

/**
 * @route   GET /health/live or /api/health/live
 * @desc    Lightweight liveness probe for process monitoring & uptime bots
 * @access  Public
 */
router.get('/live', healthController.getLiveness);

/**
 * @route   GET /health/ready or /api/health/ready
 * @desc    Readiness probe validating DB readiness before routing traffic
 * @access  Public
 */
router.get('/ready', healthController.getReadiness);

export default router;
