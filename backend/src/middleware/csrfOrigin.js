const { URL } = require('url');

function normalizeOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

function getAllowedOrigins() {
  return [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL]
    .map(normalizeOrigin)
    .filter(Boolean);
}

function originFromReferer(referer) {
  const raw = String(referer || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function getAdminOrigin() {
  const origin = normalizeOrigin(process.env.ADMIN_CLIENT_URL);
  return origin ? [origin] : [];
}

// Defense-in-depth for cookie-auth endpoints (refresh/logout):
// require request Origin/Referer to match trusted frontend origins.
exports.requireTrustedOrigin = (req, res, next) => {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) {
    return res.status(500).json({ error: 'Trusted origins are not configured' });
  }

  const origin = normalizeOrigin(req.headers.origin);
  const refererOrigin = originFromReferer(req.headers.referer);
  const candidate = origin || refererOrigin;

  if (!candidate || !allowed.includes(candidate)) {
    return res.status(403).json({ error: 'Request origin not allowed' });
  }

  return next();
};

// Production-only guard for admin browser endpoints.
// In non-production, this remains relaxed for local tools and debugging.
exports.requireTrustedAdminOrigin = (req, res, next) => {
  if (!isProduction()) return next();

  const allowed = getAdminOrigin();
  if (allowed.length === 0) {
    return res.status(500).json({ error: 'Admin origin is not configured' });
  }

  const origin = normalizeOrigin(req.headers.origin);
  const refererOrigin = originFromReferer(req.headers.referer);
  const candidate = origin || refererOrigin;

  if (!candidate || !allowed.includes(candidate)) {
    return res.status(403).json({ error: 'Admin request origin not allowed' });
  }

  return next();
};