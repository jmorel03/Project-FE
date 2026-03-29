const app = require('./app');
const prisma = require('./lib/prisma');
const cron = require('node-cron');
const { runDailyReminders } = require('./jobs/sendInvoiceReminders');

const PORT = process.env.PORT || 4000;

async function main() {
  try {
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
