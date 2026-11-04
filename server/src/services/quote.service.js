import mongoose from 'mongoose';
import archiver from 'archiver';
import Quote from '../models/Quote.js';
import generateRequestId from '../utils/generateRequestId.js';
import cloudinaryService from './cloudinary.service.js';
import mailService from './mail.service.js';
import { sanitizeRichText } from '../middleware/validation.middleware.js';
import { ApiError } from '../utils/response.js';
import logger, { logUpload } from '../utils/logger.js';

/**
 * Helper to query quote by either sequential Request ID (LLD-2026-000001) or MongoDB ObjectId
 */
const findQuoteByIdOrRequestId = async (identifier) => {
  if (!identifier) return null;

  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  const query = isObjectId
    ? { $or: [{ _id: identifier }, { requestId: identifier.toUpperCase() }] }
    : { requestId: identifier.toUpperCase() };

  return Quote.findOne(query);
};

/**
 * Create a new Quote Request with file uploads, atomic ID generation, and notification emails
 */
export const createQuote = async (quoteData, files = []) => {
  // 1. Generate atomic sequential Request ID
  const requestId = await generateRequestId();

  // 2. Upload files to Cloudinary
  let uploadedFilesMetadata = [];
  if (files && files.length > 0) {
    uploadedFilesMetadata = await cloudinaryService.uploadMultipleFiles(files);
  }

  // 3. Normalize Name (handles name or firstName/lastName)
  const fullName = quoteData.name || `${quoteData.firstName || ''} ${quoteData.lastName || ''}`.trim();
  const nameParts = fullName.split(' ');
  const firstName = quoteData.firstName || nameParts[0] || 'Valued';
  const lastName = quoteData.lastName || nameParts.slice(1).join(' ') || 'Customer';

  // 4. Map uploaded files to schema
  const formattedFiles = uploadedFilesMetadata.map((f) => ({
    filename: f.fileName || f.originalName,
    originalName: f.fileName || f.originalName,
    url: f.url,
    size: f.size || f.fileSize,
    fileSize: f.size || f.fileSize,
    type: f.mime || f.type || f.format,
    mime: f.mime || f.type || f.format,
    cloudinaryId: f.publicId,
    publicId: f.publicId,
    format: f.format,
    resourceType: f.resourceType || 'raw',
  }));

  // 5. Assemble Quote Document
  const quote = new Quote({
    requestId,
    customer: {
      firstName,
      lastName,
      email: quoteData.email.toLowerCase().trim(),
      phone: quoteData.phone,
      country: quoteData.country,
    },
    service: quoteData.service || 'Embroidery Digitizing',
    dimensions: {
      width: quoteData.width ? Number(quoteData.width) : null,
      height: quoteData.height ? Number(quoteData.height) : null,
      unit: quoteData.unit || 'in',
    },
    projectRequirements: quoteData.projectRequirements || 'Customer project specifications submitted via website.',
    uploadedFiles: formattedFiles,
    files: formattedFiles,
    status: 'Pending',
  });

  const savedQuote = await quote.save();

  logUpload(requestId, formattedFiles.length, formattedFiles);

  // 6. Send non-blocking notification emails
  // Customer confirmation
  mailService
    .sendQuoteConfirmationToCustomer(savedQuote)
    .catch((err) => logger.error(`[Mail] Async error in customer confirmation: ${err.message}`));

  // Admin alert
  mailService
    .sendQuoteAlertToAdmin(savedQuote)
    .catch((err) => logger.error(`[Mail] Async error in admin quote alert: ${err.message}`));

  return savedQuote;
};

/**
 * Retrieve paginated, filtered, and searchable Quotes for Admin dashboard
 */
