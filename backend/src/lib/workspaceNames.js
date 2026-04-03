const prisma = require('./prisma');

function deriveWorkspaceName(owner) {
  const company = String(owner?.companyName || '').trim();
  if (company) return company;

  const personal = [owner?.firstName, owner?.lastName]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ');

  return personal ? `${personal} Workspace` : 'Team Workspace';
}

function parseWorkspaceNameSuffix(name, baseName) {
  if (name === baseName) return 1;

  const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(name || '').match(new RegExp(`^${escapedBase} \\(#(\\d+)\\)$`));
  if (!match) return 0;

  const num = Number(match[1]);
  return Number.isFinite(num) && num > 1 ? num : 0;
}

async function resolveUniqueWorkspaceName(name, options = {}) {
  const baseName = String(name || '').trim() || 'Team Workspace';
  const excludeOwnerUserId = options.excludeOwnerUserId ? String(options.excludeOwnerUserId) : null;

  const where = {
    OR: [
      { name: baseName },
      { name: { startsWith: `${baseName} (#` } },
    ],
  };

  if (excludeOwnerUserId) {
    where.NOT = { ownerUserId: excludeOwnerUserId };
  }

  const existing = await prisma.teamWorkspace.findMany({
    where,
    select: { name: true },
  });

  if (!existing.length) {
    return baseName;
  }

  const used = new Set(existing.map((x) => String(x.name || '')));
  if (!used.has(baseName)) {
    return baseName;
  }

  let nextSuffix = 2;
  for (const row of existing) {
    const suffix = parseWorkspaceNameSuffix(row.name, baseName);
    if (suffix >= nextSuffix) {
      nextSuffix = suffix + 1;
    }
  }

  return `${baseName} (#${nextSuffix})`;
}

module.exports = {
  deriveWorkspaceName,
  resolveUniqueWorkspaceName,
};
