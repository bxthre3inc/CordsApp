const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');

/*
  Platform take by tier (before Stripe 2.9% + $0.30):
    Free         → 20% commission.  Net ~17% after Stripe.
    Starter      → 10% + $29.99/mo. Net ~7% per order + MRR.
    Professional → 5%  + $99.99/mo. Net ~2% per order + MRR.
    Enterprise   → 0% commission.   Revenue = monthly_fee + per_cord_fee (invoiced separately).
                   Only Stripe processing passed through to supplier.
*/

class PaymentController {
  static async createOrderPayment(req, res) {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Look up supplier account type
      const profileResult = await pool.query(
        'SELECT sp.account_type, ec.per_cord_fee FROM supplier_profiles sp LEFT JOIN enterprise_contracts ec ON sp.user_id = ec.user_id AND ec.status = $1 WHERE sp.user_id = $2',
        ['active', order.supplier_id]
      );
      const profile = profileResult.rows[0];
      const accountType = profile?.account_type || 'free';
      const commission = Subscription.getPlanDetails(accountType).commission;

      // For enterprise: no commission; buyer pays full price; platform bills supplier separately
      // For others: commission is deducted from supplier payout (handled post-payment)
      const buyerAmount = Math.round(parseFloat(order.total_price) * 100);

      const lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${order.wood_type} — ${order.quantity} ${order.unit || 'cords'}`,
            description: order.delivery_type === 'pickup'
              ? 'Pickup at supplier location'
              : `${order.delivery_type} delivery`
          },
          unit_amount: buyerAmount
        },
        quantity: 1
      }];

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.APP_URL}/orders/${orderId}/success`,
        cancel_url: `${process.env.APP_URL}/orders/${orderId}/cancel`,
        metadata: {
          orderId: String(orderId),
          buyerId: String(order.buyer_id),
          supplierId: String(order.supplier_id),
          accountType,
          commissionRate: String(commission)
        }
      });

      res.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create payment session' });
    }
  }

  static async createSubscription(req, res) {
    try {
      const { userId, role } = req.user;
      const { planType } = req.body;

      if (role !== 'supplier') {
        return res.status(403).json({ error: 'Only suppliers can subscribe' });
      }

      const planDetails = Subscription.getPlanDetails(planType);

      if (planDetails.price === 0) {
        // Free plan - no Stripe needed
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        const subscription = await Subscription.create({
          userId,
          planType: 'free',
          startDate,
          endDate,
          stripeSubscriptionId: null
        });

        return res.status(201).json({
          message: 'Free subscription created',
          subscription
        });
      }

      // Paid plan - create Stripe subscription
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Cords ${planDetails.name} Plan`,
              description: planDetails.features.join(', ')
            },
            unit_amount: Math.round(planDetails.price * 100),
            recurring: {
              interval: 'month',
              interval_count: 1
            }
          },
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/subscription/cancel`,
        metadata: {
          userId,
          planType
        }
      });

      res.json({
        checkoutUrl: session.url,
        sessionId: session.id
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }

  static async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const { orderId, supplierId, commissionRate, accountType } = session.metadata;
          const amountTotal = session.amount_total / 100;
          const stripeFee = amountTotal * 0.029 + 0.30;
          const commission = accountType === 'enterprise' ? 0 : amountTotal * parseFloat(commissionRate || 0);
          const supplierPayout = amountTotal - commission - stripeFee;

          await pool.query(
            'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
            ['completed', orderId]
          );

          console.log(`Order ${orderId} paid. GMV: $${amountTotal}, Stripe: $${stripeFee.toFixed(2)}, Commission: $${commission.toFixed(2)}, Supplier payout: $${supplierPayout.toFixed(2)}`);
          break;
        }
        case 'customer.subscription.updated':
          console.log('Subscription updated:', event.data.object.id);
          break;
        default:
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook failed' });
    }
  }
}

module.exports = PaymentController;
