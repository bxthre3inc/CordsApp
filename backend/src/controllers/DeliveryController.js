const pool = require('../config/database');

class DeliveryController {
  static async getAssignedOrders(req, res) {
    try {
      const { userId } = req.user;
      const result = await pool.query(`
        SELECT o.*, p.wood_type, p.unit,
          u_b.first_name || ' ' || u_b.last_name as buyer_name, u_b.phone as buyer_phone,
          u_s.first_name || ' ' || u_s.last_name as supplier_name, u_s.phone as supplier_phone,
          o.gate_code, o.delivery_notes, o.stacking_fee
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users u_b ON o.buyer_id = u_b.id
        JOIN users u_s ON o.supplier_id = u_s.id
        WHERE o.delivery_team_id = $1 AND o.status NOT IN ('delivered', 'cancelled')
        ORDER BY o.created_at DESC
      `, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch assigned orders' });
    }
  }

  static async getAvailableOrders(req, res) {
    try {
      const result = await pool.query(`
        SELECT o.*, p.wood_type,
          u_b.first_name || ' ' || u_b.last_name as buyer_name,
          u_s.first_name || ' ' || u_s.last_name as supplier_name
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users u_b ON o.buyer_id = u_b.id
        JOIN users u_s ON o.supplier_id = u_s.id
        WHERE o.status = 'confirmed' AND o.delivery_team_id IS NULL
        ORDER BY o.created_at ASC
        LIMIT 20
      `);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch available orders' });
    }
  }

  static async acceptOrder(req, res) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const check = await pool.query(
        'SELECT id, status, delivery_team_id FROM orders WHERE id = $1',
        [id]
      );
      if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      if (check.rows[0].status !== 'confirmed') return res.status(400).json({ error: 'Order not available' });
      if (check.rows[0].delivery_team_id) return res.status(400).json({ error: 'Order already taken' });

      const result = await pool.query(
        'UPDATE orders SET delivery_team_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [userId, id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to accept order' });
    }
  }

  static async updateOrderStatus(req, res) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const { status } = req.body;

      const allowed = ['in_transit', 'delivered'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Delivery drivers can only set in_transit or delivered' });
      }

      const check = await pool.query(
        'SELECT id, delivery_team_id, total_price FROM orders WHERE id = $1',
        [id]
      );
      if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      if (check.rows[0].delivery_team_id !== userId) {
        return res.status(403).json({ error: 'Not assigned to this order' });
      }

      const result = await pool.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (status === 'delivered') {
        const deliveryFee = parseFloat(check.rows[0].total_price) * 0.08;
        await pool.query(`
          INSERT INTO delivery_profiles (user_id, earnings_today, earnings_week, earnings_total, jobs_completed)
          VALUES ($1, $2, $2, $2, 1)
          ON CONFLICT (user_id) DO UPDATE SET
            earnings_today = delivery_profiles.earnings_today + $2,
            earnings_week = delivery_profiles.earnings_week + $2,
            earnings_total = delivery_profiles.earnings_total + $2,
            jobs_completed = delivery_profiles.jobs_completed + 1,
            updated_at = NOW()
        `, [userId, deliveryFee.toFixed(2)]);
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }

  static async toggleAvailability(req, res) {
    try {
      const { userId } = req.user;
      const result = await pool.query(`
        INSERT INTO delivery_profiles (user_id, available)
        VALUES ($1, true)
        ON CONFLICT (user_id) DO UPDATE SET
          available = NOT delivery_profiles.available,
          updated_at = NOW()
        RETURNING available
      `, [userId]);
      res.json({ available: result.rows[0].available });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to toggle availability' });
    }
  }

  static async getEarnings(req, res) {
    try {
      const { userId } = req.user;
      const [profile, history] = await Promise.all([
        pool.query('SELECT * FROM delivery_profiles WHERE user_id = $1', [userId]),
        pool.query(`
          SELECT o.id, o.total_price, o.status, o.updated_at, p.wood_type,
            u_b.first_name || ' ' || u_b.last_name as buyer_name
          FROM orders o
          JOIN products p ON o.product_id = p.id
          JOIN users u_b ON o.buyer_id = u_b.id
          WHERE o.delivery_team_id = $1 AND o.status = 'delivered'
          ORDER BY o.updated_at DESC LIMIT 20
        `, [userId])
      ]);

      const dp = profile.rows[0] || { earnings_today: 0, earnings_week: 0, earnings_total: 0, jobs_completed: 0, available: false };
      res.json({ profile: dp, history: history.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch earnings' });
    }
  }
}

module.exports = DeliveryController;
