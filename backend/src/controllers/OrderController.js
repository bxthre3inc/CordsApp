const Order = require('../models/Order');
const Product = require('../models/Product');
const Subscription = require('../models/Subscription');

// Platform-standard hand stacking fee — required on all delivery orders
const STACKING_FEE_PER_CORD = 15.00;

class OrderController {
  static async create(req, res) {
    try {
      const { userId } = req.user;
      const { productId, quantity, deliveryLocation, deliveryDate, paymentMethod, deliveryType, gateCode, deliveryNotes } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const isPickup = deliveryType === 'pickup';
      const woodCost = parseFloat(product.price_per_unit) * quantity;
      // Stacking fee applied to all delivery orders (not pickup)
      const stackingFee = isPickup ? 0 : quantity * STACKING_FEE_PER_CORD;
      const totalPrice = woodCost; // wood cost tracked separately; stacking_fee is its own column

      const order = await Order.create({
        buyerId: userId,
        supplierId: product.supplier_id,
        productId,
        quantity,
        totalPrice,
        stackingFee,
        deliveryLocation: isPickup ? null : deliveryLocation,
        deliveryDate,
        status: 'pending',
        paymentMethod,
        deliveryType,
        gateCode: isPickup ? null : (gateCode || null),
        deliveryNotes: deliveryNotes || null,
      });

      res.status(201).json({
        message: 'Order created successfully',
        order,
        breakdown: {
          woodCost: totalPrice,
          stackingFee,
          total: totalPrice + stackingFee,
          stackingFeePerCord: STACKING_FEE_PER_CORD,
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }

  static async getBuyerOrders(req, res) {
    try {
      const { userId } = req.user;
      const orders = await Order.findByBuyer(userId);

      res.json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  static async getSupplierOrders(req, res) {
    try {
      const { userId } = req.user;
      const orders = await Order.findBySupplier(userId);

      res.json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await Order.updateStatus(id, status);

      res.json({
        message: 'Order status updated',
        order
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }

  static async assignDeliveryTeam(req, res) {
    try {
      const { id } = req.params;
      const { deliveryTeamId } = req.body;

      const order = await Order.assignDeliveryTeam(id, deliveryTeamId);

      res.json({
        message: 'Delivery team assigned',
        order
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to assign delivery team' });
    }
  }
}

module.exports = OrderController;
