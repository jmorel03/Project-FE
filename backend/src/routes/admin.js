const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireAdmin2FA } = require('../middleware/admin');
const { requireAdminIpAllowlist } = require('../middleware/adminIp');
const { requireTrustedAdminOrigin } = require('../middleware/csrfOrigin');
const {
	getOverview,
	getUsers,
	getTeams,
	getTeamByOwner,
	suspendUser,
	resetUserLockout,
	resetUserPassword,
	cancelUserSubscription,
	deleteUserAccount,
} = require('../controllers/adminController');
const { adminLogin, adminPreflight } = require('../controllers/adminAuthController');
const { validate } = require('../middleware/validate');

const router = Router();

router.post('/auth/preflight', requireTrustedAdminOrigin, requireAdminIpAllowlist, [
	body('email').isEmail().normalizeEmail(),
	body('password').notEmpty(),
], validate, adminPreflight);

router.post('/auth/login', requireTrustedAdminOrigin, requireAdminIpAllowlist, [
	body('email').isEmail().normalizeEmail(),
	body('password').notEmpty(),
	body('totp').matches(/^\d{6,8}$/).withMessage('TOTP must be a 6-8 digit code'),
], validate, adminLogin);

router.use(requireTrustedAdminOrigin, requireAdminIpAllowlist, authenticate, requireAdmin2FA, requireAdmin);

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.get('/teams', getTeams);
router.get('/teams/:ownerUserId', [param('ownerUserId').isUUID()], validate, getTeamByOwner);
router.post('/users/:id/suspend', [
	param('id').isUUID(),
	body('suspended').optional().isBoolean(),
	body('reason').optional().isString().isLength({ max: 500 }),
], validate, suspendUser);
router.post('/users/:id/reset-lockout', [
	param('id').isUUID(),
], validate, resetUserLockout);
router.post('/users/:id/reset-password', [
	param('id').isUUID(),
	body('newPassword').isString().isLength({ min: 8 }),
], validate, resetUserPassword);
router.post('/users/:id/cancel-subscription', [param('id').isUUID()], validate, cancelUserSubscription);
router.delete('/users/:id', [
	param('id').isUUID(),
	body('reason').optional().isString().isLength({ max: 500 }),
], validate, deleteUserAccount);

module.exports = router;
