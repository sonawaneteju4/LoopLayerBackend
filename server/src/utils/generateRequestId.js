import Counter from '../models/Counter.js';

/**
 * Generate a sequential, atomic Request ID in format: LLD-YYYY-XXXXXX
 * (e.g., LLD-2026-000001)
 *
 * Guarantees zero race conditions under concurrent requests using MongoDB atomic findOneAndUpdate.
 *
 * @param {number|string} [targetYear] - Optional override year
 * @returns {Promise<string>} Sequential Request ID
 */
export const generateRequestId = async (targetYear) => {
  const year = targetYear || new Date().getFullYear();
  const counterId = `quote_request_${year}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const paddedSequence = String(counter.seq).padStart(6, '0');
  return `LLD-${year}-${paddedSequence}`;
};

export default generateRequestId;

