const { Router } = require('express');
const express = require('express');
const { handleStripeWebhook } = require('../controllers/billingController');

const router = Router();

router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = router;
