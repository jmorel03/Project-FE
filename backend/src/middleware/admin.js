const prisma = require('../lib/prisma');

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((v) => v.trim().replace(/^['\"]|['\"]$/g, '').toLowerCase())
    .filter(Boolean);
}

exports.requireAdmin = async (req, res, next) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true },
    });

    if (!user) return res.status(401).json({ error: 'User not found' });

    const adminEmails = parseCsv(process.env.ADMIN_EMAILS);
    const adminUserIds = parseCsv(process.env.ADMIN_USER_IDS);

    const isAdmin = adminEmails.includes(String(user.email || '').toLowerCase())
      || adminUserIds.includes(String(user.id || '').toLowerCase());

    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

    req.adminUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.requireAdmin2FA = (req, res, next) => {
  if (req.auth?.admin === true && req.auth?.admin2fa === true) {
    return next();
  }
  return res.status(403).json({ error: 'Admin 2FA session required' });
};
