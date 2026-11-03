import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, sendSuccess, sendError } from '../../src/utils/response.js';

test('Response Utility - ApiError class structure', () => {
  const badReq = ApiError.badRequest('Invalid parameter', ['param is required']);
  assert.equal(badReq.statusCode, 400);
  assert.equal(badReq.message, 'Invalid parameter');
  assert.deepEqual(badReq.errors, ['param is required']);
  assert.equal(badReq.isOperational, true);

  const unauthorized = ApiError.unauthorized();
  assert.equal(unauthorized.statusCode, 401);

  const notFound = ApiError.notFound('Resource missing');
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.message, 'Resource missing');
});

test('Response Utility - sendSuccess formatter', () => {
  let statusSet = null;
  let jsonSent = null;

  const mockRes = {
    status: (code) => {
      statusSet = code;
      return mockRes;
    },
    json: (payload) => {
      jsonSent = payload;
      return mockRes;
    },
  };

  sendSuccess(mockRes, 201, 'Entity created', { id: 123 });

  assert.equal(statusSet, 201);
  assert.deepEqual(jsonSent, {
    success: true,
    message: 'Entity created',
    data: { id: 123 },
  });
});

test('Response Utility - sendError formatter', () => {
  let statusSet = null;
  let jsonSent = null;

  const mockRes = {
    status: (code) => {
      statusSet = code;
      return mockRes;
    },
    json: (payload) => {
      jsonSent = payload;
      return mockRes;
    },
  };

  sendError(mockRes, 422, 'Validation failed', ['Field required']);

  assert.equal(statusSet, 422);
  assert.deepEqual(jsonSent, {
    success: false,
    message: 'Validation failed',
    errors: ['Field required'],
  });
});

