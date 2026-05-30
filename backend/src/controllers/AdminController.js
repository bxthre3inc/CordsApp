const pool = require('../config/database');

class AdminController {
  static async getStats(req, res) {
    try {
      const [users, orders, products, revenue, newSignups] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE role = 'supplier') as suppliers,
                    COUNT(*) FILTER (WHERE role = 'buyer') as buyers,
                    COUNT(*) FILTER (WHERE role = 'delivery') as drivers FROM users`),
        pool.query(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered FROM orders`),
        pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE active = true) as active FROM products`),
        pool.query(`SELECT COALESCE(SUM(total_price), 0) as month_revenue FROM orders
                    WHERE status = 'delivered' AND created_at >= date_trunc('month', NOW())`),
        pool.query(`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`)
      ]);

      res.json({
        users: users.rows[0],
        orders: orders.rows[0],
        products: products.rows[0],
        revenue_month: parseFloat(revenue.rows[0].month_revenue),
        new_signups_week: parseInt(newSignups.rows[0].count)
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  static async getUsers(req, res) {
    try {
      const { role, search, limit = 50, offset = 0 } = req.query;
      let query = `SELECT id, email, first_name, last_name, role, phone, created_at FROM users WHERE 1=1`;
      const params = [];

      if (role) {
        params.push(role);
        query += ` AND role = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`;
      }

      params.push(limit, offset);
      query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { role, suspended } = req.body;

      const fields = [];
      const params = [];

      if (role) {
        params.push(role);
        fields.push(`role = $${params.length}`);
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);
      const query = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING id, email, first_name, last_name, role`;
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      if (parseInt(id) === req.user.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ message: 'User deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  static async getOrders(req, res) {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      let query = `
        SELECT o.*, p.wood_type,
          u_b.first_name || ' ' || u_b.last_name as buyer_name,
          u_s.first_name || ' ' || u_s.last_name as supplier_name
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users u_b ON o.buyer_id = u_b.id
        JOIN users u_s ON o.supplier_id = u_s.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        params.push(status);
        query += ` AND o.status = $${params.length}`;
      }

      params.push(limit, offset);
      query += ` ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  static async overrideOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const valid = ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'];
      if (!valid.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const result = await pool.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  }

  static async getProducts(req, res) {
    try {
      const { active, limit = 50, offset = 0 } = req.query;
      let query = `
        SELECT p.*, u.first_name || ' ' || u.last_name as supplier_name, u.email as supplier_email
        FROM products p JOIN users u ON p.supplier_id = u.id WHERE 1=1
      `;
      const params = [];

      if (active !== undefined) {
        params.push(active === 'true');
        query += ` AND p.active = $${params.length}`;
      }

      params.push(limit, offset);
      query += ` ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  static async toggleProduct(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'UPDATE products SET active = NOT active, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to toggle product' });
    }
  }
}

module.exports = AdminController;
