import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  sendQuoteConfirmation,
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

  // 1. Quote Confirmation Test
  console.log('\n--- 1. Sending Test Quote Confirmation ---');
  const quoteResult = await sendQuoteConfirmation({
    requestId: 'LLD-2026-000019',
    service: 'Embroidery Digitizing',
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
      'Left chest embroidery digitizing for performance polo shirts. 3.5 inches wide, optimized underlay for pique knit.',
  });
  console.log('Quote Confirmation result:', quoteResult);

  // 2. Contact Confirmation Test
  console.log('\n--- 2. Sending Test Contact Confirmation ---');
  const contactResult = await sendContactConfirmation({
    _id: new mongoose.Types.ObjectId(),
    name: 'Swapnil',
    email: TEST_RECIPIENT,
    phone: '+91 8087720342',
    subject: 'Vector Artwork Conversion Request',
    message:
      'Hi LoopLayer Team, I need high-precision vector tracing of a raster emblem for silk screen printing. Looking for 24hr turnaround.',
    createdAt: new Date(),
  });
  console.log('Contact Confirmation result:', contactResult);

  // 3. Custom Mail (Admin Reply) Test
  console.log('\n--- 3. Sending Test Custom Studio Email ---');
  const customResult = await sendReplyEmail({
    to: TEST_RECIPIENT,
    recipientName: 'Swapnil',
    subject: 'Project Update: Stitch Calibration Complete',
    message:
      'Hi Swapnil,\n\nWe have completed the stitch density calibration and underlay pathing for inquiry LLD-2026-000019. The digital sewout proof is verified with zero puckering.\n\nYour production-ready master .DST file and needle sequence tech sheet are attached.\n\nPlease review and let us know if you need any adjustments.',
    attachments: [
      {
        filename: 'LLD-2026-000019-Production-Proof.dst',
        size: 84200,
        content: Buffer.from('LoopLayer Test DST binary content').toString('base64'),
      },
    ],
    relatedId: 'LLD-2026-000019',
    relatedType: 'Quote',
    sentBy: 'Team LoopLayer Design',
  });
  console.log('Custom Mail result:', customResult);

  console.log('\n=== ALL 3 TEST EMAILS SENT SUCCESSFULLY TO ' + TEST_RECIPIENT + ' ===');
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('Test dispatch failed:', err);
  process.exit(1);
});
