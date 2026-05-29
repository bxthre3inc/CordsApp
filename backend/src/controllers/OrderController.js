const Order = require('../models/Order');
const Product = require('../models/Product');
const Subscription = require('../models/Subscription');

class OrderController {
  static async create(req, res) {
    try {
      const { userId } = req.user;
      const { productId, quantity, deliveryLocation, deliveryDate, paymentMethod, deliveryType } = req.body;

      // Get product details
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Calculate total price
      const totalPrice = product.price_per_unit * quantity;

      // Create order
      const order = await Order.create({
        buyerId: userId,
        supplierId: product.supplier_id,
        productId,
        quantity,
        totalPrice,
        deliveryLocation,
        deliveryDate,
        status: 'pending',
        paymentMethod,
        deliveryType
      });

      res.status(201).json({
        message: 'Order created successfully',
        order
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
