const prisma = require('../lib/prisma');
const { getActivePlanKey } = require('../lib/planLimits');
const { sendTeamInviteEmail } = require('../services/emailService');
const {
  BUSINESS_SEAT_LIMIT,
  normalizeTeamRole,
  resolveSeatLimit,
  assertBusinessTeamAccess,
  assertSeatAvailable,
} = require('../lib/teamAccess');
const {
  INVITE_TTL_DAYS,
  normalizeInviteEmail,
  hashInviteToken,
  createRawInviteToken,
  acceptInviteForUser,
} = require('../lib/teamInvites');

function deriveWorkspaceName(owner) {
  const company = String(owner?.companyName || '').trim();
  if (company) return company;
  const personal = [owner?.firstName, owner?.lastName].map((v) => String(v || '').trim()).filter(Boolean).join(' ');
  return personal ? `${personal} Workspace` : 'Team Workspace';
}

async function ensureWorkspace(ownerUserId) {
  const owner = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: { id: true, firstName: true, lastName: true, companyName: true },
  });

  if (!owner) return null;

  return prisma.teamWorkspace.upsert({
    where: { ownerUserId },
    create: {
      id: ownerUserId,
      ownerUserId,
      name: deriveWorkspaceName(owner),
    },
    update: {},
    select: { id: true, ownerUserId: true, name: true, createdAt: true, updatedAt: true },
  });
}

function buildClientUrl(req) {
  return String(process.env.CLIENT_URL || req.get('origin') || 'http://localhost:5173').replace(/\/+$/, '');
}

function buildInviteUrl(req, token) {
  return `${buildClientUrl(req)}/invite/${token}`;
}

