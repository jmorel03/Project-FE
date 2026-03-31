const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { requireWorkspaceAdmin } = require('../middleware/workspace');
const { validate } = require('../middleware/validate');
const {
  getTeam,
  updateTeamWorkspace,
  addTeamMember,
  createInvite,
  revokeInvite,
  previewInvite,
  acceptInvite,
  updateTeamMemberRole,
  removeTeamMember,
} = require('../controllers/teamController');

const router = Router();

router.get('/invites/preview/:token', [
  param('token').isString().isLength({ min: 24 }),
], validate, previewInvite);

router.use(authenticate);

router.get('/', getTeam);
router.patch('/', requireWorkspaceAdmin, [
  body('name').isString().isLength({ min: 1, max: 80 }),
], validate, updateTeamWorkspace);
router.post('/invites/accept', [
  body('token').isString().isLength({ min: 24 }),
], validate, acceptInvite);

router.post('/members', requireWorkspaceAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin', 'worker']),
], validate, addTeamMember);

router.post('/invites', requireWorkspaceAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin', 'worker']),
], validate, createInvite);

router.delete('/invites/:inviteId', requireWorkspaceAdmin, [
  param('inviteId').isUUID(),
], validate, revokeInvite);

router.patch('/members/:memberUserId', requireWorkspaceAdmin, [
  param('memberUserId').isUUID(),
  body('role').isIn(['admin', 'worker']),
], validate, updateTeamMemberRole);

router.delete('/members/:memberUserId', requireWorkspaceAdmin, [
  param('memberUserId').isUUID(),
], validate, removeTeamMember);

// Business plan supports up to 5 total seats (owner + 4 members).

module.exports = router;
