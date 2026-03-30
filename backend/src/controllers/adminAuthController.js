const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otplib = require('otplib');
const prisma = require('../lib/prisma');

const ADMIN_LOGIN_MAX_FAILED_ATTEMPTS = Math.max(
  1,
  Number(process.env.ADMIN_LOGIN_MAX_FAILED_ATTEMPTS || process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5),
);
const ADMIN_LOGIN_LOCK_MINUTES = Math.max(
  1,
  Number(process.env.ADMIN_LOGIN_LOCK_MINUTES || process.env.LOGIN_LOCK_MINUTES || 15),
);

async function recordAdminFailedAttempt(user) {
  const nextFailedAttempts = (user.failedLoginAttempts || 0) + 1;
  const shouldLock = nextFailedAttempts >= ADMIN_LOGIN_MAX_FAILED_ATTEMPTS;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: shouldLock ? 0 : nextFailedAttempts,
      lockUntil: shouldLock
        ? new Date(Date.now() + ADMIN_LOGIN_LOCK_MINUTES * 60 * 1000)
        : null,
    },
  });

  return shouldLock;
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((v) => v.trim().replace(/^['\"]|['\"]$/g, '').toLowerCase())
    .filter(Boolean);
}

function canonicalizeEmail(email) {
  const raw = String(email || '').trim().replace(/^['\"]|['\"]$/g, '').toLowerCase();
  const [local, domain] = raw.split('@');
  if (!local || !domain) return raw;

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const localBase = local.split('+')[0].replace(/\./g, '');
    return `${localBase}@gmail.com`;
  }

  return raw;
}

function parseTotpSecrets(value) {
  const map = new Map();
  String(value || '')
    .split(',')
    .map((pair) => pair.trim().replace(/^['\"]|['\"]$/g, ''))
    .filter(Boolean)
    .forEach((pair) => {
      const [email, secret] = pair.split(':');
      if (email && secret) {
        map.set(
          canonicalizeEmail(email),
          secret.trim().replace(/^['\"]|['\"]$/g, ''),
        );
      }
    });
  return map;
}

function isAdminUser(user) {
  const adminEmails = parseCsv(process.env.ADMIN_EMAILS).map(canonicalizeEmail);
  const adminUserIds = parseCsv(process.env.ADMIN_USER_IDS);

  return adminEmails.includes(canonicalizeEmail(user.email))
    || adminUserIds.includes(String(user.id || '').toLowerCase());
}

function signAdminAccessToken(userId) {
  return jwt.sign(
    { sub: userId, admin: true, admin2fa: true, scope: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h' },
  );
}

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password, totp } = req.body;

    const user = await prisma.user.findUnique({ where: { email: canonicalizeEmail(email) } });
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({ error: 'Too many failed admin login attempts. Please try again later.' });
    }

    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended' });

    const validPassword = await bcrypt.compare(String(password || ''), user.password);
    if (!validPassword) {
      const locked = await recordAdminFailedAttempt(user);
      if (locked) {
        return res.status(429).json({ error: 'Too many failed admin login attempts. Please try again later.' });
      }
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access required' });

    const totpSecrets = parseTotpSecrets(process.env.ADMIN_TOTP_SECRETS);
    const secret = totpSecrets.get(canonicalizeEmail(user.email));

    if (!secret) {
      return res.status(503).json({ error: 'TOTP is not configured for this admin account' });
    }

    const verification = await otplib.verify({
      token: String(totp || '').replace(/\s+/g, ''),
      secret,
    });
    if (!verification?.valid) {
      const locked = await recordAdminFailedAttempt(user);
      if (locked) {
        return res.status(429).json({ error: 'Too many failed admin login attempts. Please try again later.' });
      }
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    if (user.failedLoginAttempts || user.lockUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockUntil: null },
      });
    }

    const accessToken = signAdminAccessToken(user.id);

    return res.json({
      accessToken,
      admin: {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
      },
    });
  } catch (err) {
    return next(err);
  }
};
