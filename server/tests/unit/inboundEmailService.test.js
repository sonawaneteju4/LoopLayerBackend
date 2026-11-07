import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSender,
  normalizeRecipients,
  verifyWebhookSignature,
} from '../../src/services/inboundEmail.service.js';

test('Inbound Email - parseSender extracts email and name correctly', () => {
  // RFC 2822 format with display name
  const res1 = parseSender('Jane Doe <jane.doe@example.com>');
  assert.equal(res1.fromEmail, 'jane.doe@example.com');
  assert.equal(res1.fromName, 'Jane Doe');

  // Quoted display name
  const res2 = parseSender('"Smith, Bob" <bob.smith@company.org>');
  assert.equal(res2.fromEmail, 'bob.smith@company.org');
  assert.equal(res2.fromName, 'Smith, Bob');

  // Bare email without name
  const res3 = parseSender('orders@looplayerdesign.com');
  assert.equal(res3.fromEmail, 'orders@looplayerdesign.com');
  assert.equal(res3.fromName, '');

  // Object structure
  const res4 = parseSender({ email: 'client@domain.com', name: 'Studio Client' });
  assert.equal(res4.fromEmail, 'client@domain.com');
  assert.equal(res4.fromName, 'Studio Client');
});

test('Inbound Email - normalizeRecipients formats array and comma strings', () => {
  const list1 = ['team@looplayerdesign.com', 'Dev <dev@looplayerdesign.com>'];
  const res1 = normalizeRecipients(list1);
  assert.deepEqual(res1, ['team@looplayerdesign.com', 'dev@looplayerdesign.com']);

  const str1 = 'a@domain.com, b@domain.com, invalid-email';
  const res2 = normalizeRecipients(str1);
  assert.deepEqual(res2, ['a@domain.com', 'b@domain.com']);
});

test('Inbound Email - verifyWebhookSignature gracefully skips when secret not set', () => {
  const result = verifyWebhookSignature({
    headers: {},
    rawBody: { test: true },
  });
  assert.equal(result.valid, true);
  assert.equal(result.skipped, true);
});
