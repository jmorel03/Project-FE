const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildUpgradeRequiredError,
  getFinanceAccessRequirement,
  getPlanCapabilities,
  isPlanAtLeast,
  normalizePlanKey,
} = require('../src/lib/planLimits');

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