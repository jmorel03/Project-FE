const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getStats, getRevenueChart, getRecentActivity, getInsights, getFinanceSummary } = require('../controllers/dashboardController');

const router = Router();
router.use(authenticate);

router.get('/stats', getStats);
router.get('/finance', getFinanceSummary);
router.get('/revenue', getRevenueChart);
router.get('/activity', getRecentActivity);
router.get('/insights', getInsights);

module.exports = router;
