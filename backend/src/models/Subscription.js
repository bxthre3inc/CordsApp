const pool = require('../config/database');

class Subscription {
  static async create(subscriptionData) {
    const { userId, planType, startDate, endDate, stripeSubscriptionId } = subscriptionData;

    const query = `
      INSERT INTO subscriptions (
        user_id, plan_type, start_date, end_date, stripe_subscription_id, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'active', NOW())
      RETURNING *;
    `;

    const result = await pool.query(query, [userId, planType, startDate, endDate, stripeSubscriptionId]);
    return result.rows[0];
  }

  static async findActiveByUser(userId) {
    const query = `
      SELECT * FROM subscriptions 
      WHERE user_id = $1 AND status = 'active' AND end_date > NOW()
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async cancel(id) {
    const query = `
      UPDATE subscriptions 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getPlanDetails(planType) {
    const plans = {
      'free': {
        name: 'Free',
        price: 0,
        commission: 0.20, // 20% commission
        features: ['Limited product listings', 'Basic analytics']
      },
      'starter': {
        name: 'Starter',
        price: 29.99,
        commission: 0.10, // 10% commission
        features: ['Unlimited product listings', 'Advanced analytics', 'Priority support']
      },
      'professional': {
        name: 'Professional',
        price: 99.99,
        commission: 0.05, // 5% commission
        features: ['All Starter features', 'Featured listings', 'Custom branding', 'API access']
      }
    };
    return plans[planType];
  }
}

module.exports = Subscription;
