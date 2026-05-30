const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const EnterpriseController = require('../controllers/EnterpriseController');

// Public: submit an enterprise inquiry
router.post('/inquiry', EnterpriseController.submitLead);

// Supplier: view own contract
router.get('/contract/me', authenticate, authorize('supplier', 'admin'), EnterpriseController.getMyContract);

// Admin: leads and contracts management
const adminOnly = [authenticate, authorize('admin')];
router.get('/leads', ...adminOnly, EnterpriseController.getLeads);
router.put('/leads/:id', ...adminOnly, EnterpriseController.updateLead);
router.get('/contracts', ...adminOnly, EnterpriseController.getContracts);
router.post('/contracts', ...adminOnly, EnterpriseController.upsertContract);
router.put('/contracts', ...adminOnly, EnterpriseController.upsertContract);
router.delete('/contracts/:id', ...adminOnly, EnterpriseController.cancelContract);

module.exports = router;
