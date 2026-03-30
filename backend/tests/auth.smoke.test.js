const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
process.env.ADMIN_CLIENT_URL = process.env.ADMIN_CLIENT_URL || 'http://localhost:5174';

const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const ORIGIN = process.env.CLIENT_URL;

function randomEmail() {
  const id = crypto.randomBytes(6).toString('hex');
  return `smoke-${id}@example.com`;
}

test('auth smoke: register, login, refresh, logout works with trusted origin', async () => {
  const email = randomEmail();
  const password = 'StrongPass1!';
  const agent = request.agent(app);

  try {
    const registerRes = await agent
      .post('/api/auth/register')
      .set('Origin', ORIGIN)
      .send({
        email,
        password,
        firstName: 'Smoke',
        lastName: 'Tester',
      });

    assert.equal(registerRes.status, 201);
    assert.equal(typeof registerRes.body?.accessToken, 'string');
    assert.ok(registerRes.headers['set-cookie']?.some((c) => c.includes('refreshToken=')));

    const refreshFromRegister = await agent
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .send({});

    assert.equal(refreshFromRegister.status, 200);
    assert.equal(typeof refreshFromRegister.body?.accessToken, 'string');

    const loginRes = await agent
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password });

    assert.equal(loginRes.status, 200);
    assert.equal(typeof loginRes.body?.accessToken, 'string');

    const logoutRes = await agent
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({});

    assert.equal(logoutRes.status, 200);

    const refreshAfterLogout = await agent
      .post('/api/auth/refresh')
      .set('Origin', ORIGIN)
      .send({});

    assert.equal(refreshAfterLogout.status, 401);
  } finally {
    await prisma.user.deleteMany({ where: { email } });
  }
});
