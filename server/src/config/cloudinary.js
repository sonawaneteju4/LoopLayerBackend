import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';
import logger from '../utils/logger.js';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: env.CLOUDINARY.CLOUD_NAME,
  api_key: env.CLOUDINARY.API_KEY,
  api_secret: env.CLOUDINARY.API_SECRET,
  secure: true,
});

// Verify credentials presence
if (!env.CLOUDINARY.CLOUD_NAME || !env.CLOUDINARY.API_KEY || !env.CLOUDINARY.API_SECRET) {
  logger.warn(
    '[Cloudinary] Missing Cloudinary credentials. File uploads will fail unless CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env'
  );
} else {
  logger.info(`[Cloudinary] Configured for cloud: ${env.CLOUDINARY.CLOUD_NAME}`);
}

export { cloudinary };
export default cloudinary;

