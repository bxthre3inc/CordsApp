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
      pickupAddress   = null,
      seasoningStatus = 'seasoned',
      moisturePct     = null,
      certification   = null,
      btuPerCord      = null,
      minOrderQty     = 1,
      isWholesale     = false,
      countryCode     = null,
      regionName      = null,
    } = productData;

    const query = `
      INSERT INTO products (
        supplier_id, wood_type, quantity, unit, price_per_unit,
        location, description, image, pickup_available, pickup_address,
        seasoning_status, moisture_pct, certification, btu_per_cord,
        min_order_qty, is_wholesale, country_code, region_name,
        created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,
        NOW()
      )
      RETURNING *;
    `;

    const result = await pool.query(query, [
      supplierId, woodType, quantity, unit, pricePerUnit,
      JSON.stringify(location), description, image, pickupAvailable,
      pickupAddress ? JSON.stringify(pickupAddress) : null,
      seasoningStatus, moisturePct, certification, btuPerCord,
      minOrderQty, isWholesale, countryCode, regionName,
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT p.*, sp.verified, sp.business_name
      FROM products p
      LEFT JOIN supplier_profiles sp ON sp.user_id = p.supplier_id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findBySupplier(supplierId) {
    const query = `
      SELECT * FROM products WHERE supplier_id = $1 AND active = true ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [supplierId]);
    return result.rows;
  }

  static async findNearby(latitude, longitude, radiusKm = 50, woodType = null) {
    let query = `
      SELECT p.*,
        u.first_name, u.last_name, u.phone,
        sp.verified, sp.business_name,
        (6371 * acos(
          LEAST(1.0, cos(radians($1)) * cos(radians((p.location->>'latitude')::float))
          * cos(radians((p.location->>'longitude')::float) - radians($2))
          + sin(radians($1)) * sin(radians((p.location->>'latitude')::float)))
        )) AS distance
      FROM products p
      JOIN users u ON p.supplier_id = u.id
      LEFT JOIN supplier_profiles sp ON sp.user_id = p.supplier_id
      WHERE p.active = true
        AND (6371 * acos(
          LEAST(1.0, cos(radians($1)) * cos(radians((p.location->>'latitude')::float))
          * cos(radians((p.location->>'longitude')::float) - radians($2))
          + sin(radians($1)) * sin(radians((p.location->>'latitude')::float)))
        )) <= $3
    `;

    const params = [latitude, longitude, radiusKm];

    if (woodType) {
      query += ` AND p.wood_type = $4`;
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
        AVG(price_per_unit) AS avg_price,
        MIN(price_per_unit) AS min_price,
        MAX(price_per_unit) AS max_price,
        COUNT(*)            AS supplier_count
      FROM products
      WHERE wood_type = $1 AND active = true
        AND (6371 * acos(
          LEAST(1.0, cos(radians($2)) * cos(radians((location->>'latitude')::float))
          * cos(radians((location->>'longitude')::float) - radians($3))
          + sin(radians($2)) * sin(radians((location->>'latitude')::float)))
        )) <= $4
      GROUP BY wood_type
    `;

    const result = await pool.query(query, [woodType, location.latitude, location.longitude, radiusKm]);
    return result.rows[0];
  }

  // Global price index: aggregate prices by wood type + country + region + unit.
  // Used by the public /market page. No auth required.
  static async getPriceIndex({ countryCode, regionName, woodType } = {}) {
    const conditions = ['p.active = true'];
    const params = [];

    if (countryCode) {
      params.push(countryCode.toUpperCase());
      conditions.push(`p.country_code = $${params.length}`);
    }
    if (regionName) {
      params.push(regionName);
      conditions.push(`p.region_name ILIKE $${params.length}`);
    }
    if (woodType) {
      params.push(woodType);
      conditions.push(`p.wood_type = $${params.length}`);
    }

    const query = `
      SELECT
        p.wood_type,
        p.country_code,
        p.region_name,
        p.unit,
        ROUND(AVG(p.price_per_unit)::numeric, 2)  AS avg_price,
        ROUND(MIN(p.price_per_unit)::numeric, 2)  AS min_price,
        ROUND(MAX(p.price_per_unit)::numeric, 2)  AS max_price,
        COUNT(*)                                   AS listing_count,
        COUNT(DISTINCT p.supplier_id)              AS supplier_count,
        MAX(p.updated_at)                          AS last_updated
      FROM products p
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.wood_type, p.country_code, p.region_name, p.unit
      ORDER BY p.country_code NULLS LAST, p.region_name NULLS LAST, p.wood_type ASC
      LIMIT 500;
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async update(id, updateData) {
    const {
      quantity, pricePerUnit, description, active,
      pickupAvailable, pickupAddress,
      seasoningStatus, moisturePct, certification, btuPerCord,
      minOrderQty, isWholesale, countryCode, regionName,
    } = updateData;

    const query = `
      UPDATE products
      SET
        quantity         = COALESCE($1,  quantity),
        price_per_unit   = COALESCE($2,  price_per_unit),
        description      = COALESCE($3,  description),
        active           = COALESCE($4,  active),
        pickup_available = COALESCE($5,  pickup_available),
        pickup_address   = COALESCE($6,  pickup_address),
        seasoning_status = COALESCE($7,  seasoning_status),
        moisture_pct     = COALESCE($8,  moisture_pct),
        certification    = COALESCE($9,  certification),
        btu_per_cord     = COALESCE($10, btu_per_cord),
        min_order_qty    = COALESCE($11, min_order_qty),
        is_wholesale     = COALESCE($12, is_wholesale),
        country_code     = COALESCE($13, country_code),
        region_name      = COALESCE($14, region_name),
        updated_at       = NOW()
      WHERE id = $15
      RETURNING *;
    `;

    const result = await pool.query(query, [
      quantity, pricePerUnit, description, active,
      pickupAvailable, pickupAddress ? JSON.stringify(pickupAddress) : null,
      seasoningStatus, moisturePct, certification, btuPerCord,
      minOrderQty, isWholesale, countryCode, regionName,
      id,
    ]);
    return result.rows[0];
  }
}

module.exports = Product;
