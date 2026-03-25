const prisma = require('../lib/prisma');
const { startOfMonth, endOfMonth, subMonths, format } = require('date-fns');

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
