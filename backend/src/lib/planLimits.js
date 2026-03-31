const prisma = require('./prisma');

const FREE_INVOICE_MONTHLY_LIMIT = 5;
const PLAN_ORDER = ['starter', 'professional', 'business'];
const PLAN_CAPABILITIES = {
  starter: {
    financeRanges: ['month'],
    canUseReminders: false,
    canUseRevenueReporting: false,
    canUseExecutiveMode: false,
  },
  professional: {
    financeRanges: ['month', 'quarter'],
    canUseReminders: true,
    canUseRevenueReporting: true,
    canUseExecutiveMode: false,
  },
  business: {
    financeRanges: ['month', 'quarter', 'year'],
    canUseReminders: true,
    canUseRevenueReporting: true,
    canUseExecutiveMode: true,
  },
};

function normalizePlanKey(planKey) {
  const normalized = String(planKey || 'starter').toLowerCase();
  return PLAN_ORDER.includes(normalized) ? normalized : 'starter';
}

function getPlanCapabilities(planKey) {
  return PLAN_CAPABILITIES[normalizePlanKey(planKey)];
}

function isPlanAtLeast(currentPlanKey, requiredPlanKey) {
  return PLAN_ORDER.indexOf(normalizePlanKey(currentPlanKey)) >= PLAN_ORDER.indexOf(normalizePlanKey(requiredPlanKey));
}

function buildUpgradeRequiredError({ currentPlanKey, requiredPlanKey, feature, code = 'UPGRADE_REQUIRED' }) {
  const normalizedCurrent = normalizePlanKey(currentPlanKey);
  const normalizedRequired = normalizePlanKey(requiredPlanKey);
  const planName = normalizedRequired.charAt(0).toUpperCase() + normalizedRequired.slice(1);

  const error = new Error(`${feature} requires the ${planName} plan or higher.`);
  error.status = 403;
  error.code = code;
  error.details = {
    currentPlanKey: normalizedCurrent,
    requiredPlanKey: normalizedRequired,
    feature,
  };
  return error;
}

async function requirePlan(userId, requiredPlanKey, feature, options = {}) {
  const currentPlanKey = await getActivePlanKey(userId);

  if (isPlanAtLeast(currentPlanKey, requiredPlanKey)) {
    return {
      currentPlanKey,
      capabilities: getPlanCapabilities(currentPlanKey),
    };
  }

  throw buildUpgradeRequiredError({
    currentPlanKey,
    requiredPlanKey,
    feature,
    code: options.code,
  });
}

function getFinanceAccessRequirement({ range = 'month', mode = 'operator' } = {}) {
  const normalizedRange = ['month', 'quarter', 'year'].includes(String(range || '').toLowerCase())
    ? String(range).toLowerCase()
    : 'month';
  const normalizedMode = String(mode || 'operator').toLowerCase() === 'executive' ? 'executive' : 'operator';

  if (normalizedMode === 'executive') {
    return {
      range: normalizedRange,
      mode: normalizedMode,
      requiredPlanKey: 'business',
      feature: 'Executive dashboard mode',
    };
  }

  if (normalizedRange === 'year') {
    return {
      range: normalizedRange,
      mode: normalizedMode,
      requiredPlanKey: 'business',
      feature: '12-month finance reporting',
    };
  }

  if (normalizedRange === 'quarter') {
    return {
      range: normalizedRange,
      mode: normalizedMode,
      requiredPlanKey: 'professional',
      feature: 'Quarterly finance reporting',
    };
  }

  return {
    range: normalizedRange,
    mode: normalizedMode,
    requiredPlanKey: 'starter',
    feature: 'Monthly finance reporting',
  };
}

async function requireFinanceAccess(userId, request = {}) {
  const requirement = getFinanceAccessRequirement(request);
  const { currentPlanKey, capabilities } = await requirePlan(
    userId,
    requirement.requiredPlanKey,
    requirement.feature,
    { code: 'REPORTING_UPGRADE_REQUIRED' },
  );

  return {
    ...requirement,
    currentPlanKey,
    capabilities,
  };
}

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
  return normalizePlanKey(sub?.planKey || 'starter');
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

module.exports = {
  PLAN_ORDER,
  normalizePlanKey,
  getPlanCapabilities,
  isPlanAtLeast,
  buildUpgradeRequiredError,
  getFinanceAccessRequirement,
  getActivePlanKey,
  requirePlan,
  requireFinanceAccess,
  checkInvoiceMonthlyLimit,
};
