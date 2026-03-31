const crypto = require('crypto');
const prisma = require('./prisma');
const { getActivePlanKey } = require('./planLimits');
const { BUSINESS_SEAT_LIMIT, assertBusinessTeamAccess, assertSeatAvailable } = require('./teamAccess');

const INVITE_TTL_DAYS = 7;

function normalizeInviteEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createRawInviteToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildInviteAcceptError(message, code, details = undefined) {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  if (details) error.details = details;
  return error;
}

async function acceptInviteForUser({ token, userId, userEmail }) {
  const normalizedEmail = normalizeInviteEmail(userEmail);
  const tokenHash = hashInviteToken(token);

  const invite = await prisma.teamInvite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      ownerUserId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invite) {
    throw buildInviteAcceptError('Invite link is invalid.', 'TEAM_INVITE_INVALID');
  }

  if (invite.status !== 'PENDING') {
    throw buildInviteAcceptError('Invite is no longer pending.', 'TEAM_INVITE_NOT_PENDING');
  }

  if (invite.expiresAt <= new Date()) {
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    });
    throw buildInviteAcceptError('Invite link has expired.', 'TEAM_INVITE_EXPIRED');
  }

  if (normalizeInviteEmail(invite.email) !== normalizedEmail) {
    throw buildInviteAcceptError('Invite email does not match this account.', 'TEAM_INVITE_EMAIL_MISMATCH');
  }

  if (invite.ownerUserId === userId) {
    throw buildInviteAcceptError('Workspace owner cannot accept a member invite.', 'TEAM_INVITE_OWNER_CONFLICT');
  }

  const [activeMembership, activePlanKey, activeMembers] = await Promise.all([
    prisma.teamMember.findFirst({
      where: { memberUserId: userId, isActive: true },
      select: { ownerUserId: true },
    }),
    getActivePlanKey(invite.ownerUserId),
    prisma.teamMember.count({ where: { ownerUserId: invite.ownerUserId, isActive: true } }),
  ]);

  if (activeMembership && activeMembership.ownerUserId !== invite.ownerUserId) {
    throw buildInviteAcceptError('This account is already assigned to another workspace.', 'TEAM_MEMBER_ALREADY_ASSIGNED');
  }

  assertBusinessTeamAccess(activePlanKey);

  if (!activeMembership) {
    assertSeatAvailable({ seatsUsed: 1 + activeMembers, limit: BUSINESS_SEAT_LIMIT });
  }

  await prisma.$transaction([
    prisma.teamMember.upsert({
      where: { memberUserId: userId },
      create: {
        ownerUserId: invite.ownerUserId,
        memberUserId: userId,
        role: invite.role,
        isActive: true,
      },
      update: {
        ownerUserId: invite.ownerUserId,
        role: invite.role,
        isActive: true,
      },
    }),
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedByUserId: userId,
        acceptedAt: new Date(),
      },
    }),
  ]);

  return {
    ownerUserId: invite.ownerUserId,
    role: String(invite.role || '').toLowerCase(),
  };
}

module.exports = {
  INVITE_TTL_DAYS,
  normalizeInviteEmail,
  hashInviteToken,
  createRawInviteToken,
  acceptInviteForUser,
};
