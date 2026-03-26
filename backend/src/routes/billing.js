const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getPlans,
  getBillingSummary,
  createCheckoutSession,
  createPortalSession,
} = require('../controllers/billingController');

const router = Router();

router.use(authenticate);

router.get('/plans', getPlans);
router.get('/summary', getBillingSummary);
router.post('/checkout-session', createCheckoutSession);
router.post('/portal-session', createPortalSession);

module.exports = router;
