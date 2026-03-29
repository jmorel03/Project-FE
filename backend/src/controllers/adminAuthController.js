const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otplib = require('otplib');
const prisma = require('../lib/prisma');

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((v) => v.trim().replace(/^['\"]|['\"]$/g, '').toLowerCase())
    .filter(Boolean);
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
          email.trim().replace(/^['\"]|['\"]$/g, '').toLowerCase(),
          secret.trim().replace(/^['\"]|['\"]$/g, ''),
        );
      }
    });
  return map;
}

function isAdminUser(user) {
  const adminEmails = parseCsv(process.env.ADMIN_EMAILS);
  const adminUserIds = parseCsv(process.env.ADMIN_USER_IDS);

  return adminEmails.includes(String(user.email || '').toLowerCase())
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

    const user = await prisma.user.findUnique({ where: { email: String(email || '').toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });
    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended' });

    const validPassword = await bcrypt.compare(String(password || ''), user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid admin credentials' });

    if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access required' });

    const totpSecrets = parseTotpSecrets(process.env.ADMIN_TOTP_SECRETS);
    const secret = totpSecrets.get(String(user.email || '').toLowerCase());

    if (!secret) {
      return res.status(503).json({ error: 'TOTP is not configured for this admin account' });
    }

    const verification = await otplib.verify({
      token: String(totp || '').replace(/\s+/g, ''),
      secret,
    });
    if (!verification?.valid) return res.status(401).json({ error: 'Invalid TOTP code' });

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
