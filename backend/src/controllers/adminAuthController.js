const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otplib = require('otplib');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { validatePasswordStrength, isRecentPasswordReuse } = require('../lib/passwordPolicy');

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
  const adminSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  const adminAudience = process.env.ADMIN_JWT_AUDIENCE || 'xpensist-admin';

  return jwt.sign(
    { sub: userId, admin: true, admin2fa: true, scope: 'admin' },
    adminSecret,
    {
      algorithm: 'HS256',
      expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h',
      audience: adminAudience,
      issuer: 'xpensist-admin',
      jwtid: uuidv4(),
    },
  );
}

async function verifyAdminCredentials({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: canonicalizeEmail(email) } });
  if (!user) return { errorStatus: 401, error: 'Invalid admin credentials' };

  if (user.lockUntil && user.lockUntil > new Date()) {
    return { errorStatus: 429, error: 'Too many failed admin login attempts. Please try again later.' };
  }

  if (user.isSuspended) return { errorStatus: 403, error: 'Account suspended' };

  const validPassword = await bcrypt.compare(String(password || ''), user.password);
  if (!validPassword) {
    const locked = await recordAdminFailedAttempt(user);
    if (locked) {
      return { errorStatus: 429, error: 'Too many failed admin login attempts. Please try again later.' };
    }
    return { errorStatus: 401, error: 'Invalid admin credentials' };
  }

  if (!isAdminUser(user)) return { errorStatus: 403, error: 'Admin access required' };

  const totpSecrets = parseTotpSecrets(process.env.ADMIN_TOTP_SECRETS);
  const secret = totpSecrets.get(canonicalizeEmail(user.email));
  if (!secret) {
    return { errorStatus: 503, error: 'TOTP is not configured for this admin account' };
  }

  return { user, secret };
}

exports.adminPreflight = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const verified = await verifyAdminCredentials({ email, password });
    if (verified.error) {
      return res.status(verified.errorStatus || 400).json({ error: verified.error });
    }

    return res.json({
      requiresTotp: true,
      email: verified.user.email,
    });
  } catch (err) {
    return next(err);
  }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password, totp } = req.body;

    const verified = await verifyAdminCredentials({ email, password });
    if (verified.error) {
      return res.status(verified.errorStatus || 400).json({ error: verified.error });
    }

    const { user, secret } = verified;

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

exports.adminForgotPassword = async (req, res, next) => {
  try {
    const { email, totp, newPassword } = req.body;
    const normalizedEmail = canonicalizeEmail(email);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    if (!isAdminUser(user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

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
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.message });
    }

    const reused = await isRecentPasswordReuse(user.id, newPassword, user.password);
    if (reused) {
      return res.status(400).json({ error: 'New password cannot match current or last 5 passwords' });
    }

    const nextHash = await bcrypt.hash(String(newPassword), 12);

    await prisma.$transaction([
      prisma.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: user.password,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: nextHash,
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    return res.json({ message: 'Password reset successful. Please log in again.' });
  } catch (err) {
    return next(err);
  }
};
