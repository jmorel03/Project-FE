const BUSINESS_SEAT_LIMIT = 5;
const TEAM_ROLES = ['admin', 'worker'];

function normalizeTeamRole(role) {
  const normalized = String(role || 'worker').toLowerCase();
  return TEAM_ROLES.includes(normalized) ? normalized : null;
}

function isBusinessPlan(planKey) {
  return String(planKey || '').toLowerCase() === 'business';
}

function resolveSeatLimit(planKey) {
  return isBusinessPlan(planKey) ? BUSINESS_SEAT_LIMIT : 1;
}

function buildTeamUpgradeRequiredError() {
  const error = new Error('Team seats require the Business plan.');
  error.status = 403;
  error.code = 'TEAM_UPGRADE_REQUIRED';
  return error;
}

function buildSeatLimitReachedError(limit = BUSINESS_SEAT_LIMIT) {
  const error = new Error(`Business plan supports up to ${limit} seats.`);
  error.status = 403;
  error.code = 'TEAM_SEAT_LIMIT_REACHED';
  error.details = { limit };
  return error;
}

function assertBusinessTeamAccess(planKey) {
  if (!isBusinessPlan(planKey)) {
    throw buildTeamUpgradeRequiredError();
  }
}

function assertSeatAvailable({ seatsUsed, limit = BUSINESS_SEAT_LIMIT }) {
  if (Number(seatsUsed) >= Number(limit)) {
    throw buildSeatLimitReachedError(limit);
  }
}

module.exports = {
  BUSINESS_SEAT_LIMIT,
  TEAM_ROLES,
  normalizeTeamRole,
  isBusinessPlan,
  resolveSeatLimit,
  buildTeamUpgradeRequiredError,
  buildSeatLimitReachedError,
  assertBusinessTeamAccess,
  assertSeatAvailable,
};
