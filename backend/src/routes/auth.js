const { Router } = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  resetPassword,
  changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must include at least one uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must include at least one special character'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
], validate, register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, login);

router.post('/refresh', refresh);
router.post('/reset-password', [
  body('token').isString().isLength({ min: 32 }),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must include at least one uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must include at least one special character'),
], validate, resetPassword);
router.post('/change-password', authenticate, [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must include at least one uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must include at least one special character'),
], validate, changePassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
], validate, updateProfile);

module.exports = router;
