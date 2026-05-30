const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const AdminController = require('../controllers/AdminController');

const adminOnly = [authenticate, authorize('admin')];

router.get('/stats', ...adminOnly, AdminController.getStats);
router.get('/users', ...adminOnly, AdminController.getUsers);
router.put('/users/:id', ...adminOnly, AdminController.updateUser);
router.delete('/users/:id', ...adminOnly, AdminController.deleteUser);
router.get('/orders', ...adminOnly, AdminController.getOrders);
router.put('/orders/:id/status', ...adminOnly, AdminController.overrideOrderStatus);
router.get('/products', ...adminOnly, AdminController.getProducts);
router.put('/products/:id/toggle', ...adminOnly, AdminController.toggleProduct);

module.exports = router;
