const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const DeliveryController = require('../controllers/DeliveryController');

const deliveryOnly = [authenticate, authorize('delivery', 'admin')];

router.get('/orders/assigned', ...deliveryOnly, DeliveryController.getAssignedOrders);
router.get('/orders/available', ...deliveryOnly, DeliveryController.getAvailableOrders);
router.post('/orders/:id/accept', ...deliveryOnly, DeliveryController.acceptOrder);
router.put('/orders/:id/status', ...deliveryOnly, DeliveryController.updateOrderStatus);
router.put('/availability', ...deliveryOnly, DeliveryController.toggleAvailability);
router.get('/earnings', ...deliveryOnly, DeliveryController.getEarnings);

module.exports = router;
