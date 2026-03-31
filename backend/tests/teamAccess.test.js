const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BUSINESS_SEAT_LIMIT,
  normalizeTeamRole,
  resolveSeatLimit,
  assertBusinessTeamAccess,
  assertSeatAvailable,
} = require('../src/lib/teamAccess');

test('normalizeTeamRole only accepts admin and worker', () => {
  assert.equal(normalizeTeamRole('admin'), 'admin');
  assert.equal(normalizeTeamRole('worker'), 'worker');
  assert.equal(normalizeTeamRole('ADMIN'), 'admin');
  assert.equal(normalizeTeamRole('owner'), null);
});

test('resolveSeatLimit returns 5 for business and 1 otherwise', () => {
  assert.equal(resolveSeatLimit('business'), BUSINESS_SEAT_LIMIT);
  assert.equal(resolveSeatLimit('professional'), 1);
  assert.equal(resolveSeatLimit('starter'), 1);
});

test('assertBusinessTeamAccess rejects non-business plans', () => {
  assert.throws(
    () => assertBusinessTeamAccess('professional'),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.code, 'TEAM_UPGRADE_REQUIRED');
      return true;
    },
  );

  assert.doesNotThrow(() => assertBusinessTeamAccess('business'));
});

test('assertSeatAvailable allows up to 5 seats and blocks at limit', () => {
  assert.doesNotThrow(() => assertSeatAvailable({ seatsUsed: 4, limit: BUSINESS_SEAT_LIMIT }));

  assert.throws(
    () => assertSeatAvailable({ seatsUsed: 5, limit: BUSINESS_SEAT_LIMIT }),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.code, 'TEAM_SEAT_LIMIT_REACHED');
      assert.equal(error.details.limit, BUSINESS_SEAT_LIMIT);
      return true;
    },
  );
});
