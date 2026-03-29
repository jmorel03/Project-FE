const prisma = require('../lib/prisma');
const {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInDays,
  eachDayOfInterval,
  startOfDay,
} = require('date-fns');

function toNumber(value) {
  return Number(value) || 0;
}

function calculateChangePct(currentValue, previousValue) {
  if (!previousValue) {
    return currentValue === 0 ? 0 : null;
  }

  return Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 100);
}

function resolveFinanceRange(range, now) {
  if (range === 'quarter') {
    const currentStart = startOfMonth(subMonths(now, 2));
    const currentEnd = now;
    const previousStart = startOfMonth(subMonths(currentStart, 3));
    const previousEnd = endOfMonth(subMonths(currentStart, 1));

    return {
      range: 'quarter',
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      comparisonLabel: 'vs previous 3 months',
      trendLabel: 'Monthly net profit trend',
    };
  }

  if (range === 'year') {
    const currentStart = startOfMonth(subMonths(now, 11));
    const currentEnd = now;
    const previousStart = startOfMonth(subMonths(currentStart, 12));
    const previousEnd = endOfMonth(subMonths(currentStart, 1));

    return {
      range: 'year',
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      comparisonLabel: 'vs previous 12 months',
      trendLabel: 'Monthly net profit trend',
    };
  }

  const previousMonth = subMonths(now, 1);
  return {
    range: 'month',
    currentStart: startOfMonth(now),
    currentEnd: now,
    previousStart: startOfMonth(previousMonth),
    previousEnd: endOfMonth(previousMonth),
    comparisonLabel: 'vs last month',
    trendLabel: 'Daily net profit trend',
  };
}

function buildFinanceTrend(range, currentStart, currentEnd, paidInvoices, expenses) {
  const invoiceBuckets = new Map();
  const expenseBuckets = new Map();

  function getBucketKey(date) {
    if (range === 'month') return format(date, 'yyyy-MM-dd');
    return format(date, 'yyyy-MM');
  }

  paidInvoices.forEach((invoice) => {
    const key = getBucketKey(invoice.paidAt);
    invoiceBuckets.set(key, (invoiceBuckets.get(key) || 0) + toNumber(invoice.total));
  });

  expenses.forEach((expense) => {
    const key = getBucketKey(expense.date);
    expenseBuckets.set(key, (expenseBuckets.get(key) || 0) + toNumber(expense.amount));
  });

  if (range === 'month') {
    return eachDayOfInterval({
      start: startOfDay(currentStart),
      end: startOfDay(currentEnd),
    }).map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const moneyIn = invoiceBuckets.get(key) || 0;
      const moneyOut = expenseBuckets.get(key) || 0;

      return {
        label: format(day, 'MMM d'),
        moneyIn,
        moneyOut,
        netProfit: moneyIn - moneyOut,
      };
    });
  }

  const months = range === 'quarter' ? 3 : 12;

  return Array.from({ length: months }, (_, index) => {
    const month = startOfMonth(addMonths(currentStart, index));
    const key = format(month, 'yyyy-MM');
    const moneyIn = invoiceBuckets.get(key) || 0;
    const moneyOut = expenseBuckets.get(key) || 0;

    return {
      label: format(month, 'MMM'),
      moneyIn,
      moneyOut,
      netProfit: moneyIn - moneyOut,
    };
  });
}

