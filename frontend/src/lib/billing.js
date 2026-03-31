const PLAN_ORDER = ['starter', 'professional', 'business'];

export function normalizePlanKey(planKey) {
  const normalized = String(planKey || 'starter').toLowerCase();
  return PLAN_ORDER.includes(normalized) ? normalized : 'starter';
}

export function isPlanAtLeast(currentPlanKey, requiredPlanKey) {
  return PLAN_ORDER.indexOf(normalizePlanKey(currentPlanKey)) >= PLAN_ORDER.indexOf(normalizePlanKey(requiredPlanKey));
}

export function resolveActivePlanKey(summaryData) {
  const subscriptions = summaryData?.subscriptions || [];
  const persistedSubscriptions = summaryData?.persistedSubscriptions || [];
  const plans = summaryData?.plans || [];

  const activeSub = subscriptions.find((s) => s.status === 'active' || s.status === 'trialing');
  const derivedPlanKey =
    activeSub?.planKey
    ?? (activeSub?.items?.[0]?.priceId
      ? plans.find((plan) => plan.priceId === activeSub.items[0].priceId)?.key
      : null)
    ?? persistedSubscriptions.find((sub) => sub.status === 'active' || sub.status === 'trialing')?.planKey
    ?? 'starter';

  return normalizePlanKey(derivedPlanKey);
}