async function createInviteForEmail({ req, ownerUserId, invitedByUserId, email, role }) {
  const normalizedEmail = normalizeInviteEmail(email);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const token = createRawInviteToken();
  const tokenHash = hashInviteToken(token);

  await prisma.teamInvite.updateMany({
    where: {
      ownerUserId,
      email: normalizedEmail,
      status: 'PENDING',
      expiresAt: { lte: now },
    },
    data: { status: 'EXPIRED' },
  });

  const invite = await prisma.teamInvite.create({
    data: {
      ownerUserId,
      invitedByUserId,
      email: normalizedEmail,
      role: role.toUpperCase(),
      tokenHash,
      expiresAt,
      status: 'PENDING',
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const owner = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: { firstName: true, lastName: true, companyName: true },
  });

  const ownerName = owner?.companyName || [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'A teammate';
  const inviteUrl = buildInviteUrl(req, token);

  await sendTeamInviteEmail({
    ownerName,
    inviteeEmail: normalizedEmail,
    role,
    inviteUrl,
    expiresAt,
  }).catch(() => null);

  return {
    ...invite,
    role: String(invite.role || '').toLowerCase(),
    inviteUrl,
  };
}

async function getTeamMembersForOwner(ownerUserId) {
  return prisma.teamMember.findMany({
    where: { ownerUserId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      memberUserId: true,
      createdAt: true,
      member: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      },
    },
  });
}

exports.getTeam = async (req, res, next) => {
  try {
    const ownerUserId = req.userId;
    const activePlanKey = await getActivePlanKey(ownerUserId);
    const [workspace, members, pendingInvites] = await Promise.all([
      ensureWorkspace(ownerUserId),
      getTeamMembersForOwner(ownerUserId),
      prisma.teamInvite.findMany({
        where: {
          ownerUserId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ]);

    const seatsUsed = 1 + members.length;
    const seatLimit = resolveSeatLimit(activePlanKey);

    res.json({
      workspace: {
        id: workspace?.id || ownerUserId,
        name: workspace?.name || 'Team Workspace',
        ownerUserId,
        actorUserId: req.actorUserId || req.userId,
        actorRole: req.workspaceRole || 'admin',
      },
      plan: {
        key: activePlanKey,
        seatLimit,
      },
      seats: {
        used: seatsUsed,
        limit: seatLimit,
        remaining: Math.max(seatLimit - seatsUsed, 0),
      },
      ownerSeat: {
        role: 'admin',
      },
      members: members.map((member) => ({
        role: String(member.role || '').toLowerCase(),
        user: member.member,
        joinedAt: member.createdAt,
      })),
      invites: pendingInvites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: String(invite.role || '').toLowerCase(),
        status: String(invite.status || '').toLowerCase(),
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTeamWorkspace = async (req, res, next) => {
  try {
    const ownerUserId = req.userId;
    const name = String(req.body?.name || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    if (name.length > 80) {
      return res.status(400).json({ error: 'Workspace name must be 80 characters or less' });
    }

    const workspace = await ensureWorkspace(ownerUserId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace owner not found' });
    }

    const updated = await prisma.teamWorkspace.update({
      where: { ownerUserId },
      data: { name },
      select: { id: true, ownerUserId: true, name: true, updatedAt: true },
    });

    return res.json({
      message: 'Workspace updated',
      workspace: updated,
    });
  } catch (error) {
    return next(error);
  }
};

exports.addTeamMember = async (req, res, next) => {
  try {
    const ownerUserId = req.userId;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = normalizeTeamRole(req.body?.role);

    if (!email) {
      return res.status(400).json({ error: 'Member email is required' });
    }

    if (!role) {
      return res.status(400).json({ error: 'Role must be admin or worker' });
    }

    const activePlanKey = await getActivePlanKey(ownerUserId);
    assertBusinessTeamAccess(activePlanKey);

    const [owner, memberUser, activeMembers] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ownerUserId },
        select: { id: true, email: true },
      }),
      prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
      }),
      prisma.teamMember.count({
        where: { ownerUserId, isActive: true },
      }),
    ]);

    if (!owner) {
      return res.status(404).json({ error: 'Workspace owner not found' });
    }

    if (!memberUser) {
      const invite = await createInviteForEmail({
        req,
        ownerUserId,
        invitedByUserId: req.actorUserId || req.userId,
        email,
        role,
      });

      return res.status(201).json({
        message: 'Invite sent',
        code: 'TEAM_INVITE_SENT',
        invite,
      });
    }

    if (memberUser.id === ownerUserId) {
      return res.status(400).json({ error: 'Workspace owner already has the admin seat' });
    }

    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        memberUserId: memberUser.id,
        isActive: true,
      },
      select: {
        id: true,
        ownerUserId: true,
      },
    });

    if (existingMembership && existingMembership.ownerUserId !== ownerUserId) {
      return res.status(409).json({
        error: 'User is already assigned to another team.',
        code: 'TEAM_MEMBER_ALREADY_ASSIGNED',
      });
    }

    if (!existingMembership) {
      assertSeatAvailable({ seatsUsed: 1 + activeMembers, limit: BUSINESS_SEAT_LIMIT });
    }

    const membership = await prisma.teamMember.upsert({
      where: { memberUserId: memberUser.id },
      create: {
        ownerUserId,
        memberUserId: memberUser.id,
        role: role.toUpperCase(),
        isActive: true,
      },
      update: {
        ownerUserId,
        role: role.toUpperCase(),
        isActive: true,
      },
      select: {
        role: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Team member assigned',
      member: {
        role: String(membership.role || '').toLowerCase(),
        user: membership.member,
        joinedAt: membership.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.createInvite = async (req, res, next) => {
  try {
    const ownerUserId = req.userId;
    const email = normalizeInviteEmail(req.body?.email);
    const role = normalizeTeamRole(req.body?.role);

    if (!email) {
      return res.status(400).json({ error: 'Member email is required' });
    }

    if (!role) {
      return res.status(400).json({ error: 'Role must be admin or worker' });
    }

    const activePlanKey = await getActivePlanKey(ownerUserId);
    assertBusinessTeamAccess(activePlanKey);

    const invite = await createInviteForEmail({
      req,
      ownerUserId,
      invitedByUserId: req.actorUserId || req.userId,
      email,
      role,
    });

    return res.status(201).json({
      message: 'Invite sent',
      invite,
    });
  } catch (error) {
    return next(error);
  }
};

exports.revokeInvite = async (req, res, next) => {
  try {
    const ownerUserId = req.userId;
    const inviteId = String(req.params.inviteId || '');

    const invite = await prisma.teamInvite.findFirst({
      where: {
        id: inviteId,
        ownerUserId,
        status: 'PENDING',
      },
      select: { id: true },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'REVOKED' },
    });

    return res.json({ message: 'Invite revoked' });
  } catch (error) {
    return next(error);
  }
};

exports.previewInvite = async (req, res, next) => {
  try {
    const token = String(req.params.token || '');
    const tokenHash = hashInviteToken(token);

    const invite = await prisma.teamInvite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        owner: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found', code: 'TEAM_INVITE_INVALID' });
    }

    const isExpired = invite.expiresAt <= new Date();
    const status = isExpired && invite.status === 'PENDING' ? 'expired' : String(invite.status || '').toLowerCase();

    return res.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: String(invite.role || '').toLowerCase(),
        status,
        expiresAt: invite.expiresAt,
      },
      workspace: {
        ownerName: invite.owner.companyName || [invite.owner.firstName, invite.owner.lastName].filter(Boolean).join(' ') || 'Xpensist workspace',
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.acceptInvite = async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    const actorUserId = req.actorUserId || req.userId;

    if (!token) {
      return res.status(400).json({ error: 'Invite token is required' });
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, email: true },
    });

    if (!actor) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accepted = await acceptInviteForUser({
      token,
      userId: actor.id,
      userEmail: actor.email,
    });

    return res.json({
      message: 'Invite accepted',
      workspace: accepted,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateTeamMemberRole = async (req, res, next) => {
  try {
    const ownerUserId = req.userId;
    const actorUserId = req.actorUserId || req.userId;
    const memberUserId = String(req.params.memberUserId || '').trim();
    const role = normalizeTeamRole(req.body?.role);

    if (!role) {
      return res.status(400).json({ error: 'Role must be admin or worker' });
    }

    const membership = await prisma.teamMember.findFirst({
      where: {
        ownerUserId,
        memberUserId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    if (memberUserId === actorUserId && role === 'worker') {
      return res.status(400).json({
        error: 'Admins cannot change their own role to worker.',
        code: 'TEAM_SELF_DEMOTION_NOT_ALLOWED',
      });
    }

    const updated = await prisma.teamMember.update({
      where: { id: membership.id },
      data: { role: role.toUpperCase() },
      select: {
        role: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
    });

    return res.json({
      message: 'Team role updated',
      member: {
        role: String(updated.role || '').toLowerCase(),
        user: updated.member,
        joinedAt: updated.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.removeTeamMember = async (req, res, next) => {
  try {
    const ownerUserId = req.userId;
    const memberUserId = String(req.params.memberUserId || '').trim();

    const membership = await prisma.teamMember.findFirst({
      where: {
        ownerUserId,
        memberUserId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    await prisma.teamMember.update({
      where: { id: membership.id },
      data: { isActive: false },
    });

    return res.json({ message: 'Team member removed' });
  } catch (error) {
    return next(error);
  }
};
