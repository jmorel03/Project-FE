const app = require('./app');
const prisma = require('./lib/prisma');
const cron = require('node-cron');
const { runDailyReminders } = require('./jobs/sendInvoiceReminders');

const PORT = process.env.PORT || 4000;

function validateSecurityConfig() {
  const issues = [];
  const jwtSecret = String(process.env.JWT_SECRET || '');
  const refreshSecret = String(process.env.JWT_REFRESH_SECRET || '');
  const maxFailedAttempts = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5);
  const lockMinutes = Number(process.env.LOGIN_LOCK_MINUTES || 15);
  const adminMaxFailedAttempts = Number(process.env.ADMIN_LOGIN_MAX_FAILED_ATTEMPTS || maxFailedAttempts);
  const adminLockMinutes = Number(process.env.ADMIN_LOGIN_LOCK_MINUTES || lockMinutes);

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CLIENT_URL) issues.push('CLIENT_URL is required in production');
    if (!process.env.TRUST_PROXY) issues.push('TRUST_PROXY should be set in production behind Cloudflare/Nginx');
    if (jwtSecret.length < 32 || jwtSecret.includes('change-me')) {
      issues.push('JWT_SECRET must be a strong random value of at least 32 characters');
    }
    if (refreshSecret.length < 32 || refreshSecret.includes('change-me')) {
      issues.push('JWT_REFRESH_SECRET must be a strong random value of at least 32 characters');
    }
    if (!Number.isFinite(maxFailedAttempts) || maxFailedAttempts < 1 || maxFailedAttempts > 20) {
      issues.push('LOGIN_MAX_FAILED_ATTEMPTS must be a number between 1 and 20');
    }
    if (!Number.isFinite(lockMinutes) || lockMinutes < 1 || lockMinutes > 120) {
      issues.push('LOGIN_LOCK_MINUTES must be a number between 1 and 120');
    }
    if (!Number.isFinite(adminMaxFailedAttempts) || adminMaxFailedAttempts < 1 || adminMaxFailedAttempts > 20) {
      issues.push('ADMIN_LOGIN_MAX_FAILED_ATTEMPTS must be a number between 1 and 20');
    }
    if (!Number.isFinite(adminLockMinutes) || adminLockMinutes < 1 || adminLockMinutes > 120) {
      issues.push('ADMIN_LOGIN_LOCK_MINUTES must be a number between 1 and 120');
    }
  }

  if (issues.length) {
    throw new Error(`Security configuration invalid: ${issues.join('; ')}`);
  }
}

async function main() {
  try {
    validateSecurityConfig();
    await prisma.$connect();
    console.log('✅ Database connected');

    // Run invoice reminder job every day at 8:00 AM server time
    cron.schedule('0 8 * * *', async () => {
      console.log('⏰ Running daily invoice reminders...');
      try {
        await runDailyReminders();
      } catch (err) {
        console.error('❌ Invoice reminder job failed:', err);
      }
    });
    console.log('📅 Invoice reminder job scheduled (daily at 08:00)');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
