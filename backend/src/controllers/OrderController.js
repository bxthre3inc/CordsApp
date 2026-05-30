const Order = require('../models/Order');
const Product = require('../models/Product');
const pool = require('../config/database');
const emailService = require('../services/EmailService');
const { calcDeliveryFee, PLATFORM_DELIVERY_RATE } = require('../utils/delivery');

const STACKING_FEE_PER_CORD = 15.00;
const PROCESSING_FEE_RATE   = 0.02;   // 2% charged to buyer, 2% deducted from seller

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
      const stackingFee = (!isPickup && wantStacking) ? quantity * STACKING_FEE_PER_CORD : 0;

      let deliveryFee = 0;
      let deliveryMiles = 0;
      let deliveryRatePerMile = 0;
      if (!isPickup) {
        if (!deliveryLocation?.latitude || !deliveryLocation?.longitude) {
          return res.status(400).json({ error: 'Delivery location coordinates are required for delivery orders' });
        }
        const supplierLoc = product.location;
        if (!supplierLoc?.latitude || !supplierLoc?.longitude) {
          return res.status(400).json({ error: 'Supplier location not set — cannot calculate delivery fee' });
        }
        const isExpress = deliveryType === 'express';
        const calc = calcDeliveryFee(supplierLoc, deliveryLocation, quantity, isExpress);
        deliveryFee         = calc.deliveryFee;
        deliveryMiles       = calc.miles;
        deliveryRatePerMile = calc.ratePerMile;
      }

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
        deliveryFee,
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

      // Email supplier — non-blocking
      pool.query(
        'SELECT u.email, u.first_name FROM users u WHERE u.id = $1',
        [product.supplier_id]
      ).then(r => {
        const supplier = r.rows[0];
        if (supplier?.email) {
          const orderWithType = { ...order, wood_type: product.wood_type, unit: product.unit, delivery_type: deliveryType };
          emailService.orderPlaced(supplier.email, orderWithType).catch(() => {});
        }
      }).catch(() => {});

      res.status(201).json({
        message: 'Order created successfully',
        order,
        breakdown: {
          woodCost,
          stackingFee,
          deliveryFee,
          deliveryMiles,
          deliveryRatePerMile,
          platformDeliveryFee: parseFloat((deliveryFee * PLATFORM_DELIVERY_RATE).toFixed(2)),
          driverDeliveryPayout: parseFloat((deliveryFee * (1 - PLATFORM_DELIVERY_RATE)).toFixed(2)),
          commissionableBasis,
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

  // GET /orders/delivery-estimate?productId=&quantity=&lat=&lng=&express=
  // Returns delivery fee preview before order placement.
  static async deliveryEstimate(req, res) {
    try {
      const { productId, quantity, lat, lng, express } = req.query;
      if (!productId || !quantity || !lat || !lng) {
        return res.status(400).json({ error: 'productId, quantity, lat, and lng are required' });
      }
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (!product.location?.latitude || !product.location?.longitude) {
        return res.status(400).json({ error: 'Supplier location not set' });
      }
      const { calcDeliveryFee } = require('../utils/delivery');
      const calc = calcDeliveryFee(
        product.location,
        { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        parseFloat(quantity),
        express === 'true'
      );
      res.json(calc);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to estimate delivery fee' });
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

      if (status === 'confirmed') {
        pool.query(`
          SELECT u.email, o.gate_code, p.wood_type, o.quantity
          FROM orders o JOIN users u ON o.buyer_id = u.id JOIN products p ON o.product_id = p.id
          WHERE o.id = $1
        `, [id]).then(r => {
          const row = r.rows[0];
          if (row?.email) emailService.orderConfirmed(row.email, { ...order, ...row }).catch(() => {});
        }).catch(() => {});
      }

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
