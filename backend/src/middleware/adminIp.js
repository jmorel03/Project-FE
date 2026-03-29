function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeIp(ip) {
  const raw = String(ip || '').trim();
  if (!raw) return '';
  if (raw === '::1') return '127.0.0.1';
  return raw.replace(/^::ffff:/, '');
}

function extractRequestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return normalizeIp(forwarded || req.ip || req.socket?.remoteAddress || '');
}

function isMatch(ip, rule) {
  if (rule === '*') return true;
  if (rule.endsWith('.*')) return ip.startsWith(rule.slice(0, -1));
  return ip === rule;
}

exports.requireAdminIpAllowlist = (req, res, next) => {
  const rules = parseCsv(process.env.ADMIN_IP_ALLOWLIST).map(normalizeIp);

  // If no allowlist is configured, do not block by IP.
  if (rules.length === 0) return next();

  const requestIp = extractRequestIp(req);
  const allowed = rules.some((rule) => isMatch(requestIp, rule));

  if (!allowed) {
    return res.status(403).json({ error: 'IP not allowed for admin access' });
  }

  return next();
};
