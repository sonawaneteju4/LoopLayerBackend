import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cloudinary from '../config/cloudinary.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/response.js';

/**
 * Determines whether the file should be treated as an image or raw binary asset in Cloudinary
 * Formats like .dst, .pes, .ai, .eps, .zip are binary embroidery/vector/archive files.
 */
export const getResourceType = (filename = '') => {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const imageExtensions = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'tiff', 'tif'];

  if (imageExtensions.includes(ext)) {
    return 'image';
  }
  return 'raw';
};

/**
 * Upload a single file from local temporary disk storage to Cloudinary
 *
 * @param {Object} file - Express Multer file object
 * @param {string} [customFolder] - Target folder in Cloudinary
 * @returns {Promise<Object>} Upload metadata
 */
export const uploadFile = async (file, customFolder = null) => {
  const folder = customFolder || env.CLOUDINARY.FOLDER;
  const resourceType = getResourceType(file.originalname);
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  try {
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      discard_original_filename: false,
    };

    // For raw files, keep original extension in public_id
    if (resourceType === 'raw') {
      uploadOptions.format = ext;
    }

    const result = await cloudinary.uploader.upload(file.path, uploadOptions);

    return {
      fileName: file.originalname,
      originalName: file.originalname,
      url: result.secure_url,
      size: file.size,
      fileSize: file.size,
      mime: file.mimetype || `application/${ext}`,
      type: file.mimetype || `application/${ext}`,
      publicId: result.public_id,
      cloudinaryId: result.public_id,
      format: result.format || ext,
      resourceType: result.resource_type || resourceType,
    };
  } catch (error) {
    logger.error(`[Cloudinary] Upload failed for ${file.originalname}: ${error.message}`, {
      filename: file.originalname,
      error: error.message,
    });
    throw new ApiError(500, `Failed to upload file '${file.originalname}' to cloud storage: ${error.message}`);
  } finally {
    // Safely remove local temp file after upload attempt
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        // Silently continue
      }
    }
  }
};

/**
 * Upload multiple files to Cloudinary in parallel
 *
 * @param {Array<Object>} files - Array of Express Multer file objects
 * @param {string} [folder] - Target folder
 * @returns {Promise<Array<Object>>}
 */
export const uploadMultipleFiles = async (files = [], folder = null) => {
  if (!files || files.length === 0) return [];
  const uploadPromises = files.map((file) => uploadFile(file, folder));
  return Promise.all(uploadPromises);
};

/**
 * Delete a file from Cloudinary by its public ID and resource type
 *
 * @param {string} publicId - Cloudinary public ID
 * @param {string} [resourceType='image'] - Resource type ('image' or 'raw')
 */
export const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    logger.info(`[Cloudinary] Deleted file ${publicId} (result: ${result.result})`);
    return result;
  } catch (error) {
    logger.error(`[Cloudinary] Failed to delete file ${publicId}: ${error.message}`);
    // Do not throw to avoid blocking parent deletions
    return null;
  }
};

/**
 * Deletes multiple files from Cloudinary
 *
 * @param {Array<Object>} files - Array of { publicId, resourceType }
 */
export const deleteMultipleFiles = async (files = []) => {
  if (!files || files.length === 0) return;
  const deletePromises = files.map((f) => deleteFile(f.publicId, f.resourceType || 'image'));
  await Promise.allSettled(deletePromises);
};

/**
 * Fetches a remote file as an HTTP readable stream for dynamic ZIP generation
 *
 * @param {string} url - Secure URL
 * @returns {Promise<import('stream').Readable>}
 */
export const getFileStream = async (url) => {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    timeout: 30000,
  });
  return response.data;
};

export default {
  getResourceType,
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  deleteMultipleFiles,
  getFileStream,
};

