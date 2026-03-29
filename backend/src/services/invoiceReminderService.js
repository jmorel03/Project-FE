const prisma = require('../lib/prisma');
const { differenceInCalendarDays, endOfDay, startOfDay } = require('date-fns');
const { sendInvoiceReminderEmail } = require('./emailService');

function getBalanceDue(invoice) {
  return Math.max(Number(invoice.total) - Number(invoice.amountPaid || 0), 0);
}

function inferReminderType(invoice, now = new Date()) {
  const daysUntilDue = differenceInCalendarDays(startOfDay(invoice.dueDate), startOfDay(now));

  if (daysUntilDue > 0) return 'UPCOMING';
  if (daysUntilDue === 0) return 'DUE_TODAY';
  if (daysUntilDue <= -14) return 'FINAL_NOTICE';
  return 'OVERDUE';
}

async function reminderAlreadySentToday(invoiceId, type, now = new Date()) {
  const existing = await prisma.invoiceReminder.findFirst({
    where: {
      invoiceId,
      type,
      sentAt: {
        gte: startOfDay(now),
        lte: endOfDay(now),
      },
    },
  });

  return Boolean(existing);
}

async function sendReminderForInvoice({ invoice, user, type, force = false, now = new Date() }) {
  if (!invoice?.client?.email) {
    throw new Error('Client has no email address');
  }

  if (['PAID', 'CANCELLED', 'DRAFT'].includes(invoice.status)) {
    throw new Error('Only sent or partially paid invoices can receive reminders');
  }

  const reminderType = type || inferReminderType(invoice, now);

  if (!force && reminderType !== 'MANUAL') {
    const alreadySent = await reminderAlreadySentToday(invoice.id, reminderType, now);
    if (alreadySent) {
      return { skipped: true, reason: 'already-sent-today', reminderType };
    }
  }

  const balanceDue = getBalanceDue(invoice);
  const daysUntilDue = differenceInCalendarDays(startOfDay(invoice.dueDate), startOfDay(now));

  await sendInvoiceReminderEmail({
    invoice,
    client: invoice.client,
    user,
    reminderType,
    balanceDue,
    daysUntilDue,
  });

  const subjectMap = {
    MANUAL: `Reminder: invoice ${invoice.invoiceNumber}`,
    UPCOMING: `Upcoming due date: ${invoice.invoiceNumber}`,
    DUE_TODAY: `Due today: ${invoice.invoiceNumber}`,
    OVERDUE: `Overdue: ${invoice.invoiceNumber}`,
    FINAL_NOTICE: `Final notice: ${invoice.invoiceNumber}`,
  };

  const reminder = await prisma.invoiceReminder.create({
    data: {
      invoiceId: invoice.id,
      userId: user.id,
      type: reminderType,
      subject: subjectMap[reminderType],
      sentAt: now,
    },
  });

  return { skipped: false, reminderType, reminder };
}

module.exports = {
  getBalanceDue,
  inferReminderType,
  sendReminderForInvoice,
};