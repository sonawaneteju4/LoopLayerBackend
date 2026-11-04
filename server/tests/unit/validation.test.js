import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRichText } from '../../src/middleware/validation.middleware.js';
import { getResourceType } from '../../src/services/cloudinary.service.js';
import { mongoSanitize, xssClean } from '../../src/middleware/sanitization.middleware.js';
import env from '../../src/config/env.js';

test('Sanitization - strips malicious scripts and dangerous tags', () => {
  const dirty = '<p>Hello <b>World</b><script>alert("hacked")</script><img src="x" onerror="steal()"/></p>';
  const clean = sanitizeRichText(dirty);

  assert.ok(!clean.includes('<script>'));
  assert.ok(!clean.includes('alert'));
  assert.ok(!clean.includes('onerror'));
  assert.ok(clean.includes('<b>World</b>'));
});

test('Security - Mongo sanitization strips NoSQL injection operator keys', () => {
  const req = {
    body: {
      username: 'admin',
      $where: 'sleep(5000)',
      nested: { $gt: '', safe: 'value', 'bad.field': 123 },
    },
    query: { 'search.field': 'evil', safeQuery: 'ok' },
    params: { id: 'LLD-2026-000001' },
  };

  mongoSanitize(req, {}, () => {});

  assert.equal(req.body.$where, undefined);
  assert.equal(req.body.nested.$gt, undefined);
  assert.equal(req.body.nested['bad.field'], undefined);
  assert.equal(req.body.nested.safe, 'value');
  assert.equal(req.query['search.field'], undefined);
  assert.equal(req.query.safeQuery, 'ok');
});

test('Security - XSS Clean strips script injections from inputs', () => {
  const req = {
    body: {
      name: 'John <script>alert(1)</script>',
      email: 'john@example.com',
      nested: { note: 'Note <img src=x onerror=alert(2) />' },
    },
    query: {},
  };

  xssClean(req, {}, () => {});

  assert.equal(req.body.name, 'John');
  assert.equal(req.body.email, 'john@example.com');
  assert.equal(req.body.nested.note, 'Note');
});

test('Cloudinary Service - getResourceType accurately maps raster images vs raw embroidery/vector formats', () => {
  // Raster images
  assert.equal(getResourceType('logo.png'), 'image');
  assert.equal(getResourceType('banner.jpg'), 'image');
  assert.equal(getResourceType('photo.jpeg'), 'image');
  assert.equal(getResourceType('vector.svg'), 'image');
  assert.equal(getResourceType('graphic.tiff'), 'image');

  // Binary Embroidery, Vector, PSD, Archive files
  assert.equal(getResourceType('design.dst'), 'raw');
  assert.equal(getResourceType('stitch.emb'), 'raw');
  assert.equal(getResourceType('pattern.pes'), 'raw');
  assert.equal(getResourceType('machine.exp'), 'raw');
  assert.equal(getResourceType('janome.jef'), 'raw');
  assert.equal(getResourceType('pfaff.vp3'), 'raw');
  assert.equal(getResourceType('viking.hus'), 'raw');
  assert.equal(getResourceType('artwork.ai'), 'raw');
  assert.equal(getResourceType('print.eps'), 'raw');
  assert.equal(getResourceType('layers.psd'), 'raw');
  assert.equal(getResourceType('document.pdf'), 'raw');
  assert.equal(getResourceType('bundle.zip'), 'raw');
  assert.equal(getResourceType('archive.rar'), 'raw');
});

test('Upload Configuration - all required embroidery and vector formats are whitelisted', () => {
  const requiredExtensions = [
    'dst', 'emb', 'pes', 'exp', 'jef', 'vp3', 'hus',
    'pdf', 'ai', 'eps', 'svg', 'png', 'jpg', 'jpeg',
    'psd', 'zip', 'rar', 'tiff'
  ];

  for (const ext of requiredExtensions) {
    assert.ok(
      env.UPLOAD.ALLOWED_EXTENSIONS.includes(ext),
      `Extension '${ext}' should be in ALLOWED_EXTENSIONS`
    );
  }
});

