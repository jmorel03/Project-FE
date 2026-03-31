const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { validatePasswordStrength, isRecentPasswordReuse } = require('../lib/passwordPolicy');
const { acceptInviteForUser } = require('../lib/teamInvites');

const LOGIN_MAX_FAILED_ATTEMPTS = Math.max(1, Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5));
const LOGIN_LOCK_MINUTES = Math.max(1, Number(process.env.LOGIN_LOCK_MINUTES || 15));

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
}

async function findStoredRefreshToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);

  return prisma.refreshToken.findFirst({
    where: {
      OR: [
        { token: tokenHash },
        { token: String(rawToken || '') },
      ],
    },
  });
}

const signAccess = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const signRefresh = (userId) =>
  jwt.sign({ sub: userId, jti: uuidv4() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

exports.register = async (req, res, next) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      inviteToken,
    } = req.body;

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.message });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, companyName },
    });

    // Create default expense categories
    await prisma.expenseCategory.createMany({
      data: [
        { userId: user.id, name: 'Office Supplies', color: '#6366f1' },
        { userId: user.id, name: 'Travel', color: '#f59e0b' },
        { userId: user.id, name: 'Software', color: '#10b981' },
        { userId: user.id, name: 'Marketing', color: '#ef4444' },
        { userId: user.id, name: 'Meals', color: '#8b5cf6' },
      ],
    });

    // Assign free starter tier
    await prisma.billingSubscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: '',
        stripeSubscriptionId: `free_${user.id}`,
        status: 'active',
        planKey: 'starter',
      },
    });

    await prisma.teamWorkspace.create({
      data: {
        id: user.id,
        ownerUserId: user.id,
        name: String(companyName || '').trim() || `${firstName} ${lastName}`.trim() || 'Team Workspace',
      },
    });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: hashRefreshToken(refreshToken), userId: user.id, expiresAt },
    });

    if (inviteToken) {
      await acceptInviteForUser({
        token: inviteToken,
        userId: user.id,
        userEmail: user.email,
      });
    }

    const { password: _pw, ...userWithoutPassword } = user;
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ accessToken, user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const nextFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = nextFailedAttempts >= LOGIN_MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextFailedAttempts,
          lockUntil: shouldLock
            ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000)
            : null,
        },
      });

      if (shouldLock) {
        return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.failedLoginAttempts || user.lockUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockUntil: null },
      });
    }

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: hashRefreshToken(refreshToken), userId: user.id, expiresAt },
    });

    const { password: _pw, ...userWithoutPassword } = user;
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const stored = await findStoredRefreshToken(refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isSuspended: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isSuspended) {
      await prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
      return res.status(403).json({ error: 'Account suspended' });
    }

    // Rotate token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newAccess = signAccess(payload.sub);
    const newRefresh = signRefresh(payload.sub);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: hashRefreshToken(newRefresh), userId: payload.sub, expiresAt },
    });

    setRefreshCookie(res, newRefresh);
    res.json({ accessToken: newAccess });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const stored = await findStoredRefreshToken(refreshToken);
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
    }
    clearRefreshCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const actorUserId = req.actorUserId || req.userId;
    const user = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        companyName: true, companyLogo: true, address: true, city: true,
        state: true, zip: true, country: true, phone: true, currency: true,
        taxNumber: true, createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      ...user,
      workspace: {
        ownerUserId: req.workspaceOwnerId || actorUserId,
        role: req.workspaceRole || 'admin',
        actorUserId,
        isTeamMember: Boolean(req.isTeamMember),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const actorUserId = req.actorUserId || req.userId;
    const allowed = [
      'firstName', 'lastName', 'companyName', 'companyLogo', 'address',
      'city', 'state', 'zip', 'country', 'phone', 'currency', 'taxNumber',
    ];
    const data = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    });

    if (req.body.email) {
      const conflict = await prisma.user.findFirst({
        where: { email: req.body.email, id: { not: actorUserId } },
      });
      if (conflict) return res.status(409).json({ error: 'Email already in use' });
      data.email = req.body.email;
    }

    if (req.body.password !== undefined) {
      return res.status(400).json({ error: 'Use /auth/change-password to update your password' });
    }

    const user = await prisma.user.update({
      where: { id: actorUserId },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        companyName: true, companyLogo: true, address: true, city: true,
        state: true, zip: true, country: true, phone: true, currency: true,
        taxNumber: true, createdAt: true,
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const actorUserId = req.actorUserId || req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, password: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentValid = await bcrypt.compare(String(currentPassword), user.password);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.message });
    }

    const reused = await isRecentPasswordReuse(user.id, newPassword, user.password);
    if (reused) {
      return res.status(400).json({ error: 'New password cannot match your current or last 5 passwords' });
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
        data: { password: nextHash },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    clearRefreshCookie(res);
    return res.json({ message: 'Password updated successfully. Please log in again.' });
  } catch (err) {
    return next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt <= new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.message });
    }

    const user = await prisma.user.findUnique({
      where: { id: resetRecord.userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const reused = await isRecentPasswordReuse(user.id, newPassword, user.password);
    if (reused) {
      return res.status(400).json({ error: 'New password cannot match your current or last 5 passwords' });
    }

    const hashed = await bcrypt.hash(String(newPassword), 12);

    await prisma.$transaction([
      prisma.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: user.password,
        },
      }),
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: resetRecord.userId } }),
    ]);

    return res.json({ message: 'Password reset successful. Please log in again.' });
  } catch (err) {
    return next(err);
  }
};
