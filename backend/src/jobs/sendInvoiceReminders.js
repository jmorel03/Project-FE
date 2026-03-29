const prisma = require('../lib/prisma');
const { differenceInCalendarDays, startOfDay } = require('date-fns');
const { sendReminderForInvoice } = require('../services/invoiceReminderService');

function getScheduledReminderType(invoice, now = new Date()) {
  const daysUntilDue = differenceInCalendarDays(startOfDay(invoice.dueDate), startOfDay(now));

  if (daysUntilDue === 3) return 'UPCOMING';
  if (daysUntilDue === 0) return 'DUE_TODAY';
  if (daysUntilDue === -3 || daysUntilDue === -7) return 'OVERDUE';
  if (daysUntilDue === -14) return 'FINAL_NOTICE';
  return null;
}

async function runDailyReminders() {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] },
      client: { email: { not: null } },
    },
    include: {
      client: true,
      user: true,
    },
  });

  let sentCount = 0;
  let skippedCount = 0;

  for (const invoice of invoices) {
    const type = getScheduledReminderType(invoice);
    if (!type) continue;

    try {
      const result = await sendReminderForInvoice({
        invoice,
        user: invoice.user,
        type,
      });

      if (result.skipped) skippedCount += 1;
      else sentCount += 1;
    } catch (error) {
      console.error(`Failed sending reminder for ${invoice.invoiceNumber}:`, error.message);
    }
  }

  console.log(`Invoice reminder job complete. Sent: ${sentCount}, skipped: ${skippedCount}`);
}

module.exports = { runDailyReminders };

// Allow running directly: node src/jobs/sendInvoiceReminders.js
if (require.main === module) {
  require('dotenv').config();
  prisma.$connect()
    .then(() => runDailyReminders())
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
      console.error('Invoice reminder job failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}