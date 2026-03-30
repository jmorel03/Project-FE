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