exports.getStats = async (req, res, next) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
      totalInvoices,
      outstanding,
      overdue,
      paidThisMonth,
      totalExpenses,
      clientCount,
    ] = await Promise.all([
      // Total outstanding (sent + partial)
      prisma.invoice.aggregate({
        where: { userId, status: { in: ['SENT', 'PARTIAL', 'VIEWED'] } },
        _sum: { total: true },
      }),
      // Count outstanding
      prisma.invoice.count({
        where: { userId, status: { in: ['SENT', 'PARTIAL', 'VIEWED'] } },
      }),
      // Overdue invoices
      prisma.invoice.count({
        where: { userId, status: { in: ['SENT', 'PARTIAL', 'VIEWED'] }, dueDate: { lt: now } },
      }),
      // Paid this month
      prisma.invoice.aggregate({
        where: { userId, status: 'PAID', paidAt: { gte: monthStart, lte: monthEnd } },
        _sum: { total: true },
      }),
      // Expenses this month
      prisma.expense.aggregate({
        where: { userId, date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      // Active clients
      prisma.client.count({ where: { userId } }),
    ]);

    res.json({
      totalOutstanding: Number(totalInvoices._sum.total) || 0,
      outstandingCount: outstanding,
      overdueCount: overdue,
      paidThisMonth: Number(paidThisMonth._sum.total) || 0,
      expensesThisMonth: Number(totalExpenses._sum.amount) || 0,
      clientCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.getRevenueChart = async (req, res, next) => {
  try {
    const userId = req.userId;
    const months = 6;

    const data = await Promise.all(
      Array.from({ length: months }, (_, i) => {
        const date = subMonths(new Date(), months - 1 - i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        return Promise.all([
          prisma.invoice.aggregate({
            where: { userId, status: 'PAID', paidAt: { gte: start, lte: end } },
            _sum: { total: true },
          }),
          prisma.expense.aggregate({
            where: { userId, date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
        ]).then(([inv, exp]) => ({
          month: format(date, 'MMM yyyy'),
          revenue: Number(inv._sum.total) || 0,
          expenses: Number(exp._sum.amount) || 0,
        }));
      }),
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    const userId = req.userId;

    const [recentInvoices, recentExpenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true, invoiceNumber: true, status: true, total: true,
          updatedAt: true, client: { select: { name: true } },
        },
      }),
      prisma.expense.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, vendor: true, amount: true, date: true,
          category: { select: { name: true, color: true } },
        },
      }),
    ]);

    res.json({ recentInvoices, recentExpenses });
  } catch (err) {
    next(err);
  }
};

exports.getInsights = async (req, res, next) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthDate = subMonths(now, 1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);
    const nextThirtyDays = addDays(now, 30);

    const [
      user,
      clientCount,
      invoiceCount,
      expenseCount,
      activePlan,
      outstandingInvoices,
      paidInvoices,
      paidThisMonth,
      paidLastMonth,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          companyName: true,
          phone: true,
          address: true,
          city: true,
          taxNumber: true,
        },
      }),
      prisma.client.count({ where: { userId } }),
      prisma.invoice.count({ where: { userId } }),
      prisma.expense.count({ where: { userId } }),
      prisma.billingSubscription.findFirst({
        where: { userId, status: { in: ['active', 'trialing'] } },
        orderBy: { createdAt: 'desc' },
        select: { planKey: true },
      }),
      prisma.invoice.findMany({
        where: {
          userId,
          status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] },
        },
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          total: true,
          amountPaid: true,
          status: true,
          client: { select: { name: true } },
          reminders: {
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: { type: true, sentAt: true },
          },
        },
      }),
      prisma.invoice.findMany({
        where: {
          userId,
          status: 'PAID',
          paidAt: { not: null },
        },
        take: 50,
        orderBy: { paidAt: 'desc' },
        select: {
          issueDate: true,
          paidAt: true,
        },
      }),
      prisma.invoice.aggregate({
        where: { userId, status: 'PAID', paidAt: { gte: thisMonthStart, lte: thisMonthEnd } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { userId, status: 'PAID', paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { total: true },
      }),
    ]);

    const outstandingWithBalance = outstandingInvoices.map((invoice) => {
      const balance = Number(invoice.total) - Number(invoice.amountPaid || 0);
      const daysUntilDue = differenceInCalendarDays(invoice.dueDate, now);
      return {
        ...invoice,
        balance,
        daysUntilDue,
      };
    });

    const dueSoon = outstandingWithBalance.filter((invoice) => invoice.daysUntilDue >= 0 && invoice.daysUntilDue <= 7);
    const overdue = outstandingWithBalance.filter((invoice) => invoice.daysUntilDue < 0);
    const atRiskInvoices = outstandingWithBalance.filter((invoice) => invoice.daysUntilDue < -7 || invoice.balance >= 1000);
    const forecastThirtyDays = outstandingWithBalance
      .filter((invoice) => invoice.dueDate <= nextThirtyDays)
      .reduce((sum, invoice) => sum + invoice.balance, 0);
    const overdueBalance = overdue.reduce((sum, invoice) => sum + invoice.balance, 0);

    const averagePaymentDays = paidInvoices.length
      ? Math.round(
          paidInvoices.reduce((sum, invoice) => sum + Math.max(differenceInDays(invoice.paidAt, invoice.issueDate), 0), 0)
            / paidInvoices.length,
        )
      : null;

    const thisMonthRevenue = Number(paidThisMonth._sum.total) || 0;
    const lastMonthRevenue = Number(paidLastMonth._sum.total) || 0;
    const revenueTrend = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

    const checklist = [
      {
        key: 'profile',
        label: 'Complete your business profile',
        description: 'Add company, tax, and contact details so invoices feel professional.',
        complete: Boolean(user?.companyName && user?.phone && user?.address),
        path: '/settings',
      },
      {
        key: 'client',
        label: 'Add your first client',
        description: 'Client records unlock faster invoice creation and cleaner history.',
        complete: clientCount > 0,
        path: '/clients',
      },
      {
        key: 'invoice',
        label: 'Send your first invoice',
        description: 'Create and deliver an invoice to start tracking payments.',
        complete: invoiceCount > 0,
        path: '/invoices/new',
      },
      {
        key: 'expense',
        label: 'Track your first expense',
        description: 'Capture spending early so reporting has real context.',
        complete: expenseCount > 0,
        path: '/expenses',
      },
      {
        key: 'plan',
        label: 'Review your subscription tier',
        description: 'Unlock reminders, richer analytics, and advanced workflows as you grow.',
        complete: activePlan?.planKey && activePlan.planKey !== 'starter',
        path: '/settings/subscription',
      },
    ];

    const focusItems = [];

    if (dueSoon.length > 0) {
      focusItems.push({
        title: `${dueSoon.length} invoice${dueSoon.length === 1 ? '' : 's'} due soon`,
        description: 'Review upcoming due dates and send a reminder before they slip overdue.',
        path: '/invoices',
        tone: 'warning',
      });
    }

    if (overdue.length > 0) {
      focusItems.push({
        title: `${overdue.length} overdue invoice${overdue.length === 1 ? '' : 's'}`,
        description: `There is ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(overdueBalance)} waiting to be collected.`,
        path: '/invoices',
        tone: 'danger',
      });
    }

    if (checklist.some((item) => !item.complete)) {
      focusItems.push({
        title: 'Finish your onboarding checklist',
        description: 'The first few setup steps have the biggest impact on adoption and retention.',
        path: checklist.find((item) => !item.complete)?.path || '/settings',
        tone: 'neutral',
      });
    }

    res.json({
      checklist,
      summary: {
        pendingCollections: outstandingWithBalance.reduce((sum, invoice) => sum + invoice.balance, 0),
        forecastThirtyDays,
        dueSoonCount: dueSoon.length,
        overdueBalance,
        atRiskCount: atRiskInvoices.length,
        averagePaymentDays,
        thisMonthRevenue,
        revenueTrend,
      },
      focusItems,
      topInvoices: outstandingWithBalance.slice(0, 5).map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client?.name,
        balance: invoice.balance,
        dueDate: invoice.dueDate,
        daysUntilDue: invoice.daysUntilDue,
        lastReminder: invoice.reminders[0] || null,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.getFinanceSummary = async (req, res, next) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const {
      range,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      comparisonLabel,
      trendLabel,
    } = resolveFinanceRange(String(req.query.range || 'month').toLowerCase(), now);

    const [
      currentPaid,
      currentExpenses,
      previousPaid,
      previousExpenses,
      currentPaidInvoices,
      currentExpenseItems,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          userId,
          status: 'PAID',
          paidAt: { gte: currentStart, lte: currentEnd },
        },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: currentStart, lte: currentEnd },
        },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          userId,
          status: 'PAID',
          paidAt: { gte: previousStart, lte: previousEnd },
        },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: previousStart, lte: previousEnd },
        },
        _sum: { amount: true },
      }),
      prisma.invoice.findMany({
        where: {
          userId,
          status: 'PAID',
          paidAt: { gte: currentStart, lte: currentEnd },
        },
        select: { paidAt: true, total: true },
        orderBy: { paidAt: 'asc' },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          date: { gte: currentStart, lte: currentEnd },
        },
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const moneyIn = toNumber(currentPaid._sum.total);
    const moneyOut = toNumber(currentExpenses._sum.amount);
    const netProfit = moneyIn - moneyOut;

    const previousMoneyIn = toNumber(previousPaid._sum.total);
    const previousMoneyOut = toNumber(previousExpenses._sum.amount);
    const previousNetProfit = previousMoneyIn - previousMoneyOut;

    res.json({
      range,
      comparisonLabel,
      trendLabel,
      moneyIn,
      moneyOut,
      netProfit,
      moneyInChangePct: calculateChangePct(moneyIn, previousMoneyIn),
      moneyOutChangePct: calculateChangePct(moneyOut, previousMoneyOut),
      netProfitChangePct: calculateChangePct(netProfit, previousNetProfit),
      trend: buildFinanceTrend(range, currentStart, currentEnd, currentPaidInvoices, currentExpenseItems),
    });
  } catch (err) {
    next(err);
  }
};
