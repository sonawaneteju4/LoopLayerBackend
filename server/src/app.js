import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import hpp from "hpp";
import morgan from "morgan";

import env from "./config/env.js";
import logger, { morganStream } from "./utils/logger.js";
import { sendSuccess } from "./utils/response.js";
import { globalLimiter } from "./middleware/rateLimiter.middleware.js";
import {
  mongoSanitize,
  xssClean,
} from "./middleware/sanitization.middleware.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import authenticateAdmin from "./middleware/auth.middleware.js";
import adminController from "./controllers/admin.controller.js";
import {
  validate,
  updateQuoteStatusValidationRules,
  replyQuoteValidationRules,
} from "./middleware/validation.middleware.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import quoteRoutes from "./routes/quote.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import healthRoutes from "./routes/health.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";

const app = express();

// ==========================================
// 1. TRUST PROXY & SECURITY HEADERS
// ==========================================
// Trust first proxy if running behind reverse proxy (e.g. Nginx, Cloudflare, Heroku, Render)
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ==========================================
// 2. CORS CONFIGURATION
// ==========================================
const isOriginAllowed = (origin) => {
  // Allow requests with no origin (like mobile apps, curl, server-to-server)
  if (!origin) return true;

  // 1. Direct match with configured ALLOWED_ORIGINS
  if (
    env.ALLOWED_ORIGINS.includes("*") ||
    env.ALLOWED_ORIGINS.includes(origin)
  ) {
    return true;
  }

  // 2. Robust domain matching (both looplayerdesign.com and looplayerdesign.com with or without www, plus vercel.app and localhost)
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "looplayerdesign.com" ||
      hostname.endsWith(".looplayerdesign.com") ||
      hostname === "looplayerdesign.com" ||
      hostname.endsWith(".looplayerdesign.com") ||
      hostname.endsWith(".vercel.app") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin '${origin}' not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["Content-Disposition"],
};
app.use(cors(corsOptions));

// ==========================================
// 3. PARSERS, COMPRESSION & HYGIENE
// ==========================================
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(mongoSanitize); // Prevent NoSQL Injection attacks ($ operators and dots)
app.use(xssClean); // Clean malicious XSS injection scripts

// ==========================================
// 4. REQUEST LOGGING (Morgan + Winston)
// ==========================================
const morganFormat = env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    stream: morganStream,
    skip: (req) =>
      req.originalUrl.startsWith("/health") ||
      req.originalUrl.startsWith("/api/health"),
  }),
);

// ==========================================
// 5. GLOBAL RATE LIMITING
// ==========================================
app.use("/api", globalLimiter);

// ==========================================
// 6. ROOT & HEALTH CHECK PROBES
// ==========================================
app.get("/", (req, res) => {
  return sendSuccess(res, 200, "LoopLayer Designs Backend API is running", {
    status: "ONLINE",
    service: "LoopLayer Designs Backend API",
    version: "1.0.0",
    documentation: {
      health: "/health",
      quotes: "POST /api/quote",
      contact: "POST /api/contact",
      login: "POST /api/auth/login",
      adminSetup: "POST /api/auth/setup-admin",
      inboundWebhook: "POST /api/webhooks/resend/inbound",
      inbox: "GET /api/admin/inbox",
    },
  });
});

app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);

// ==========================================
// 7. PRIMARY API ROUTES
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/quote", quoteRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/webhooks", webhookRoutes);

// Direct /quotes routes alias as specified in requirements
const quotesRouter = express.Router();
quotesRouter.use(authenticateAdmin);
quotesRouter.get("/:id", adminController.getQuoteDetails);
quotesRouter.patch(
  "/:id",
  updateQuoteStatusValidationRules,
  validate,
  adminController.updateQuote,
);
quotesRouter.delete("/:id", adminController.deleteQuote);
quotesRouter.get("/:id/download-zip", adminController.downloadQuoteZip);
quotesRouter.get(
  "/:id/files/:fileId/download",
  adminController.downloadSingleQuoteFile,
);
quotesRouter.post(
  "/:id/reply",
  replyQuoteValidationRules,
  validate,
  adminController.replyToQuoteCustomer,
);
app.use("/quotes", quotesRouter);

// ==========================================
// 8. 404 & ERROR HANDLING MIDDLEWARE
// ==========================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
