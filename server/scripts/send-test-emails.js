import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  sendQuoteConfirmation,
  sendQuoteNotification,
  sendContactConfirmation,
  sendReplyEmail,
} from '../src/services/mail.service.js';

const TEST_RECIPIENT = 'sonawaneteju4@gmail.com';

async function run() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      console.log('Connected to MongoDB for logging.');
    } catch {
      console.log('MongoDB connection skipped/timed out; proceeding with direct SES dispatch.');
    }
  }

  console.log(`Starting test email dispatch to: ${TEST_RECIPIENT} using AWS SES...`);

  // 1. Quote Confirmation Test (with Rush Order & "soon")
  console.log('\n--- 1. Sending Test Quote Confirmation (With Rush & "soon") ---');
  const quoteResult = await sendQuoteConfirmation({
    requestId: 'LLD-2026-000025',
    service: 'Embroidery Digitizing',
    turnaround: 'Rush (4-6 hrs)',
    isRush: true,
    createdAt: new Date(),
    customer: {
      firstName: 'Swapnil',
      lastName: '',
      email: TEST_RECIPIENT,
      phone: '+91 8087720342',
      country: 'India',
    },
    dimensions: {
      width: 3.5,
      height: 2.5,
      unit: 'in',
    },
    uploadedFiles: [
      {
        filename: 'left-chest-logo.ai',
        size: 145000,
      },
    ],
    projectRequirements:
      'Left chest embroidery digitizing for performance polo shirts. 3.5 inches wide, optimized underlay for pique knit. Need Rush turnaround.',
  });
  console.log('Quote Confirmation result:', quoteResult);

  // 2. Contact Confirmation Test (with "soon")
  console.log('\n--- 2. Sending Test Contact Confirmation (With "soon") ---');
  const contactResult = await sendContactConfirmation({
    _id: new mongoose.Types.ObjectId(),
    name: 'Swapnil',
    email: TEST_RECIPIENT,
    phone: '+91 8087720342',
    subject: 'Vector Artwork Conversion Request',
    message:
      'Hi LoopLayer Team, I need high-precision vector tracing of a raster emblem for silk screen printing.',
    createdAt: new Date(),
  });
  console.log('Contact Confirmation result:', contactResult);

  // 3. Custom Mail / Admin Reply Test (Artwork Received & Digitizer Review Initiated - verifying no &amp;)
  console.log('\n--- 3. Sending Test Custom Studio Email (Subject: Artwork Received & Digitizer Review Initiated) ---');
  const customResult = await sendReplyEmail({
    to: TEST_RECIPIENT,
    recipientName: 'Swapnil',
    subject: 'Artwork Received & Digitizer Review Initiated - LoopLayer Design',
    message:
      'Dear Swapnil,\n\nThank you for submitting your project specifications to LoopLayer Design (Ref: LLD-2026-000025).\n\nOur master digitizers and embroidery specialists are reviewing your artwork, stitch density requirements, and substrate compatibility. You can expect a complete technical breakdown and turnaround confirmation soon.\n\nShould you need to supply updated vector files or pantone specifications in the interim, simply reply directly to this email.',
    attachments: [
      {
        filename: 'LLD-2026-000025-Production-Proof.dst',
        size: 84200,
        content: Buffer.from('LoopLayer Test DST binary content').toString('base64'),
      },
    ],
    relatedId: 'LLD-2026-000025',
    relatedType: 'Quote',
    sentBy: 'Team LoopLayer Design',
  });
  console.log('Custom Mail result:', customResult);

  // 4. Admin Rush Order Notification Alert
  console.log('\n--- 4. Sending Admin Rush Alert to ' + TEST_RECIPIENT + ' ---');
  const adminRushResult = await sendQuoteNotification({
    requestId: 'LLD-2026-000025',
    service: 'Embroidery Digitizing',
    turnaround: 'Rush (4-6 hrs)',
    isRush: true,
    createdAt: new Date(),
    customer: {
      firstName: 'Swapnil',
      lastName: '',
      email: 'client@example.com',
      phone: '+91 8087720342',
      country: 'India',
    },
    dimensions: {
      width: 3.5,
      height: 2.5,
      unit: 'in',
    },
    uploadedFiles: [
      {
        filename: 'urgent-jacket-back.ai',
        size: 512000,
        url: 'https://res.cloudinary.com/demo/sample.ai',
      },
    ],
    projectRequirements: 'URGENT: Machine on shop floor waiting for this punch. Jacket back 10 inches wide.',
  });
  console.log('Admin Rush Alert result:', adminRushResult);

  console.log('\n=== ALL TEST EMAILS SENT SUCCESSFULLY TO ' + TEST_RECIPIENT + ' ===');
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('Test dispatch failed:', err);
  process.exit(1);
});
