const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticate, authorize } = require('../middleware/auth');

// Specific paths must come BEFORE /:id to avoid Express swallowing them as ID params.
router.get('/nearby',       ProductController.getNearby);
router.get('/price/average',ProductController.getAveragePrice);
router.get('/price-index',  ProductController.getPriceIndex);   // public — no auth

router.post('/',                authenticate, authorize('supplier'), ProductController.create);
router.get('/supplier/:supplierId', ProductController.getBySupplier);
router.get('/:id',              ProductController.getById);
router.put('/:id',              authenticate, authorize('supplier'), ProductController.update);

module.exports = router;
