const prisma = require('../lib/prisma');
const { startOfMonth, endOfMonth, subDays } = require('date-fns');

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
        createdAt: user.createdAt,
        subscription: user.subscriptions[0] || null,
      })),
    });
  } catch (err) {
    next(err);
  }
};
