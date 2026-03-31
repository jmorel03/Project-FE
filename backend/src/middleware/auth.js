const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

function verifyAccessToken(token) {
  const secrets = [process.env.JWT_SECRET, process.env.ADMIN_JWT_SECRET]
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  let lastError = null;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Invalid token');
}

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isSuspended: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.userId = payload.sub;
    req.auth = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};
