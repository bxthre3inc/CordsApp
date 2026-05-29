const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/order/:orderId', authenticate, authorize('buyer'), PaymentController.createOrderPayment);
router.post('/subscription', authenticate, authorize('supplier'), PaymentController.createSubscription);
router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.handleWebhook);

module.exports = router;
