import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import env from '../config/env.js';
import { ApiError } from '../utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temporary upload folder exists
const uploadDir = path.resolve(__dirname, '../../uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage for resilient handling of large design files (AI, EPS, DST, PES, ZIP, PDF)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter to strictly enforce allowed formats
 * Allowed: jpg, jpeg, png, pdf, ai, eps, svg, dst, pes, zip
 */
const fileFilter = (req, file, cb) => {
  const allowedExtensions = env.UPLOAD.ALLOWED_EXTENSIONS;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (!allowedExtensions.includes(ext)) {
    return cb(
      ApiError.badRequest(
        `File format '.${ext}' is not supported. Allowed formats: ${allowedExtensions.join(', ')}`
      ),
      false
    );
  }

  cb(null, true);
};

// Configure Multer instance with file count and size limits
export const uploadQuoteFiles = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.UPLOAD.MAX_FILE_SIZE_MB * 1024 * 1024, // 20MB in bytes
    files: env.UPLOAD.MAX_FILE_COUNT, // Max 10 files
  },
}).array('files', env.UPLOAD.MAX_FILE_COUNT);

/**
 * Helper to safely delete an array of local temporary files
 */
export const cleanupTempFiles = (files = []) => {
  if (!files || !Array.isArray(files)) return;

  for (const file of files) {
    const filePath = file.path || file;
    if (filePath && typeof filePath === 'string' && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        // Silently continue cleanup
      }
    }
  }
};

export default {
  uploadQuoteFiles,
  cleanupTempFiles,
};

