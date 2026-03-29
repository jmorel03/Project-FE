const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

const MIN_PASSWORD_LENGTH = 8;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;
const UPPERCASE_REGEX = /[A-Z]/;

function validatePasswordStrength(password) {
  const value = String(password || '');
  if (value.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }

  if (!UPPERCASE_REGEX.test(value)) {
    return {
      valid: false,
      message: 'Password must include at least one uppercase letter.',
    };
  }

  if (!SPECIAL_CHAR_REGEX.test(value)) {
    return {
      valid: false,
      message: 'Password must include at least one special character.',
    };
  }

  return { valid: true };
}

async function isRecentPasswordReuse(userId, candidatePassword, currentPasswordHash) {
  const recent = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { passwordHash: true },
  });

  const hashesToCheck = [
    ...(currentPasswordHash ? [currentPasswordHash] : []),
    ...recent.map((entry) => entry.passwordHash),
  ];

  for (const hash of hashesToCheck) {
    const matches = await bcrypt.compare(String(candidatePassword || ''), hash);
    if (matches) return true;
  }

  return false;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  SPECIAL_CHAR_REGEX,
  UPPERCASE_REGEX,
  validatePasswordStrength,
  isRecentPasswordReuse,
};
