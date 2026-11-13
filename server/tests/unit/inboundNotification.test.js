import test from 'node:test';
import assert from 'node:assert/strict';
import renderInboundEmailNotification from '../../src/templates/inboundEmailNotification.template.js';
import sseService from '../../src/services/sse.service.js';
import InboundEmail from '../../src/models/InboundEmail.js';

test('Inbound Email Notification Template - formats admin alert email correctly', () => {
  const mockEmail = {
    _id: '672b1234abcd5678ef901234',
    fromName: 'John Smith',
    fromEmail: 'john.smith@example.com',
    toEmail: ['orders@looplayerdesign.com'],
    subject: 'Embroidery digitizing inquiry for jacket backs',
    textBody: 'Hi LoopLayer team, I need a quote for a 10-inch jacket back embroidery design. Attached is my artwork.',
    receivedAt: new Date('2026-11-13T10:30:00Z'),
    attachments: [{ filename: 'artwork.png', size: 102400 }],
  };

  const rendered = renderInboundEmailNotification(mockEmail);

  // Assert Subject line requirement
  assert.equal(rendered.subject, 'New Email Received - LoopLayer Designs');

  // Assert content requirements
  assert.ok(rendered.html.includes('John Smith'));
  assert.ok(rendered.html.includes('john.smith@example.com'));
  assert.ok(rendered.html.includes('Embroidery digitizing inquiry for jacket backs'));
  assert.ok(rendered.html.includes('Open in Admin Dashboard'));
  assert.ok(rendered.html.includes('/admin/inbox/672b1234abcd5678ef901234'));

  // Assert plain text fallback contains sender, subject, and dashboard link
  assert.ok(rendered.text.includes('From: John Smith <john.smith@example.com>'));
  assert.ok(rendered.text.includes('Subject: Embroidery digitizing inquiry for jacket backs'));
  assert.ok(rendered.text.includes('/admin/inbox/672b1234abcd5678ef901234'));
});

test('SSE Service - manages client pool and broadcasts events safely', () => {
  let writtenData = '';
  const mockReq = {
    headers: {},
    admin: { _id: 'admin_123' },
    on: (event, handler) => {},
  };
  const mockRes = {
    writeHead: () => {},
    write: (chunk) => {
      writtenData += chunk;
    },
    flushHeaders: () => {},
  };

  const initialCount = sseService.getClientCount();
  sseService.addClient(mockReq, mockRes);
  assert.equal(sseService.getClientCount(), initialCount + 1);

  // Broadcast test event
  writtenData = '';
  sseService.broadcast('NEW_EMAIL', {
    email: { _id: '123', subject: 'Test Subject' },
  });

  assert.ok(writtenData.includes('event: NEW_EMAIL'));
  assert.ok(writtenData.includes('"subject":"Test Subject"'));
});

test('InboundEmail Model - virtual aliases for to, text, html', () => {
  const email = new InboundEmail({
    messageId: '<test-virtuals@resend.com>',
    fromEmail: 'client@example.com',
    toEmail: ['orders@looplayerdesign.com'],
    subject: 'Virtual Test',
    textBody: 'Plain text message',
    htmlBody: '<p>HTML content</p>',
    attachments: [{ filename: 'file.pdf', size: 500, mime: 'application/pdf' }],
  });

  assert.deepEqual(email.to, ['orders@looplayerdesign.com']);
  assert.equal(email.text, 'Plain text message');
  assert.equal(email.html, '<p>HTML content</p>');
  assert.equal(email.attachments[0].type, 'application/pdf');
});
