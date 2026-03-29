const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { getOverview, getUsers } = require('../controllers/adminController');

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/overview', getOverview);
router.get('/users', getUsers);

module.exports = router;
