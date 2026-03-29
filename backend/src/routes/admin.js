const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireAdmin2FA } = require('../middleware/admin');
const { requireAdminIpAllowlist } = require('../middleware/adminIp');
const {
	getOverview,
	getUsers,
	suspendUser,
	triggerPasswordReset,
	cancelUserSubscription,
} = require('../controllers/adminController');
const { adminLogin } = require('../controllers/adminAuthController');
const { validate } = require('../middleware/validate');

const router = Router();

router.post('/auth/login', requireAdminIpAllowlist, [
	body('email').isEmail().normalizeEmail(),
	body('password').notEmpty(),
	body('totp').isLength({ min: 6, max: 8 }),
], validate, adminLogin);

router.use(requireAdminIpAllowlist, authenticate, requireAdmin2FA, requireAdmin);

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.post('/users/:id/suspend', [
	param('id').isUUID(),
	body('suspended').optional().isBoolean(),
	body('reason').optional().isString().isLength({ max: 500 }),
], validate, suspendUser);
router.post('/users/:id/reset-password', [param('id').isUUID()], validate, triggerPasswordReset);
router.post('/users/:id/cancel-subscription', [param('id').isUUID()], validate, cancelUserSubscription);

module.exports = router;
