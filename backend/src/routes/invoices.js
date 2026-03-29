const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  sendInvoice, recordPayment, downloadPdf, sendReminder,
} = require('../controllers/invoiceController');

const router = Router();
router.use(authenticate);

router.get('/', getInvoices);
router.get('/:id', param('id').isUUID(), validate, getInvoice);
router.get('/:id/pdf', param('id').isUUID(), validate, downloadPdf);

router.post('/', [
  body('clientId').isUUID().withMessage('Valid client ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('status').optional().isIn(['DRAFT', 'SENT']),
  body('sendNow').optional().isBoolean(),
  body('items').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Item quantity must be positive'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Item unit price must be non-negative'),
], validate, createInvoice);

router.put('/:id', [
  param('id').isUUID(),
  body('dueDate').optional().isISO8601(),
  body('status').optional().isIn(['DRAFT', 'SENT']),
  body('sendNow').optional().isBoolean(),
  body('items').optional().isArray({ min: 1 }),
], validate, updateInvoice);

router.delete('/:id', param('id').isUUID(), validate, deleteInvoice);

router.post('/:id/send', param('id').isUUID(), validate, sendInvoice);
router.post('/:id/remind', [
  param('id').isUUID(),
  body('type').optional().isIn(['MANUAL', 'UPCOMING', 'DUE_TODAY', 'OVERDUE', 'FINAL_NOTICE']),
], validate, sendReminder);

router.post('/:id/payments', [
  param('id').isUUID(),
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be positive'),
  body('paidAt').optional().isISO8601(),
], validate, recordPayment);

module.exports = router;
