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
    } else if (statusFilter === 'locked') {
      conditions.push({ lockUntil: { gt: new Date() } });
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
          failedLoginAttempts: true,
          lockUntil: true,
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
        failedLoginAttempts: user.failedLoginAttempts || 0,
        lockUntil: user.lockUntil,
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

exports.resetUserLockout = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
      },
      select: {
        id: true,
        email: true,
        failedLoginAttempts: true,
        lockUntil: true,
      },
    });

    await logAdminAction(req, {
      action: 'user.lockout_reset',
      targetUserId: userId,
      metadata: { email: updated.email },
    });

    res.json({
      message: `Login lockout reset for ${updated.email}`,
      user: updated,
    });
  } catch (err) {
    await logAdminAction(req, {
      action: 'user.lockout_reset',
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

exports.deleteUserAccount = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const reason = String(req.body?.reason || '').trim() || 'Deleted by admin';
    const stripe = getStripe();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptions: {
          where: { status: { in: ['active', 'trialing'] } },
          select: { id: true, stripeSubscriptionId: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const paidStripeSubscriptionIds = user.subscriptions
      .map((sub) => sub.stripeSubscriptionId)
      .filter((subId) => subId && !String(subId).startsWith('free_'));

    if (paidStripeSubscriptionIds.length > 0 && !stripe) {
      return res.status(400).json({
        error: 'Cannot delete this user while Stripe is not configured. Cancel paid subscriptions first.',
      });
    }

    for (const subscriptionId of paidStripeSubscriptionIds) {
      await stripe.subscriptions.cancel(subscriptionId);
    }

    await prisma.$transaction(async (tx) => {
      if (user.subscriptions.length > 0) {
        await tx.billingSubscription.deleteMany({
          where: { userId },
        });
      }

      await tx.user.delete({ where: { id: userId } });
    });

    await logAdminAction(req, {
      action: 'user.delete_account',
      targetUserId: userId,
      metadata: {
        email: user.email,
        reason,
        canceledStripeSubscriptions: paidStripeSubscriptionIds,
      },
    });

    return res.json({
      message: `User account deleted: ${user.email}`,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    await logAdminAction(req, {
      action: 'user.delete_account',
      targetUserId: req.params.id,
      status: 'failed',
      metadata: { error: err.message },
    });
    return next(err);
  }
};

exports.getTeams = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const search = String(req.query.search || '').trim();

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { owner: { email: { contains: search, mode: 'insensitive' } } },
            { owner: { companyName: { contains: search, mode: 'insensitive' } } },
            { owner: { firstName: { contains: search, mode: 'insensitive' } } },
            { owner: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [total, workspaces] = await Promise.all([
      prisma.teamWorkspace.count({ where }),
      prisma.teamWorkspace.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          ownerUserId: true,
          name: true,
          updatedAt: true,
          owner: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
              subscriptions: {
                where: { status: { in: ['active', 'trialing'] } },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { planKey: true, status: true },
              },
            },
          },
        },
      }),
    ]);

    const ownerIds = workspaces.map((w) => w.ownerUserId);
    const memberCounts = ownerIds.length
      ? await prisma.teamMember.groupBy({
          by: ['ownerUserId'],
          where: { ownerUserId: { in: ownerIds }, isActive: true },
          _count: { ownerUserId: true },
        })
      : [];
    const memberCountMap = new Map(memberCounts.map((x) => [x.ownerUserId, x._count.ownerUserId]));
    const pendingInviteCounts = ownerIds.length
      ? await prisma.teamInvite.groupBy({
          by: ['ownerUserId'],
          where: { ownerUserId: { in: ownerIds }, status: 'PENDING', expiresAt: { gt: new Date() } },
          _count: { ownerUserId: true },
        })
      : [];
    const inviteCountMap = new Map(pendingInviteCounts.map((x) => [x.ownerUserId, x._count.ownerUserId]));

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      teams: workspaces.map((workspace) => ({
        id: workspace.id,
        ownerUserId: workspace.ownerUserId,
        name: workspace.name,
        ownerEmail: workspace.owner.email,
        ownerName: `${workspace.owner.firstName || ''} ${workspace.owner.lastName || ''}`.trim() || workspace.owner.email,
        ownerCompanyName: workspace.owner.companyName || null,
        planKey: workspace.owner.subscriptions[0]?.planKey || 'starter',
        planStatus: workspace.owner.subscriptions[0]?.status || 'free',
        seatsUsed: 1 + (memberCountMap.get(workspace.ownerUserId) || 0),
        pendingInvites: inviteCountMap.get(workspace.ownerUserId) || 0,
        updatedAt: workspace.updatedAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

exports.getTeamByOwner = async (req, res, next) => {
  try {
    const ownerUserId = String(req.params.ownerUserId || '');

    const workspace = await prisma.teamWorkspace.findUnique({
      where: { ownerUserId },
      select: {
        id: true,
        ownerUserId: true,
        name: true,
        updatedAt: true,
        owner: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            companyName: true,
            subscriptions: {
              where: { status: { in: ['active', 'trialing'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { planKey: true, status: true, currentPeriodEnd: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const [members, invites] = await Promise.all([
      prisma.teamMember.findMany({
        where: { ownerUserId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          createdAt: true,
          member: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.teamInvite.findMany({
        where: { ownerUserId, status: 'PENDING', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ]);

    return res.json({
      workspace: {
        id: workspace.id,
        ownerUserId: workspace.ownerUserId,
        name: workspace.name,
        updatedAt: workspace.updatedAt,
      },
      owner: {
        email: workspace.owner.email,
        name: `${workspace.owner.firstName || ''} ${workspace.owner.lastName || ''}`.trim() || workspace.owner.email,
        companyName: workspace.owner.companyName || null,
      },
      subscription: workspace.owner.subscriptions[0] || { planKey: 'starter', status: 'free' },
      members: members.map((m) => ({
        role: String(m.role || '').toLowerCase(),
        joinedAt: m.createdAt,
        user: m.member,
      })),
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: String(invite.role || '').toLowerCase(),
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
};
