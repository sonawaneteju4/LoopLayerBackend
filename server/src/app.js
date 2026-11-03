import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import morgan from 'morgan';

import env from './config/env.js';
import logger, { morganStream } from './utils/logger.js';
import { globalLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import authenticateAdmin from './middleware/auth.middleware.js';
import adminController from './controllers/admin.controller.js';
import {
  validate,
  updateQuoteStatusValidationRules,
  replyQuoteValidationRules,
} from './middleware/validation.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import quoteRoutes from './routes/quote.routes.js';
import contactRoutes from './routes/contact.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// ==========================================
// 1. TRUST PROXY & SECURITY HEADERS
// ==========================================
// Trust first proxy if running behind reverse proxy (e.g. Nginx, Cloudflare, Heroku, Render)
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ==========================================
// 2. CORS CONFIGURATION
// ==========================================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = env.ALLOWED_ORIGINS;
    if (allowed.includes('*') || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin '${origin}' not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Disposition'],
};
app.use(cors(corsOptions));

// ==========================================
// 3. PARSERS, COMPRESSION & HYGIENE
// ==========================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(hpp()); // Prevent HTTP Parameter Pollution

// ==========================================
// 4. REQUEST LOGGING (Morgan + Winston)
// ==========================================
const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: morganStream,
    skip: (req) => req.originalUrl === '/health' || req.originalUrl === '/api/health',
  })
);

// ==========================================
// 5. GLOBAL RATE LIMITING
// ==========================================
app.use('/api', globalLimiter);

// ==========================================
// 6. HEALTH CHECK
// ==========================================
const healthPayload = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LoopLayer Designs API is healthy and operational',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: `${Math.round(process.uptime())} seconds`,
  });
};

app.get('/health', healthPayload);
app.get('/api/health', healthPayload);

// ==========================================
// 7. PRIMARY API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Direct /quotes routes alias as specified in requirements
const quotesRouter = express.Router();
quotesRouter.use(authenticateAdmin);
quotesRouter.get('/:id', adminController.getQuoteDetails);
quotesRouter.patch('/:id', updateQuoteStatusValidationRules, validate, adminController.updateQuote);
quotesRouter.delete('/:id', adminController.deleteQuote);
quotesRouter.get('/:id/download-zip', adminController.downloadQuoteZip);
quotesRouter.post('/:id/reply', replyQuoteValidationRules, validate, adminController.replyToQuoteCustomer);
app.use('/quotes', quotesRouter);

// ==========================================
// 8. 404 & ERROR HANDLING MIDDLEWARE
// ==========================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

