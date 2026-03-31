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

async function findActiveMembership(memberUserId) {
  if (!prisma.teamMember || typeof prisma.teamMember.findFirst !== 'function') {
    return null;
  }

  try {
    return await prisma.teamMember.findFirst({
      where: {
        memberUserId,
        isActive: true,
      },
      select: {
        ownerUserId: true,
        role: true,
      },
    });
  } catch (error) {
    // During rolling migrations, TeamMember may not exist yet.
    if (error?.code === 'P2021') {
      return null;
    }
    throw error;
  }
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

    const membership = await findActiveMembership(payload.sub);

    if (membership) {
      const owner = await prisma.user.findUnique({
        where: { id: membership.ownerUserId },
        select: { id: true, isSuspended: true },
      });

      if (!owner) {
        return res.status(401).json({ error: 'Workspace owner not found' });
      }

      if (owner.isSuspended) {
        return res.status(403).json({ error: 'Workspace suspended' });
      }

      req.userId = owner.id;
      req.workspaceOwnerId = owner.id;
      req.workspaceRole = String(membership.role || '').toLowerCase();
      req.isTeamMember = true;
    } else {
      req.userId = payload.sub;
      req.workspaceOwnerId = payload.sub;
      req.workspaceRole = 'admin';
      req.isTeamMember = false;
    }

    req.actorUserId = payload.sub;
    req.auth = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};
