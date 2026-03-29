const prisma = require('../lib/prisma');
const { generateInvoicePdf } = require('../services/pdfService');
const { sendInvoiceEmail } = require('../services/emailService');
const { inferReminderType, sendReminderForInvoice } = require('../services/invoiceReminderService');
const { checkInvoiceMonthlyLimit } = require('../lib/planLimits');

// Generates next invoice number like INV-0001
async function nextInvoiceNumber(userId) {
  const invoices = await prisma.invoice.findMany({
    where: { userId },
    select: { invoiceNumber: true },
  });

  const maxForUser = invoices.reduce((max, inv) => {
    const match = /^INV-(\d+)$/.exec(String(inv.invoiceNumber || ''));
    if (!match) return max;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);

  return `INV-${String(maxForUser + 1).padStart(4, '0')}`;
}

function calcTotals(items, taxRate = 0, discountRate = 0) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const discountAmount = subtotal * (discountRate / 100);
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const total = subtotal - discountAmount + taxAmount;
  return {
    subtotal: +subtotal.toFixed(2),
    taxAmount: +taxAmount.toFixed(2),
    discountAmount: +discountAmount.toFixed(2),
    total: +total.toFixed(2),
  };
}

async function sendInvoiceForUser(invoiceId, userId) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { client: true, items: { orderBy: { order: 'asc' } } },
  });

  if (!invoice) {
    const error = new Error('Invoice not found');
    error.status = 404;
    throw error;
  }

  if (!invoice.client.email) {
    const error = new Error('Client has no email address');
    error.status = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const pdfBuffer = await generateInvoicePdf(invoice, user);
  await sendInvoiceEmail({ invoice, client: invoice.client, user, pdfBuffer });

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'SENT', sentAt: new Date() },
    include: {
      client: true,
      items: { orderBy: { order: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' } },
      reminders: { orderBy: { sentAt: 'desc' }, take: 5 },
    },
  });
}

exports.getInvoices = async (req, res, next) => {
  try {
    const { status, clientId, from, to, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      userId: req.userId,
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(from || to
        ? {
            issueDate: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        client: true,
        items: { orderBy: { order: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
        reminders: { orderBy: { sentAt: 'desc' }, take: 5 },
      },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const limitHit = await checkInvoiceMonthlyLimit(req.userId);
    if (limitHit) {
      return res.status(403).json({ error: limitHit.message, code: limitHit.code, limit: limitHit.limit, used: limitHit.used });
    }

    const {
      clientId,
      dueDate,
      currency,
      items,
      taxRate = 0,
      discountRate = 0,
      notes,
      terms,
      status = 'DRAFT',
      sendNow = false,
    } = req.body;

    const client = await prisma.client.findFirst({ where: { id: clientId, userId: req.userId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (sendNow && !client.email) {
      return res.status(400).json({ error: 'Client has no email address' });
    }

    const totals = calcTotals(items, Number(taxRate), Number(discountRate));
    const shouldMarkAsSent = status === 'SENT' || sendNow;
    let invoice = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const invoiceNumber = await nextInvoiceNumber(req.userId);

      try {
        invoice = await prisma.invoice.create({
          data: {
            userId: req.userId,
            clientId,
            invoiceNumber,
            dueDate: new Date(dueDate),
            currency: currency || 'USD',
            taxRate: Number(taxRate),
            discountRate: Number(discountRate),
            notes,
            terms,
            status: shouldMarkAsSent ? 'SENT' : status,
            sentAt: shouldMarkAsSent ? new Date() : null,
            ...totals,
            items: {
              create: items.map((item, idx) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                total: +(Number(item.quantity) * Number(item.unitPrice)).toFixed(2),
                order: idx,
              })),
            },
          },
          include: {
            client: true,
            items: { orderBy: { order: 'asc' } },
          },
        });
        break;
      } catch (error) {
        if (error?.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }

    if (!invoice) {
      return res.status(409).json({
        error: 'Could not generate a unique invoice number. Please try again.',
      });
    }

    if (sendNow) {
      invoice = await sendInvoiceForUser(invoice.id, req.userId);
    }

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    if (existing.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot edit a paid invoice' });
    }

    const { items, taxRate, discountRate, dueDate, currency, notes, terms, status, sendNow } = req.body;
    const data = {};

    if (dueDate) data.dueDate = new Date(dueDate);
    if (currency) data.currency = currency;
    if (notes !== undefined) data.notes = notes;
    if (terms !== undefined) data.terms = terms;
    if (status) data.status = status;
    if (status === 'SENT' && existing.status !== 'SENT') {
      data.sentAt = new Date();
    }
    if (status === 'DRAFT') {
      data.sentAt = null;
    }

    if (items) {
      const totals = calcTotals(
        items,
        Number(taxRate ?? existing.taxRate),
        Number(discountRate ?? existing.discountRate),
      );
      Object.assign(data, totals, {
        taxRate: Number(taxRate ?? existing.taxRate),
        discountRate: Number(discountRate ?? existing.discountRate),
      });

      await prisma.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
      data.items = {
        create: items.map((item, idx) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: +(Number(item.quantity) * Number(item.unitPrice)).toFixed(2),
          order: idx,
        })),
      };
    }

    let invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data,
      include: {
        client: true,
        items: { orderBy: { order: 'asc' } },
        payments: true,
      },
    });

    if (sendNow) {
      invoice = await sendInvoiceForUser(req.params.id, req.userId);
    }

    res.json(invoice);
  } catch (err) {
    next(err);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};

exports.sendInvoice = async (req, res, next) => {
  try {
    const updated = await sendInvoiceForUser(req.params.id, req.userId);

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { payments: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const { amount, method, reference, paidAt, notes } = req.body;

    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: Number(amount),
        method,
        reference,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        notes,
      },
    });

    const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0) + Number(amount);
    const invoiceTotal = Number(invoice.total);

    let status = 'PARTIAL';
    if (totalPaid >= invoiceTotal) status = 'PAID';

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: totalPaid,
        status,
        ...(status === 'PAID' ? { paidAt: new Date() } : {}),
      },
    });

    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
};

exports.downloadPdf = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { client: true, items: { orderBy: { order: 'asc' } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const pdfBuffer = await generateInvoicePdf(invoice, user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

exports.sendReminder = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        client: true,
        reminders: { orderBy: { sentAt: 'desc' }, take: 5 },
      },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const type = req.body?.type || inferReminderType(invoice);

    const result = await sendReminderForInvoice({
      invoice,
      user,
      type,
      force: Boolean(req.body?.force),
    });

    if (result.skipped) {
      return res.status(409).json({
        error: 'A reminder of this type was already sent today',
        reminderType: result.reminderType,
      });
    }

    const refreshedInvoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        client: true,
        items: { orderBy: { order: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
        reminders: { orderBy: { sentAt: 'desc' }, take: 5 },
      },
    });

    res.json({
      message: 'Reminder sent successfully',
      reminderType: result.reminderType,
      invoice: refreshedInvoice,
    });
  } catch (err) {
    next(err);
  }
};
