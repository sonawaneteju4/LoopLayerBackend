import test from 'node:test';
import assert from 'node:assert/strict';
import Quote from '../../src/models/Quote.js';
import env from '../../src/config/env.js';
import { quoteLimiter } from '../../src/middleware/rateLimiter.middleware.js';

test('Quote Model - schema enforces required fields and files array structure', () => {
  const quoteDoc = new Quote({
    requestId: 'LLD-2026-000099',
    customer: {
      firstName: 'Samantha',
      lastName: 'Reed',
      email: 'samantha@example.com',
      phone: '+1 234 567 8901',
      country: 'Canada',
    },
    service: 'Vector Artwork',
    projectRequirements: 'High-res vector conversion for direct-to-film printing.',
    uploadedFiles: [
      {
        filename: 'artwork.ai',
        originalName: 'artwork.ai',
        url: 'https://res.cloudinary.com/looplayer/raw/upload/v1/artwork.ai',
        size: 1048576,
        fileSize: 1048576,
        type: 'application/illustrator',
        mime: 'application/illustrator',
        cloudinaryId: 'looplayer/raw/artwork',
        publicId: 'looplayer/raw/artwork',
        format: 'ai',
        resourceType: 'raw',
      },
    ],
    files: [
      {
        filename: 'artwork.ai',
        originalName: 'artwork.ai',
        url: 'https://res.cloudinary.com/looplayer/raw/upload/v1/artwork.ai',
        size: 1048576,
        fileSize: 1048576,
        type: 'application/illustrator',
        mime: 'application/illustrator',
        cloudinaryId: 'looplayer/raw/artwork',
        publicId: 'looplayer/raw/artwork',
        format: 'ai',
        resourceType: 'raw',
      },
    ],
    status: 'Pending',
  });

  const validationError = quoteDoc.validateSync();
  assert.equal(validationError, undefined);

  // Verify structure
  assert.equal(quoteDoc.requestId, 'LLD-2026-000099');
  assert.equal(quoteDoc.customer.country, 'Canada');
  assert.equal(quoteDoc.customer.phone, '+1 234 567 8901');
  assert.equal(quoteDoc.files.length, 1);
  assert.equal(quoteDoc.files[0].filename, 'artwork.ai');
  assert.equal(quoteDoc.files[0].url, 'https://res.cloudinary.com/looplayer/raw/upload/v1/artwork.ai');
  assert.equal(quoteDoc.files[0].size, 1048576);
  assert.equal(quoteDoc.files[0].type, 'application/illustrator');
  assert.equal(quoteDoc.files[0].cloudinaryId, 'looplayer/raw/artwork');
});

test('Quote Model - rejects missing required customer fields (country, phone, email, name)', () => {
  const invalidQuote = new Quote({
    requestId: 'LLD-2026-000100',
    customer: {}, // Missing all customer details
    service: 'Embroidery Digitizing',
    projectRequirements: 'Test',
  });

  const err = invalidQuote.validateSync();
  assert.ok(err);
  assert.ok(err.errors['customer.firstName']);
  assert.ok(err.errors['customer.email']);
  assert.ok(err.errors['customer.phone']);
  assert.ok(err.errors['customer.country']);
});

test('Rate Limiter - Quote Limiter configuration adheres to 20 requests per 15 minutes', () => {
  assert.equal(env.RATE_LIMIT.PUBLIC_MAX, 20);
  assert.equal(env.RATE_LIMIT.PUBLIC_WINDOW_MS, 15 * 60 * 1000);
});

test('File Upload Specs - Max 10 files and 20MB limit enforced in config', () => {
  assert.equal(env.UPLOAD.MAX_FILE_COUNT, 10);
  assert.equal(env.UPLOAD.MAX_FILE_SIZE_MB, 20);
});

