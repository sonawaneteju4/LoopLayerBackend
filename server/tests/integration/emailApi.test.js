import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';

test('Integration - GET /api/admin/emails is protected and rejects unauthorized requests', async () => {
  const res = await request(app).get('/api/admin/emails');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('Integration - GET /api/admin/settings/smtp-status is protected', async () => {
  const res = await request(app).get('/api/admin/settings/smtp-status');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('Integration - POST /api/admin/emails/send rejects unauthenticated requests', async () => {
  const res = await request(app)
    .post('/api/admin/emails/send')
    .send({
      to: 'client@example.com',
      subject: 'Hello',
      message: 'Test message',
    });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('Integration - POST /api/admin/emails/preview rejects unauthenticated requests', async () => {
  const res = await request(app)
    .post('/api/admin/emails/preview')
    .send({
      type: 'quote_confirmation',
      data: {},
    });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

