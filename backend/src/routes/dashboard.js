const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getStats, getRevenueChart, getRecentActivity } = require('../controllers/dashboardController');

const router = Router();
router.use(authenticate);

router.get('/stats', getStats);
router.get('/revenue', getRevenueChart);
router.get('/activity', getRecentActivity);

module.exports = router;
