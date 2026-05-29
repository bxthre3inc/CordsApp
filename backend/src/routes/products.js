const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('supplier'), ProductController.create);
router.get('/:id', ProductController.getById);
router.get('/supplier/:supplierId', ProductController.getBySupplier);
router.get('/nearby', ProductController.getNearby);
router.get('/price/average', ProductController.getAveragePrice);
router.put('/:id', authenticate, authorize('supplier'), ProductController.update);

module.exports = router;
