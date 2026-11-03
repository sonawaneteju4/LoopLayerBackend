import quoteService from '../services/quote.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Public Quote Controller
 */
export const submitQuote = async (req, res, next) => {
  try {
    const quote = await quoteService.createQuote(req.body, req.files);
    return sendSuccess(
      res,
      201,
      'Your quote request has been submitted successfully. A confirmation email has been sent.',
      {
        requestId: quote.requestId,
        status: quote.status,
        service: quote.service,
        createdAt: quote.createdAt,
        fileCount: quote.uploadedFiles.length,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Direct file ZIP download (accessible if needed)
 */
export const downloadQuoteZip = async (req, res, next) => {
  try {
    const { id } = req.params;
    await quoteService.streamQuoteFilesZip(id, res);
  } catch (error) {
    next(error);
  }
};

export default {
  submitQuote,
  downloadQuoteZip,
};

