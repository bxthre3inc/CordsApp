const Order = require('../models/Order');
const Product = require('../models/Product');

const STACKING_FEE_PER_CORD = 15.00;   // required on all delivery orders
const DELIVERY_FEE_STANDARD  = 25.00;
const DELIVERY_FEE_EXPRESS   = 45.00;
const PROCESSING_FEE_RATE    = 0.02;   // 2% charged to buyer, 2% deducted from seller

class OrderController {
  static async create(req, res) {
    try {
      const { userId } = req.user;
      const {
        productId, quantity, deliveryLocation, deliveryDate,
        paymentMethod, deliveryType, gateCode, deliveryNotes
      } = req.body;

      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const isPickup = deliveryType === 'pickup';
      const woodCost    = parseFloat(product.price_per_unit) * quantity;
      const stackingFee = isPickup ? 0 : quantity * STACKING_FEE_PER_CORD;
      const deliveryFee = isPickup ? 0
        : deliveryType === 'express' ? DELIVERY_FEE_EXPRESS : DELIVERY_FEE_STANDARD;

      // Buyer pays 2% on everything they're charged
      const buyerSubtotal      = woodCost + stackingFee + deliveryFee;
      const buyerProcessingFee = parseFloat((buyerSubtotal * PROCESSING_FEE_RATE).toFixed(2));

      // Seller pays 2% on their wood revenue only
      const sellerProcessingFee = parseFloat((woodCost * PROCESSING_FEE_RATE).toFixed(2));

      const order = await Order.create({
        buyerId: userId,
        supplierId: product.supplier_id,
        productId,
        quantity,
        totalPrice: woodCost,
        stackingFee,
        buyerProcessingFee,
        sellerProcessingFee,
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
          woodCost,
          stackingFee,
          deliveryFee,
          buyerProcessingFee,
          sellerProcessingFee,
          buyerTotal: buyerSubtotal + buyerProcessingFee,
          sellerPayout: woodCost - sellerProcessingFee,
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
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }

  static async getBuyerOrders(req, res) {
    try {
      const orders = await Order.findByBuyer(req.user.userId);
      res.json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  static async getSupplierOrders(req, res) {
    try {
      const orders = await Order.findBySupplier(req.user.userId);
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
      res.json({ message: 'Order status updated', order });
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
      res.json({ message: 'Delivery team assigned', order });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to assign delivery team' });
    }
  }
}

module.exports = OrderController;
