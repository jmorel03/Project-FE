const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getClients, getClient, createClient, updateClient, deleteClient,
} = require('../controllers/clientController');

const router = Router();
router.use(authenticate);

router.get('/', getClients);
router.get('/:id', param('id').isUUID(), validate, getClient);

// Create, update, delete clients
router.post('/', [
  body('name').trim().notEmpty().withMessage('Client name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
], validate, createClient);


// Update client - only name and email can be updated
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
], validate, updateClient);

router.delete('/:id', param('id').isUUID(), validate, deleteClient);

module.exports = router;
