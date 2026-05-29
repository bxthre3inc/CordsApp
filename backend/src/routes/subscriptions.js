const express = require('express');
const router = express.Router();

// Placeholder routes for subscription management
router.get('/', (req, res) => {
  res.json({ message: 'List subscriptions' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create subscription' });
});

module.exports = router;
