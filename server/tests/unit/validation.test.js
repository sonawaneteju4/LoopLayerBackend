import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRichText } from '../../src/middleware/validation.middleware.js';
import { getResourceType } from '../../src/services/cloudinary.service.js';

test('Sanitization - strips malicious scripts and dangerous tags', () => {
  const dirty = '<p>Hello <b>World</b><script>alert("hacked")</script><img src="x" onerror="steal()"/></p>';
  const clean = sanitizeRichText(dirty);

  assert.ok(!clean.includes('<script>'));
  assert.ok(!clean.includes('alert'));
  assert.ok(!clean.includes('onerror'));
  assert.ok(clean.includes('<b>World</b>'));
});

test('Cloudinary Service - getResourceType maps vector and embroidery files to raw', () => {
  assert.equal(getResourceType('logo.png'), 'image');
  assert.equal(getResourceType('banner.jpg'), 'image');
  assert.equal(getResourceType('vector.svg'), 'image');
  assert.equal(getResourceType('artwork.ai'), 'raw');
  assert.equal(getResourceType('print.eps'), 'raw');
  assert.equal(getResourceType('document.pdf'), 'raw');
  assert.equal(getResourceType('design.dst'), 'raw');
  assert.equal(getResourceType('embroidery.pes'), 'raw');
  assert.equal(getResourceType('bundle.zip'), 'raw');
});

