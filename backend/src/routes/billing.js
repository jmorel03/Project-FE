const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getPlans,
  getBillingSummary,
  createCheckoutSession,
  createPortalSession,
  createSetupIntent,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  cancelSubscription,
} = require('../controllers/billingController');

const router = Router();

router.get('/plans/public', getPlans);

router.use(authenticate);

router.get('/plans', getPlans);
router.get('/summary', getBillingSummary);
router.post('/checkout-session', createCheckoutSession);
router.post('/portal-session', createPortalSession);
router.post('/setup-intent', createSetupIntent);
router.post('/set-default-payment-method', setDefaultPaymentMethod);
router.post('/delete-payment-method', deletePaymentMethod);
router.post('/cancel-subscription', cancelSubscription);

module.exports = router;
