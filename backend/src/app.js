require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const invoiceRoutes = require('./routes/invoices');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const billingRoutes = require('./routes/billing');
const teamRoutes = require('./routes/team');
const billingWebhookRoutes = require('./routes/billingWebhook');
const supportRoutes = require('./routes/support');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');

if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  const num = Number(tp);
  app.set('trust proxy', tp === 'true' ? true : tp === 'false' ? false : !isNaN(num) ? num : tp);
}

// ─── Security ────────────────────────────────────────────────────────────────
const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL, 'http://localhost:5173']
  .filter(Boolean)
  .map((origin) => String(origin).trim());

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'self'"],
    },
  },
}));
app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server and local tools that send no Origin.
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 86400,
}));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many admin auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many support requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stripe webhook must receive raw body for signature verification
app.use('/api/billing/webhooks', billingWebhookRoutes);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Admin Subdomain Static Panel ───────────────────────────────────────────
const adminPanelCandidates = [
  path.resolve(__dirname, '../admin-panel'),
  path.resolve(__dirname, '../../admin-panel'),
  path.resolve(process.cwd(), 'admin-panel'),
];

const adminPanelDir = adminPanelCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, 'index.html')),
);
const hasAdminPanel = Boolean(adminPanelDir);
let adminHost = '';

try {
  if (process.env.ADMIN_CLIENT_URL) {
    adminHost = new URL(process.env.ADMIN_CLIENT_URL).hostname;
  }
} catch (error) {
  adminHost = '';
}

function resolveRequestHost(req) {
  // Check multiple sources in priority order.
  // req.hostname uses X-Forwarded-Host when trust proxy is enabled.
  // The raw header fallbacks handle cases where trust proxy isn't set yet.
  const candidates = [
    req.hostname,
    req.headers['x-forwarded-host'],
    req.headers['host'],
  ];
  for (const h of candidates) {
    const host = String(h || '').split(':')[0].trim().toLowerCase();
    if (host) return host;
  }
  return '';
}

function isAdminHostRequest(req) {
  if (!adminHost) return false;
  return resolveRequestHost(req) === String(adminHost).toLowerCase();
}

app.get('/admin-health', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    ok: true,
    requestHost: resolveRequestHost(req),
    reqHostname: req.hostname || null,
    headerHost: req.headers['host'] || null,
    headerXForwardedHost: req.headers['x-forwarded-host'] || null,
    expectedAdminHost: adminHost || null,
    adminHostMatched: isAdminHostRequest(req),
    hasAdminPanel,
    timestamp: new Date().toISOString(),
  });
});

if (hasAdminPanel && adminHost) {
  const adminStatic = express.static(adminPanelDir);

  app.use((req, res, next) => {
    const isAdminHost = isAdminHostRequest(req);

    if (!isAdminHost || req.path.startsWith('/api/')) {
      return next();
    }

    return adminStatic(req, res, () => {
      res.sendFile(path.join(adminPanelDir, 'index.html'));
    });
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/support', supportLimiter, supportRoutes);
app.use('/api/admin/auth', adminAuthLimiter);
app.use('/api/admin', adminRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
