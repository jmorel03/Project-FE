const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/lib/prisma');
const teamController = require('../src/controllers/teamController');

const originalFindFirst = prisma.teamMember.findFirst;
const originalUpdate = prisma.teamMember.update;

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

test.afterEach(() => {
  prisma.teamMember.findFirst = originalFindFirst;
  prisma.teamMember.update = originalUpdate;
});

test('removeTeamMember blocks admin self-removal', async () => {
  let findFirstCalled = false;
  let updateCalled = false;

  prisma.teamMember.findFirst = async () => {
    findFirstCalled = true;
    return null;
  };

  prisma.teamMember.update = async () => {
    updateCalled = true;
    return null;
  };

  const req = {
    userId: 'owner-1',
    actorUserId: 'member-1',
    params: { memberUserId: 'member-1' },
  };
  const res = createMockRes();

  await teamController.removeTeamMember(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload?.code, 'TEAM_SELF_REMOVAL_NOT_ALLOWED');
  assert.equal(findFirstCalled, false);
  assert.equal(updateCalled, false);
});

test('removeTeamMember deactivates target member for workspace owner', async () => {
  let updateArgs = null;

  prisma.teamMember.findFirst = async () => ({ id: 'tm-1' });
  prisma.teamMember.update = async (args) => {
    updateArgs = args;
    return { id: 'tm-1', isActive: false };
  };

  const req = {
    userId: 'owner-1',
    actorUserId: 'owner-1',
    params: { memberUserId: 'member-2' },
  };
  const res = createMockRes();

  await teamController.removeTeamMember(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.message, 'Team member removed');
  assert.deepEqual(updateArgs, {
    where: { id: 'tm-1' },
    data: { isActive: false },
  });
});
