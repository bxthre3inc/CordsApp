const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');

class PaymentController {
  static async createOrderPayment(req, res) {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Wood Order - ${order.wood_type}`,
              description: `${order.quantity} units of ${order.wood_type}`
            },
            unit_amount: Math.round(order.total_price * 100)
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/orders/${orderId}/success`,
        cancel_url: `${process.env.APP_URL}/orders/${orderId}/cancel`,
        metadata: {
          orderId: orderId,
          buyerId: order.buyer_id
        }
      });

      res.json({
        checkoutUrl: session.url,
        sessionId: session.id
      });
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
        case 'checkout.session.completed':
          // Handle successful payment
          console.log('Payment successful:', event.data.object);
          break;
        case 'customer.subscription.updated':
          // Handle subscription update
          console.log('Subscription updated:', event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook failed' });
    }
  }
}

module.exports = PaymentController;
