const pool = require('../config/database');

class Order {
  static async create(orderData) {
    const {
      buyerId,
      supplierId,
      productId,
      quantity,
      totalPrice,
      stackingFee = 0,
      buyerProcessingFee = 0,
      sellerProcessingFee = 0,
      deliveryLocation,
      deliveryDate,
      status,
      paymentMethod,
      deliveryType,
      gateCode = null,
      deliveryNotes = null,
    } = orderData;

    const query = `
      INSERT INTO orders (
        buyer_id, supplier_id, product_id, quantity, total_price, stacking_fee,
        buyer_processing_fee, seller_processing_fee,
        delivery_location, delivery_date, status, payment_method, delivery_type,
        gate_code, delivery_notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *;
    `;

    const result = await pool.query(query, [
      buyerId, supplierId, productId, quantity, totalPrice, stackingFee,
      buyerProcessingFee, sellerProcessingFee,
      deliveryLocation ? JSON.stringify(deliveryLocation) : null,
      deliveryDate, status, paymentMethod, deliveryType,
      gateCode, deliveryNotes,
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT o.*, p.wood_type, p.unit,
        u_s.first_name as supplier_name, u_s.phone as supplier_phone,
        u_b.first_name as buyer_name, u_b.phone as buyer_phone
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u_s ON o.supplier_id = u_s.id
      JOIN users u_b ON o.buyer_id = u_b.id
      WHERE o.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByBuyer(buyerId) {
    const query = `
      SELECT o.*, p.wood_type, p.unit, u.first_name as supplier_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.supplier_id = u.id
      WHERE o.buyer_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [buyerId]);
    return result.rows;
  }

  static async findBySupplier(supplierId) {
    const query = `
      SELECT o.*, p.wood_type, p.unit,
        u.first_name as buyer_name, u.last_name as buyer_last_name, u.phone as buyer_phone
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      WHERE o.supplier_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [supplierId]);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async assignDeliveryTeam(id, deliveryTeamId) {
    const query = `
      UPDATE orders 
      SET delivery_team_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [deliveryTeamId, id]);
    return result.rows[0];
  }
}

module.exports = Order;
