const prisma = require('../lib/prisma');
const { startOfMonth, endOfMonth, subDays } = require('date-fns');
const Stripe = require('stripe');
const bcrypt = require('bcryptjs');
const { validatePasswordStrength, isRecentPasswordReuse } = require('../lib/passwordPolicy');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

function getRequestIp(req) {
  return String(req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
}

async function logAdminAction(req, {
  action,
  targetUserId = null,
  status = 'success',
  metadata = null,
}) {
  if (!req?.adminUser?.id) return;

  await prisma.adminAuditLog.create({
    data: {
      adminUserId: req.adminUser.id,
      targetUserId,
      action,
      status,
      ipAddress: getRequestIp(req),
      metadata,
    },
  });
}

exports.getOverview = async (req, res, next) => {
  try {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const sevenDaysAgo = subDays(now, 7);

    const [
      usersTotal,
      invoicesTotal,
      overdueInvoices,
      activeSubscriptions,
      paidThisMonth,
      remindersLast7Days,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.billingSubscription.count({ where: { status: { in: ['active', 'trialing'] } } }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: thisMonthStart, lte: thisMonthEnd } },
        _sum: { total: true },
      }),
      prisma.invoiceReminder.count({ where: { sentAt: { gte: sevenDaysAgo } } }),
    ]);

    res.json({
      usersTotal,
      invoicesTotal,
      overdueInvoices,
      activeSubscriptions,
      monthlyRevenue: Number(paidThisMonth._sum.total) || 0,
      remindersLast7Days,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

function resolveUserPlan(subscriptions) {
  if (!subscriptions || subscriptions.length === 0) {
    return { status: 'free', planKey: 'starter', stripePriceId: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
  }

  // Prefer any active or trialing subscription first.
  const active = subscriptions.find((s) => s.status === 'active' || s.status === 'trialing');
  if (active) return active;

  // Fall back to starter for anyone with only canceled/expired subscriptions.
  return { status: 'free', planKey: 'starter', stripePriceId: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
}

exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const search = String(req.query.search || '').trim();
    const planFilter = String(req.query.plan || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || '').trim().toLowerCase();

    const conditions = [];

    if (search) {
      conditions.push({
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // Status filter
    if (statusFilter === 'suspended') {
      conditions.push({ isSuspended: true });
    } else if (statusFilter === 'active') {
      conditions.push({ subscriptions: { some: { status: 'active' } } });
    } else if (statusFilter === 'trialing') {
      conditions.push({ subscriptions: { some: { status: 'trialing' } } });
    } else if (statusFilter === 'free') {
      conditions.push({ subscriptions: { none: { status: { in: ['active', 'trialing'] } } } });
    }

    // Plan filter
    if (planFilter === 'starter') {
      conditions.push({ subscriptions: { none: { status: { in: ['active', 'trialing'] } } } });
    } else if (planFilter === 'professional' || planFilter === 'business') {
      conditions.push({ subscriptions: { some: { status: { in: ['active', 'trialing'] }, planKey: planFilter } } });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          companyName: true,
          isSuspended: true,
          suspendedAt: true,
          suspensionReason: true,
          createdAt: true,
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              status: true,
              planKey: true,
              stripePriceId: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
          _count: {
            select: { invoices: true },
          },
        },
      }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        companyName: user.companyName || null,
        isSuspended: user.isSuspended,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason,
        createdAt: user.createdAt,
        subscription: resolveUserPlan(user.subscriptions),
        invoiceCount: user._count.invoices,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.suspendUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const suspended = req.body?.suspended !== undefined ? Boolean(req.body.suspended) : true;
    const reason = suspended ? String(req.body?.reason || '').trim() || 'Suspended by admin' : null;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: suspended,
        suspendedAt: suspended ? new Date() : null,
        suspensionReason: reason,
      },
      select: { id: true, email: true, isSuspended: true, suspendedAt: true, suspensionReason: true },
    });

    // Force user logout on suspension changes.
    await prisma.refreshToken.deleteMany({ where: { userId } });

    await logAdminAction(req, {
      action: suspended ? 'user.suspend' : 'user.unsuspend',
      targetUserId: userId,
      metadata: { reason },
    });

    res.json({ message: suspended ? 'User suspended' : 'User reactivated', user: updated });
  } catch (err) {
    await logAdminAction(req, {
      action: 'user.suspend',
      targetUserId: req.params.id,
      status: 'failed',
      metadata: { error: err.message },
    });
    next(err);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const newPassword = String(req.body?.newPassword || '');

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.message });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const reused = await isRecentPasswordReuse(user.id, newPassword, user.password);
    if (reused) {
      return res.status(400).json({ error: 'New password cannot match current or last 5 passwords' });
    }

    const nextHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash: user.password,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { password: nextHash },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    await logAdminAction(req, {
      action: 'user.password_reset_admin',
      targetUserId: userId,
      metadata: { email: user.email },
    });

    res.json({
      message: `Password updated for ${user.email}. User has been signed out of active sessions.`,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    await logAdminAction(req, {
      action: 'user.password_reset_admin',
      targetUserId: req.params.id,
      status: 'failed',
      metadata: { error: err.message },
    });
    next(err);
  }
};

exports.cancelUserSubscription = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const stripe = getStripe();

    const activeSub = await prisma.billingSubscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] },
        stripeSubscriptionId: { not: { startsWith: 'free_' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSub) {
      return res.status(404).json({ error: 'No active paid subscription found for this user' });
    }

    if (stripe) {
      await stripe.subscriptions.update(activeSub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    await prisma.billingSubscription.update({
      where: { id: activeSub.id },
      data: { cancelAtPeriodEnd: true },
    });

    await logAdminAction(req, {
      action: 'subscription.cancel_at_period_end',
      targetUserId: userId,
      metadata: { stripeSubscriptionId: activeSub.stripeSubscriptionId },
    });

    return res.json({
      message: 'Subscription set to cancel at period end',
      subscriptionId: activeSub.stripeSubscriptionId,
    });
  } catch (err) {
    await logAdminAction(req, {
      action: 'subscription.cancel_at_period_end',
      targetUserId: req.params.id,
      status: 'failed',
      metadata: { error: err.message },
    });
    return next(err);
  }
};