export const getQuotes = async ({
  page = 1,
  limit = 10,
  search = '',
  status = '',
  country = '',
  service = '',
  dateFrom = null,
  dateTo = null,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const query = {};

  // Status Filter
  if (status && status !== 'All') {
    query.status = status;
  }

  // Country Filter
  if (country) {
    query['customer.country'] = { $regex: country, $options: 'i' };
  }

  // Service Filter
  if (service) {
    query.service = { $regex: service, $options: 'i' };
  }

  // Date Range Filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) {
      query.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endOfDay;
    }
  }

  // Global Search
  if (search && search.trim() !== '') {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    query.$or = [
      { requestId: searchRegex },
      { 'customer.firstName': searchRegex },
      { 'customer.lastName': searchRegex },
      { 'customer.email': searchRegex },
      { 'customer.country': searchRegex },
      { service: searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  const sortCriteria = { [sortBy]: sortDirection };

  const [quotes, total] = await Promise.all([
    Quote.find(query).sort(sortCriteria).skip(skip).limit(limitNum).lean(),
    Quote.countDocuments(query),
  ]);

  return {
    quotes,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Get quote details by ID or Request ID
 */
export const getQuoteById = async (idOrRequestId) => {
  const quote = await findQuoteByIdOrRequestId(idOrRequestId);
  if (!quote) {
    throw ApiError.notFound(`Quote request '${idOrRequestId}' not found`);
  }
  return quote;
};

/**
 * Update quote status and append internal notes
 */
export const updateQuote = async (idOrRequestId, { status, internalNotes, author = 'Admin' }) => {
  const quote = await findQuoteByIdOrRequestId(idOrRequestId);
  if (!quote) {
    throw ApiError.notFound(`Quote request '${idOrRequestId}' not found`);
  }

  if (status) {
    quote.status = status;
  }

  if (internalNotes && internalNotes.trim()) {
    quote.internalNotes.push({
      note: internalNotes.trim(),
      author,
      createdAt: new Date(),
    });
  }

  await quote.save();
  return quote;
};

/**
 * Delete quote and its associated Cloudinary assets
 */
export const deleteQuote = async (idOrRequestId) => {
  const quote = await findQuoteByIdOrRequestId(idOrRequestId);
  if (!quote) {
    throw ApiError.notFound(`Quote request '${idOrRequestId}' not found`);
  }

  // Asynchronously cleanup files on Cloudinary
  if (quote.uploadedFiles && quote.uploadedFiles.length > 0) {
    cloudinaryService.deleteMultipleFiles(quote.uploadedFiles).catch((err) => {
      logger.error(`[Quote] Error deleting Cloudinary files for ${quote.requestId}: ${err.message}`);
    });
  }

  await Quote.findByIdAndDelete(quote._id);

  logger.info(`[Quote] Deleted quote ${quote.requestId} (${quote._id})`);
  return { requestId: quote.requestId, deleted: true };
};

/**
 * Streams all uploaded files belonging to a quote as a dynamic ZIP archive directly to the client
 */
export const streamQuoteFilesZip = async (idOrRequestId, res) => {
  const quote = await findQuoteByIdOrRequestId(idOrRequestId);
  if (!quote) {
    throw ApiError.notFound(`Quote request '${idOrRequestId}' not found`);
  }

  if (!quote.uploadedFiles || quote.uploadedFiles.length === 0) {
    throw ApiError.badRequest(`Quote '${quote.requestId}' has no uploaded files to download`);
  }

  // Set HTTP headers for dynamic download
  const zipFilename = `${quote.requestId}-files.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  const archive = archiver('zip', {
    zlib: { level: 6 }, // Balanced compression ratio vs CPU usage
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      logger.warn(`[ZIP Archive] Warning while archiving files for ${quote.requestId}: ${err.message}`);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    logger.error(`[ZIP Archive] Error while archiving files for ${quote.requestId}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate ZIP archive', errors: [err.message] });
    }
  });

  // Pipe archive directly into HTTP response stream
  archive.pipe(res);

  // Download and append each file stream into archive
  for (let i = 0; i < quote.uploadedFiles.length; i++) {
    const file = quote.uploadedFiles[i];
    try {
      const stream = await cloudinaryService.getFileStream(file.url);
      const safeFilename = `${i + 1}-${file.originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      archive.append(stream, { name: safeFilename });
    } catch (err) {
      logger.error(`[ZIP Archive] Failed to stream file ${file.originalName} (${file.url}): ${err.message}`);
    }
  }

  await archive.finalize();
};

/**
 * Streams a single uploaded file belonging to a quote directly to the client
 */
export const streamSingleQuoteFile = async (idOrRequestId, fileIdentifier, res) => {
  const quote = await findQuoteByIdOrRequestId(idOrRequestId);
  if (!quote) {
    throw ApiError.notFound(`Quote request '${idOrRequestId}' not found`);
  }

  const allFiles = quote.files?.length > 0 ? quote.files : quote.uploadedFiles || [];
  if (allFiles.length === 0) {
    throw ApiError.notFound(`Quote '${quote.requestId}' has no uploaded files to download`);
  }

  // Find file by _id, publicId, cloudinaryId, or filename
  const targetFile = allFiles.find(
    (f) =>
      f._id?.toString() === fileIdentifier ||
      f.publicId === fileIdentifier ||
      f.cloudinaryId === fileIdentifier ||
      f.filename === fileIdentifier ||
      f.originalName === fileIdentifier
  );

  if (!targetFile) {
    throw ApiError.notFound(`File '${fileIdentifier}' not found on quote '${quote.requestId}'`);
  }

  const filename = targetFile.filename || targetFile.originalName || 'downloaded-file';
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', targetFile.type || targetFile.mime || 'application/octet-stream');

  const fileStream = await cloudinaryService.getFileStream(targetFile.url);
  fileStream.pipe(res);
};

/**
 * Send an email directly to the customer from the dashboard and record in Quote email history
 */
export const sendCustomerReply = async (idOrRequestId, { subject, message, attachments = [], sentBy = 'Admin' }) => {
  const quote = await findQuoteByIdOrRequestId(idOrRequestId);
  if (!quote) {
    throw ApiError.notFound(`Quote request '${idOrRequestId}' not found`);
  }

  const cleanMessage = sanitizeRichText(message);

  // Dispatch email
  const emailResult = await mailService.sendDirectCustomerEmail({
    to: quote.customer.email,
    subject: `Re: [${quote.requestId}] ${subject}`,
    richTextMessage: cleanMessage,
    attachments,
  });

  // Record in Quote email history
  quote.emailHistory.push({
    subject,
    message: cleanMessage,
    recipient: quote.customer.email,
    attachments,
    sentBy,
    sentAt: new Date(),
    messageId: emailResult.messageId || null,
  });

  await quote.save();

  return {
    quote,
    emailResult,
  };
};

export default {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  deleteQuote,
  streamQuoteFilesZip,
  streamSingleQuoteFile,
  sendCustomerReply,
};

