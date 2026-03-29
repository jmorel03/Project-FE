const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadReceipt } = require('../middleware/upload');
const {
  getExpenses, getExpense, createExpense, updateExpense, deleteExpense,
  getCategories, createCategory, deleteCategory,
  uploadExpenseReceipt,
} = require('../controllers/expenseController');

const router = Router();
router.use(authenticate);

// Categories
router.get('/categories', getCategories);
router.post('/categories', [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Must be a valid hex color'),
], validate, createCategory);
router.delete('/categories/:id', param('id').isUUID(), validate, deleteCategory);

// Expenses
router.get('/', getExpenses);
router.get('/:id', param('id').isUUID(), validate, getExpense);

router.post('/', [
  body('vendor').trim().notEmpty().withMessage('Vendor is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('categoryId').optional({ checkFalsy: true }).isUUID(),
  body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
  body('isBillable').optional().isBoolean(),
  body('isReimbursed').optional().isBoolean(),
], validate, createExpense);

router.put('/:id', [
  param('id').isUUID(),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('date').optional().isISO8601(),
  body('categoryId').optional({ checkFalsy: true }).isUUID(),
  body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
  body('isBillable').optional().isBoolean(),
  body('isReimbursed').optional().isBoolean(),
], validate, updateExpense);

router.post('/:id/receipt',
  param('id').isUUID(),
  validate,
  uploadReceipt.single('receipt'),
  uploadExpenseReceipt,
);

router.delete('/:id', param('id').isUUID(), validate, deleteExpense);

module.exports = router;
