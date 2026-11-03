import test from 'node:test';
import assert from 'node:assert/strict';

import renderQuoteConfirmation from '../../src/templates/quoteConfirmation.template.js';
import renderQuoteNotification from '../../src/templates/quoteNotification.template.js';
import renderContactConfirmation from '../../src/templates/contactConfirmation.template.js';
import renderContactNotification from '../../src/templates/contactNotification.template.js';
import renderAdminReply from '../../src/templates/reply.template.js';

const mockQuote = {
  _id: '672740a1b2c3d4e5f6a7b8e2',
  requestId: 'LLD-2026-000042',
  customer: {
    firstName: 'Marcus',
    lastName: 'Vance',
    email: 'marcus@example.com',
    phone: '+1 555-0142',
    country: 'United States',
  },
  service: 'Embroidery Digitizing',
  dimensions: { width: 3.5, height: 2.5, unit: 'in' },
  projectRequirements: 'Left chest jacket placement, high stitch density for fleece fabric.',
  uploadedFiles: [
    {
      publicId: 'looplayer/quotes/sample_vector',
      url: 'https://res.cloudinary.com/demo/raw/upload/v1/sample.dst',
      originalName: 'company_logo.dst',
      fileSize: 52400,
      format: 'dst',
      resourceType: 'raw',
    },
  ],
  createdAt: new Date('2026-11-03T10:00:00.000Z'),
};

const mockContact = {
  _id: '672740a1b2c3d4e5f6a7b8f9',
  name: 'Elena Rostova',
  email: 'elena@example.com',
  phone: '+44 20 7946 0991',
  subject: 'Custom Patches for Cycling Club',
  message: 'Can you provide turnaround time and bulk discounts for 200 hook-and-loop embroidered patches?',
  createdAt: new Date('2026-11-03T11:00:00.000Z'),
};

test('Email Template - Customer Quote Confirmation formatting & content', () => {
  const result = renderQuoteConfirmation(mockQuote);

  assert.equal(result.subject, "We've Received Your Project Request [LLD-2026-000042]");
  assert.ok(result.html.includes('Hello Marcus,'));
  assert.ok(result.html.includes('LLD-2026-000042'));
  assert.ok(result.html.includes('Embroidery Digitizing'));
  assert.ok(result.html.includes('Visit Website'));
  assert.ok(result.html.includes('Nagpur, Maharashtra'));
  assert.ok(result.html.includes('orders@looplayerdesing.com'));

  // Ensure header uses typography only, NO img logo
  assert.ok(result.html.includes('Loop<span style="color: #2563EB;">Layer</span>'));
  assert.ok(!result.html.includes('<img'));
});

test('Email Template - Admin Quote Notification formatting & specs', () => {
  const result = renderQuoteNotification(mockQuote);

  assert.equal(result.subject, 'New Quote Request — LLD-2026-000042');
  assert.ok(result.html.includes('Marcus Vance'));
  assert.ok(result.html.includes('marcus@example.com'));
  assert.ok(result.html.includes('+1 555-0142'));
  assert.ok(result.html.includes('United States'));
  assert.ok(result.html.includes('company_logo.dst'));
  assert.ok(result.html.includes('Open In Dashboard'));
});

test('Email Template - Customer Contact Confirmation', () => {
  const result = renderContactConfirmation(mockContact);

  assert.equal(result.subject, "We've Received Your Message");
  assert.ok(result.html.includes('Hello Elena Rostova,'));
  assert.ok(result.html.includes('one business day'));
  assert.ok(result.html.includes('Custom Patches for Cycling Club'));
  assert.ok(result.html.includes('Visit Website'));
});

test('Email Template - Admin Contact Notification', () => {
  const result = renderContactNotification(mockContact);

  assert.ok(result.subject.includes('New Contact Inquiry — Elena Rostova'));
  assert.ok(result.html.includes('Elena Rostova'));
  assert.ok(result.html.includes('elena@example.com'));
  assert.ok(result.html.includes('View & Reply in Dashboard'));
});

test('Email Template - Admin Reply with conversation thread', () => {
  const result = renderAdminReply({
    recipientName: 'Marcus Vance',
    subject: 'Update on your digitizing proof',
    message: '<p>Your stitch map has been prepared and approved by our head digitizer.</p>',
    referenceId: 'LLD-2026-000042',
    threadHistory: [
      {
        author: 'Marcus Vance',
        role: 'customer',
        message: 'Could you make sure the satin stitch edges are sharp?',
        date: new Date('2026-11-03T09:00:00.000Z'),
      },
    ],
    attachments: [
      {
        filename: 'proof_sample.pdf',
        url: 'https://res.cloudinary.com/demo/raw/upload/v1/proof.pdf',
        size: 1048576,
      },
    ],
  });

  assert.ok(result.subject.includes('[LLD-2026-000042] Update on your digitizing proof'));
  assert.ok(result.html.includes('Hello Marcus Vance,'));
  assert.ok(result.html.includes('Your stitch map has been prepared'));
  assert.ok(result.html.includes('proof_sample.pdf'));
  assert.ok(result.html.includes('Previous Conversation History'));
  assert.ok(result.html.includes('Could you make sure the satin stitch edges are sharp?'));
});

