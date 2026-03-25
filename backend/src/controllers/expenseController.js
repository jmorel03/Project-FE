const prisma = require('../lib/prisma');
const {
  isR2Configured,
  uploadExpenseReceiptToR2,
  deleteFromR2ByPublicUrl,
} = require('../services/r2Service');

// ─── Categories ──────────────────────────────────────────────────────────────

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const category = await prisma.expenseCategory.create({
      data: { userId: req.userId, name, color: color || '#6366f1' },
    });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const existing = await prisma.expenseCategory.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    await prisma.expenseCategory.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Expenses ────────────────────────────────────────────────────────────────

exports.getExpenses = async (req, res, next) => {
  try {
    const { categoryId, status, from, to, page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      userId: req.userId,
      ...(categoryId && { categoryId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { vendor: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...((from || to) && {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
        include: { category: { select: { id: true, name: true, color: true } } },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { category: true },
    });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    next(err);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const { vendor, description, amount, currency, date, categoryId, status, receipt, isBillable, notes } = req.body;

    if (categoryId) {
      const cat = await prisma.expenseCategory.findFirst({ where: { id: categoryId, userId: req.userId } });
      if (!cat) return res.status(404).json({ error: 'Category not found' });
    }

    const expense = await prisma.expense.create({
      data: {
        userId: req.userId,
        vendor,
        description,
        amount: Number(amount),
        currency: currency || 'USD',
        date: new Date(date),
        categoryId: categoryId || null,
        status: status || 'PENDING',
        receipt,
        isBillable: isBillable || false,
        notes,
      },
      include: { category: true },
    });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const existing = await prisma.expense.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    const allowed = ['vendor', 'description', 'amount', 'currency', 'date', 'categoryId', 'status', 'receipt', 'isBillable', 'isReimbursed', 'notes'];
    const data = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) {
        if (k === 'amount') data[k] = Number(req.body[k]);
        else if (k === 'date') data[k] = new Date(req.body[k]);
        else data[k] = req.body[k];
      }
    });

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json(expense);
  } catch (err) {
    next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const existing = await prisma.expense.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

exports.uploadExpenseReceipt = async (req, res, next) => {
  try {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Receipt file is required' });
    }

    if (!isR2Configured()) {
      return res.status(400).json({
        error: 'Cloudflare R2 is not configured. Set R2_* environment variables first.',
      });
    }

    const uploaded = await uploadExpenseReceiptToR2({
      userId: req.userId,
      expenseId: existing.id,
      fileBuffer: req.file.buffer,
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
    });

    if (existing.receipt) {
      await deleteFromR2ByPublicUrl(existing.receipt).catch(() => {});
    }

    const expense = await prisma.expense.update({
      where: { id: existing.id },
      data: { receipt: uploaded.url },
      include: { category: true },
    });

    res.json({
      message: 'Receipt uploaded',
      expense,
      receiptUrl: uploaded.url,
    });
  } catch (err) {
    next(err);
  }
};
