const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildUpgradeRequiredError,
  checkInvoiceMonthlyLimit,
  getActivePlanKey,
  getFinanceAccessRequirement,
  getPlanCapabilities,
  isPlanAtLeast,
  normalizePlanKey,
  requireFinanceAccess,
  requirePlan,
} = require('../src/lib/planLimits');
const prisma = require('../src/lib/prisma');

const originalBillingSubscriptionFindFirst = prisma.billingSubscription.findFirst;
const originalInvoiceCount = prisma.invoice.count;

test.afterEach(() => {
  prisma.billingSubscription.findFirst = originalBillingSubscriptionFindFirst;
  prisma.invoice.count = originalInvoiceCount;
});

test('normalizePlanKey falls back to starter for unknown plans', () => {
  assert.equal(normalizePlanKey('BUSINESS'), 'business');
  assert.equal(normalizePlanKey('unknown-tier'), 'starter');
  assert.equal(normalizePlanKey(), 'starter');
});

test('plan hierarchy compares tiers correctly', () => {
  assert.equal(isPlanAtLeast('business', 'professional'), true);
  assert.equal(isPlanAtLeast('professional', 'starter'), true);
  assert.equal(isPlanAtLeast('starter', 'business'), false);
});

test('plan capabilities map starter, professional, and business entitlements', () => {
  assert.deepEqual(getPlanCapabilities('starter').financeRanges, ['month']);
  assert.equal(getPlanCapabilities('starter').canUseReminders, false);
  assert.deepEqual(getPlanCapabilities('professional').financeRanges, ['month', 'quarter']);
  assert.equal(getPlanCapabilities('professional').canUseRevenueReporting, true);
  assert.deepEqual(getPlanCapabilities('business').financeRanges, ['month', 'quarter', 'year']);
  assert.equal(getPlanCapabilities('business').canUseExecutiveMode, true);
});

test('finance access requirements escalate by range and mode', () => {
  assert.deepEqual(getFinanceAccessRequirement({ range: 'month', mode: 'operator' }), {
    range: 'month',
    mode: 'operator',
    requiredPlanKey: 'starter',
    feature: 'Monthly finance reporting',
  });

  assert.deepEqual(getFinanceAccessRequirement({ range: 'quarter', mode: 'operator' }), {
    range: 'quarter',
    mode: 'operator',
    requiredPlanKey: 'professional',
    feature: 'Quarterly finance reporting',
  });

  assert.deepEqual(getFinanceAccessRequirement({ range: 'year', mode: 'operator' }), {
    range: 'year',
    mode: 'operator',
    requiredPlanKey: 'business',
    feature: '12-month finance reporting',
  });

  assert.deepEqual(getFinanceAccessRequirement({ range: 'month', mode: 'executive' }), {
    range: 'month',
    mode: 'executive',
    requiredPlanKey: 'business',
    feature: 'Executive dashboard mode',
  });
});

test('upgrade errors expose plan details for the client', () => {
  const error = buildUpgradeRequiredError({
    currentPlanKey: 'starter',
    requiredPlanKey: 'professional',
    feature: 'Invoice reminders',
    code: 'REMINDER_UPGRADE_REQUIRED',
  });

  assert.equal(error.status, 403);
  assert.equal(error.code, 'REMINDER_UPGRADE_REQUIRED');
  assert.equal(error.message, 'Invoice reminders requires the Professional plan or higher.');
  assert.deepEqual(error.details, {
    currentPlanKey: 'starter',
    requiredPlanKey: 'professional',
    feature: 'Invoice reminders',
  });
});

test('getActivePlanKey falls back to starter when no active subscription exists', async () => {
  prisma.billingSubscription.findFirst = async () => null;

  const planKey = await getActivePlanKey('user-1');

  assert.equal(planKey, 'starter');
});

test('requirePlan allows access when subscription meets required tier', async () => {
  prisma.billingSubscription.findFirst = async () => ({ planKey: 'business' });

  const access = await requirePlan('user-1', 'professional', 'Revenue trend reporting');

  assert.equal(access.currentPlanKey, 'business');
  assert.equal(access.capabilities.canUseRevenueReporting, true);
  assert.equal(access.capabilities.canUseExecutiveMode, true);
});

test('requirePlan blocks access when subscription tier is too low', async () => {
  prisma.billingSubscription.findFirst = async () => ({ planKey: 'starter' });

  await assert.rejects(
    () => requirePlan('user-1', 'professional', 'Invoice reminders', { code: 'REMINDER_UPGRADE_REQUIRED' }),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.code, 'REMINDER_UPGRADE_REQUIRED');
      assert.equal(error.details.currentPlanKey, 'starter');
      assert.equal(error.details.requiredPlanKey, 'professional');
      return true;
    },
  );
});

test('requireFinanceAccess enforces business-only executive mode', async () => {
  prisma.billingSubscription.findFirst = async () => ({ planKey: 'professional' });

  await assert.rejects(
    () => requireFinanceAccess('user-1', { range: 'month', mode: 'executive' }),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.code, 'REPORTING_UPGRADE_REQUIRED');
      assert.equal(error.details.feature, 'Executive dashboard mode');
      assert.equal(error.details.requiredPlanKey, 'business');
      return true;
    },
  );
});

test('checkInvoiceMonthlyLimit blocks starter users at monthly cap', async () => {
  prisma.billingSubscription.findFirst = async () => ({ planKey: 'starter' });
  prisma.invoice.count = async () => 5;

  const result = await checkInvoiceMonthlyLimit('user-1');

  assert.equal(result.code, 'PLAN_LIMIT_REACHED');
  assert.equal(result.limit, 5);
  assert.equal(result.used, 5);
});

test('checkInvoiceMonthlyLimit does not cap paid plans', async () => {
  prisma.billingSubscription.findFirst = async () => ({ planKey: 'professional' });
  prisma.invoice.count = async () => {
    throw new Error('invoice.count should not be called for paid plans');
  };

  const result = await checkInvoiceMonthlyLimit('user-1');

  assert.equal(result, null);
});