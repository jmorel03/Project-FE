const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
process.env.ADMIN_CLIENT_URL = process.env.ADMIN_CLIENT_URL || 'http://localhost:5174';
process.env.ADMIN_IP_ALLOWLIST = '';

const app = require('../src/app');

test('CSRF origin guard blocks refresh requests without Origin/Referer', async () => {
  const res = await request(app)
    .post('/api/auth/refresh')
    .send({});

  assert.equal(res.status, 403);
  assert.equal(res.body?.error, 'Request origin not allowed');
});

test('CSRF origin guard allows trusted origin and reaches refresh handler', async () => {
  const res = await request(app)
    .post('/api/auth/refresh')
    .set('Origin', process.env.CLIENT_URL)
    .send({});

  // No cookie is sent in this test, so controller should reject with 401.
  assert.equal(res.status, 401);
  assert.equal(res.body?.error, 'Refresh token is required');
});

test('CSRF origin guard blocks login without Origin/Referer', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@example.com', password: 'bad-pass' });

  assert.equal(res.status, 403);
  assert.equal(res.body?.error, 'Request origin not allowed');
});

test('CSRF origin guard blocks register without Origin/Referer', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'new@example.com',
      password: 'StrongPass1!',
      firstName: 'New',
      lastName: 'User',
    });

  assert.equal(res.status, 403);
  assert.equal(res.body?.error, 'Request origin not allowed');
});

test('Admin auth limiter throttles after 5 attempts per window', async () => {
  for (let i = 0; i < 5; i += 1) {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({});

    // Validator fails because request body is intentionally incomplete.
    assert.equal(res.status, 422);
  }

  const blocked = await request(app)
    .post('/api/admin/auth/login')
    .send({});

  assert.equal(blocked.status, 429);
  assert.equal(blocked.body?.error, 'Too many admin auth attempts, please try again later.');
});
