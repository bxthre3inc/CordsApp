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

  static getPlanDetails(planType) {
    const plans = {
      'free': {
        name: 'Free',
        price: 0,
        commission: 0.20,
        features: ['Up to 5 active listings', 'Basic analytics', 'Standard support']
      },
      'starter': {
        name: 'Starter',
        price: 29.99,
        commission: 0.10,
        features: ['Unlimited listings', 'Advanced analytics', 'Priority support', 'Pickup option']
      },
      'professional': {
        name: 'Professional',
        price: 99.99,
        commission: 0.05,
        features: ['All Starter features', 'Featured listings', 'Custom branding', 'API access', 'Buyer premium integration']
      },
      'enterprise': {
        name: 'Enterprise',
        price: null,         // negotiated — billed via Stripe invoice
        commission: 0,       // no commission; revenue from monthly_fee + per_cord_fee
        features: ['Everything in Professional', 'Custom per-cord or monthly flat rate', 'Negotiated per-mile delivery cut', 'Only pay card processing fees', 'Dedicated account manager', 'SLA support', 'Custom contract']
      }
    };
    return plans[planType] || plans['free'];
  }

  // Returns commission rate for a supplier given their account_type
  static async getCommissionRate(supplierId) {
    const pool = require('../config/database');
    const result = await pool.query(
      'SELECT account_type FROM supplier_profiles WHERE user_id = $1',
      [supplierId]
    );
    const accountType = result.rows[0]?.account_type || 'free';
    const plan = this.getPlanDetails(accountType);
    return plan.commission;
  }
}

module.exports = Subscription;
