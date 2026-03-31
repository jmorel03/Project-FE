const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireWorkspaceAdmin } = require('../middleware/workspace');
const {
  getPlans,
  getBillingSummary,
  createCheckoutSession,
  finalizeCheckoutSession,
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
router.post('/checkout-session', requireWorkspaceAdmin, createCheckoutSession);
router.post('/checkout-session/finalize', requireWorkspaceAdmin, finalizeCheckoutSession);
router.post('/portal-session', requireWorkspaceAdmin, createPortalSession);
router.post('/setup-intent', requireWorkspaceAdmin, createSetupIntent);
router.post('/set-default-payment-method', requireWorkspaceAdmin, setDefaultPaymentMethod);
router.post('/delete-payment-method', requireWorkspaceAdmin, deletePaymentMethod);
router.post('/cancel-subscription', requireWorkspaceAdmin, cancelSubscription);

module.exports = router;
