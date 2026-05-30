const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const PaymentController = require('../controllers/PaymentController');
const pool = require('../config/database');

// GET /api/subscriptions/my-plan — current plan info for authenticated supplier
router.get('/my-plan', authenticate, authorize('supplier'), async (req, res) => {
  try {
    const { userId } = req.user;

    const [profileResult, subscriptionResult] = await Promise.all([
      pool.query('SELECT account_type FROM supplier_profiles WHERE user_id = $1', [userId]),
      Subscription.findActiveByUser(userId),
    ]);

    const accountType = profileResult.rows[0]?.account_type || 'free';
    const planDetails = Subscription.getPlanDetails(accountType);

    res.json({
      accountType,
      plan: planDetails,
      activeSubscription: subscriptionResult || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// POST /api/subscriptions/checkout — initiate Stripe checkout for a plan upgrade
// Delegates to PaymentController.createSubscription (already handles free vs paid)
router.post('/checkout', authenticate, authorize('supplier'), PaymentController.createSubscription);

// DELETE /api/subscriptions — cancel active subscription, downgrade to free
router.delete('/', authenticate, authorize('supplier'), async (req, res) => {
  try {
    const { userId } = req.user;

    const sub = await Subscription.findActiveByUser(userId);
    if (sub) {
      await Subscription.cancel(sub.id);
    }

    await pool.query(
      'UPDATE supplier_profiles SET account_type = $1 WHERE user_id = $2',
      ['free', userId]
    );

    res.json({ message: 'Subscription cancelled, plan downgraded to free' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;
