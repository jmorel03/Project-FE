const prisma = require('../lib/prisma');
const { startOfMonth, endOfMonth, subDays } = require('date-fns');
const crypto = require('crypto');
const Stripe = require('stripe');

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

exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const search = String(req.query.search || '').trim();

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

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
            take: 1,
            select: {
              status: true,
              planKey: true,
              stripePriceId: true,
              currentPeriodEnd: true,
            },
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
        subscription: user.subscriptions[0] || null,
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

exports.triggerPasswordReset = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const ttlMinutes = Math.max(parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 10) || 60, 5);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Invalidate previous active reset tokens for this user.
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const clientBase = String(process.env.CLIENT_URL || '').replace(/\/+$/, '') || 'http://localhost:5173';
    const resetUrl = `${clientBase}/reset-password?token=${rawToken}`;

    await logAdminAction(req, {
      action: 'user.password_reset_requested',
      targetUserId: userId,
      metadata: { expiresAt: expiresAt.toISOString() },
    });

    res.json({
      message: 'Password reset token created. Share reset URL securely with user.',
      user,
      resetUrl,
      resetToken: rawToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    await logAdminAction(req, {
      action: 'user.password_reset_requested',
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
