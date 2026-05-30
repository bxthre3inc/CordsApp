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
        paymentMethod, deliveryType, wantStacking = false, gateCode, deliveryNotes
      } = req.body;

      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const isPickup = deliveryType === 'pickup';
      const woodCost    = parseFloat(product.price_per_unit) * quantity;
      // Stacking is optional — buyer opts in; all delivery drivers are capable
      const stackingFee = (!isPickup && wantStacking) ? quantity * STACKING_FEE_PER_CORD : 0;
      const deliveryFee = isPickup ? 0
        : deliveryType === 'express' ? DELIVERY_FEE_EXPRESS : DELIVERY_FEE_STANDARD;

      // Commission applies to wood + stacking combined (platform earns on both)
      // Processing fee (2% each side) applies to the full buyer-facing subtotal
      const commissionableBasis = woodCost + stackingFee;
      const buyerSubtotal       = commissionableBasis + deliveryFee;
      const buyerProcessingFee  = parseFloat((buyerSubtotal * PROCESSING_FEE_RATE).toFixed(2));

      // Seller processing fee on their commissionable revenue
      const sellerProcessingFee = parseFloat((commissionableBasis * PROCESSING_FEE_RATE).toFixed(2));

      const order = await Order.create({
        buyerId: userId,
        supplierId: product.supplier_id,
        productId,
        quantity,
        totalPrice: commissionableBasis,  // wood + stacking — commission applied to this
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
          commissionableBasis,   // wood + stacking — commission and seller fee apply here
          buyerProcessingFee,
          sellerProcessingFee,
          buyerTotal: buyerSubtotal + buyerProcessingFee,
          sellerPayout: commissionableBasis - sellerProcessingFee,
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
