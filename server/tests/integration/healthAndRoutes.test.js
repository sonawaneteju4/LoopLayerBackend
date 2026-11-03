import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';

test('Integration - GET /health returns 200 operational status with deep metrics', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.status);
  assert.ok(res.body.data.dependencies.database);
  assert.ok(res.body.data.dependencies.smtp);
  assert.ok(res.body.data.system.memory);
  assert.ok(res.body.data.uptime);
});

test('Integration - GET /health/live returns fast 200 liveness', async () => {
  const res = await request(app).get('/health/live');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, 'ALIVE');
});

test('Integration - GET /api/health/ready returns readiness payload', async () => {
  const res = await request(app).get('/api/health/ready');
  assert.ok(res.status === 200 || res.status === 503);
  assert.ok(res.body.data.status);
});

test('Integration - GET /api/health returns 200 operational status', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('Integration - GET /unknown-route triggers standardized 404', async () => {
  const res = await request(app).get('/api/unknown-endpoint-xyz');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.ok(Array.isArray(res.body.errors));
});

test('Integration - Protected admin endpoint rejects request without Bearer token', async () => {
  const res = await request(app).get('/api/admin/dashboard');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('Integration - Direct /quotes/:id route rejects request without Bearer token', async () => {
  const res = await request(app).get('/quotes/LLD-2026-000001');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('Integration - POST /api/contact validation rejects empty body', async () => {
  const res = await request(app).post('/api/contact').send({});
  assert.equal(res.status, 422);
  assert.equal(res.body.success, false);
  assert.ok(res.body.errors.length > 0);
});

test('Integration - POST /api/auth/login validation rejects empty credentials', async () => {
  const res = await request(app).post('/api/auth/login').send({});
  assert.equal(res.status, 422);
  assert.equal(res.body.success, false);
  assert.ok(res.body.errors.length > 0);
});

