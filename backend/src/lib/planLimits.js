const prisma = require('./prisma');

const FREE_INVOICE_MONTHLY_LIMIT = 5;

/**
 * Returns the active plan key for a user ('starter', 'professional', 'business').
 * Defaults to 'starter' (free) if no paid subscription is found.
 */
async function getActivePlanKey(userId) {
  const sub = await prisma.billingSubscription.findFirst({
    where: { userId, status: { in: ['active', 'trialing'] } },
    orderBy: { createdAt: 'desc' },
    select: { planKey: true },
  });
  return sub?.planKey || 'starter';
}

/**
 * Checks if a free-plan user has hit their monthly invoice limit.
 * Returns null if the user is allowed to create an invoice.
 * Returns an error object if they are over the limit.
 */
async function checkInvoiceMonthlyLimit(userId) {
  const planKey = await getActivePlanKey(userId);
  if (planKey !== 'starter') return null; // paid plans have no invoice limit

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.invoice.count({
    where: { userId, createdAt: { gte: startOfMonth } },
  });

  if (count >= FREE_INVOICE_MONTHLY_LIMIT) {
    return {
      message: `Free plan allows up to ${FREE_INVOICE_MONTHLY_LIMIT} invoices per month. Upgrade to Professional to create more.`,
      code: 'PLAN_LIMIT_REACHED',
      limit: FREE_INVOICE_MONTHLY_LIMIT,
      used: count,
    };
  }
  return null;
}

module.exports = { getActivePlanKey, checkInvoiceMonthlyLimit };
