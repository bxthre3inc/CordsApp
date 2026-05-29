const pool = require('../config/database');

class User {
  static async create(userData) {
    const { email, password, firstName, lastName, role, phone, location } = userData;
    const query = `
      INSERT INTO users (email, password, first_name, last_name, role, phone, location, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, email, first_name, last_name, role, phone, location, created_at;
    `;
    const result = await pool.query(query, [email, password, firstName, lastName, role, phone, JSON.stringify(location)]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, userData) {
    const { firstName, lastName, phone, location, bio } = userData;
    const query = `
      UPDATE users 
      SET first_name = $1, last_name = $2, phone = $3, location = $4, bio = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, email, first_name, last_name, role, phone, location, bio, updated_at;
    `;
    const result = await pool.query(query, [firstName, lastName, phone, JSON.stringify(location), bio, id]);
    return result.rows[0];
  }

  static async getSupplierProfile(id) {
    const query = `
      SELECT u.*, sp.avg_rating, sp.total_orders, sp.account_type, sp.subscription_end
      FROM users u
      LEFT JOIN supplier_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1 AND u.role = 'supplier'
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getBuyerProfile(id) {
    const query = `
      SELECT u.*, bp.total_spent, bp.favorite_suppliers
      FROM users u
      LEFT JOIN buyer_profiles bp ON u.id = bp.user_id
      WHERE u.id = $1 AND u.role = 'buyer'
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = User;
