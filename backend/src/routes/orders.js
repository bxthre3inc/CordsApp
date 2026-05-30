const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('buyer'), OrderController.create);
router.get('/delivery-estimate', authenticate, OrderController.deliveryEstimate);
router.get('/:id', authenticate, OrderController.getById);
router.get('/buyer/orders', authenticate, authorize('buyer'), OrderController.getBuyerOrders);
router.get('/supplier/orders', authenticate, authorize('supplier'), OrderController.getSupplierOrders);
router.put('/:id/status', authenticate, OrderController.updateStatus);
router.put('/:id/assign-delivery', authenticate, authorize('supplier'), OrderController.assignDeliveryTeam);

module.exports = router;
