const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');

const signAccess = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const signRefresh = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;

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

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    const { password: _pw, ...userWithoutPassword } = user;
    res.status(201).json({ accessToken, refreshToken, user: userWithoutPassword });
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

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    const { password: _pw, ...userWithoutPassword } = user;
    res.json({ accessToken, refreshToken, user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }

    // Rotate token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const newAccess = signAccess(payload.sub);
    const newRefresh = signRefresh(payload.sub);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: newRefresh, userId: payload.sub, expiresAt },
    });

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        companyName: true, companyLogo: true, address: true, city: true,
        state: true, zip: true, country: true, phone: true, currency: true,
        taxNumber: true, createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
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
        where: { email: req.body.email, id: { not: req.userId } },
      });
      if (conflict) return res.status(409).json({ error: 'Email already in use' });
      data.email = req.body.email;
    }

    if (req.body.password) {
      data.password = await bcrypt.hash(req.body.password, 12);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
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
