import test from 'node:test';
import assert from 'node:assert/strict';
import { getSMTPDiagnostics, previewEmail } from '../../src/services/mail.service.js';

test('Email Service - getSMTPDiagnostics masks credentials safely', () => {
  const diag = getSMTPDiagnostics();

  assert.ok(diag.status);
  assert.ok(diag.host.includes('zoho'));
  assert.equal(diag.port, 465);
  assert.equal(diag.secure, true);
  // Email should be masked
  assert.ok(diag.user.includes('****'));
  assert.ok(!diag.user.includes('orders@looplayerdesign.com') || diag.user.startsWith('or****'));
});

test('Email Service - previewEmail renders multiple template types', () => {
  const quotePreview = previewEmail({
    type: 'quote_confirmation',
    data: {
      requestId: 'LLD-2026-999999',
      customer: { firstName: 'Sarah' },
      service: 'Vector Art Conversion',
    },
  });

  assert.ok(quotePreview.subject.includes('LLD-2026-999999'));
  assert.ok(quotePreview.html.includes('Sarah'));

  const contactPreview = previewEmail({
    type: 'contact_confirmation',
    data: {
      name: 'Michael',
      subject: 'Inquiry',
      message: 'Hello world',
    },
  });

  assert.ok(contactPreview.subject.includes("We've Received Your Message"));
  assert.ok(contactPreview.html.includes('Michael'));

  const replyPreview = previewEmail({
    type: 'admin_reply',
    data: {
      recipientName: 'David',
      subject: 'Custom Quote Discussion',
      message: 'Please review our offer',
    },
  });

  assert.ok(replyPreview.subject.includes('Custom Quote Discussion'));
  assert.ok(replyPreview.html.includes('Please review our offer'));
});

