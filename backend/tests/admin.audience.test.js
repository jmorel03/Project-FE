const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-user-secret-123456789012345678901234567890';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-secret-12345678901234567890123456789';
process.env.ADMIN_JWT_AUDIENCE = process.env.ADMIN_JWT_AUDIENCE || 'xpensist-admin';
process.env.ADMIN_USER_IDS = process.env.ADMIN_USER_IDS || '';

const prisma = require('../src/lib/prisma');
const { authenticate } = require('../src/middleware/auth');
const { requireAdmin2FA, requireAdmin } = require('../src/middleware/admin');

function makeToken({ userId, audience }) {
  return jwt.sign(
    { sub: userId, admin: true, admin2fa: true, scope: 'admin' },
    process.env.ADMIN_JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '10m',
      audience,
      issuer: 'xpensist-admin',
      jwtid: crypto.randomUUID(),
    },
  );
}

test('admin middleware enforces admin token audience', async () => {
  const email = `admin-aud-${Date.now()}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash('StrongPass1!', 12),
      firstName: 'Admin',
      lastName: 'Audience',
      failedLoginAttempts: 0,
    },
    select: { id: true, email: true },
  });

  process.env.ADMIN_EMAILS = user.email;

  const app = express();
  app.get('/admin-probe', authenticate, requireAdmin2FA, requireAdmin, (req, res) => {
    res.status(200).json({ ok: true });
  });

  try {
    const wrongAudienceToken = makeToken({ userId: user.id, audience: 'wrong-admin-audience' });
    const wrongRes = await request(app)
      .get('/admin-probe')
      .set('Authorization', `Bearer ${wrongAudienceToken}`);

    assert.equal(wrongRes.status, 403);
    assert.equal(wrongRes.body?.error, 'Admin 2FA session required');

    const correctAudienceToken = makeToken({
      userId: user.id,
      audience: process.env.ADMIN_JWT_AUDIENCE,
    });
    const okRes = await request(app)
      .get('/admin-probe')
      .set('Authorization', `Bearer ${correctAudienceToken}`);

    assert.equal(okRes.status, 200);
    assert.equal(okRes.body?.ok, true);
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
});