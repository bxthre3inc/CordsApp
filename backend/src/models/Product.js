const pool = require('../config/database');

class Product {
  static async create(productData) {
    const {
      supplierId,
      woodType,
      quantity,
      unit,
      pricePerUnit,
      location,
      description,
      image,
      pickupAvailable = false,
      pickupAddress = null
    } = productData;

    const query = `
      INSERT INTO products (
        supplier_id, wood_type, quantity, unit, price_per_unit,
        location, description, image, pickup_available, pickup_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *;
    `;

    const result = await pool.query(query, [
      supplierId, woodType, quantity, unit, pricePerUnit,
      JSON.stringify(location), description, image,
      pickupAvailable, pickupAddress ? JSON.stringify(pickupAddress) : null
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findBySupplier(supplierId) {
    const query = 'SELECT * FROM products WHERE supplier_id = $1 AND active = true ORDER BY created_at DESC';
    const result = await pool.query(query, [supplierId]);
    return result.rows;
  }

  static async findNearby(latitude, longitude, radiusKm = 50, woodType = null) {
    let query = `
      SELECT p.*, u.first_name, u.last_name, u.phone,
        (6371 * acos(cos(radians($1)) * cos(radians(location->>'latitude'::float)) 
        * cos(radians(location->>'longitude'::float) - radians($2)) 
        + sin(radians($1)) * sin(radians(location->>'latitude'::float)))) AS distance
      FROM products p
      JOIN users u ON p.supplier_id = u.id
      WHERE p.active = true
      AND (6371 * acos(cos(radians($1)) * cos(radians(location->>'latitude'::float)) 
        * cos(radians(location->>'longitude'::float) - radians($2)) 
        + sin(radians($1)) * sin(radians(location->>'latitude'::float)))) <= $3
    `;

    const params = [latitude, longitude, radiusKm];

    if (woodType) {
      query += ` AND wood_type = $4`;
      params.push(woodType);
    }

    query += ` ORDER BY distance ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getAveragePriceByType(woodType, location, radiusKm = 50) {
    const query = `
      SELECT 
        wood_type,
        AVG(price_per_unit) as avg_price,
        MIN(price_per_unit) as min_price,
        MAX(price_per_unit) as max_price,
        COUNT(*) as supplier_count
      FROM products
      WHERE wood_type = $1 AND active = true
      AND (6371 * acos(cos(radians($2)) * cos(radians(location->>'latitude'::float)) 
        * cos(radians(location->>'longitude'::float) - radians($3)) 
        + sin(radians($2)) * sin(radians(location->>'latitude'::float)))) <= $4
      GROUP BY wood_type
    `;

    const result = await pool.query(query, [woodType, location.latitude, location.longitude, radiusKm]);
    return result.rows[0];
  }

  static async update(id, updateData) {
    const { quantity, pricePerUnit, description, active, pickupAvailable, pickupAddress } = updateData;
    const query = `
      UPDATE products
      SET quantity = COALESCE($1, quantity),
          price_per_unit = COALESCE($2, price_per_unit),
          description = COALESCE($3, description),
          active = COALESCE($4, active),
          pickup_available = COALESCE($5, pickup_available),
          pickup_address = COALESCE($6, pickup_address),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *;
    `;

    const result = await pool.query(query, [
      quantity, pricePerUnit, description, active,
      pickupAvailable, pickupAddress ? JSON.stringify(pickupAddress) : null,
      id
    ]);
    return result.rows[0];
  }
}

module.exports = Product;
