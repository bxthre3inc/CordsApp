const Product = require('../models/Product');

class ProductController {
  static async create(req, res) {
    try {
      const { userId } = req.user;
      const {
        woodType, quantity, unit, pricePerUnit, location, description, image,
        pickupAvailable, pickupAddress,
        seasoningStatus, moisturePct, certification, btuPerCord,
        minOrderQty, isWholesale, countryCode, regionName,
      } = req.body;

      const product = await Product.create({
        supplierId: userId,
        woodType, quantity, unit, pricePerUnit, location, description, image,
        pickupAvailable: pickupAvailable || false,
        pickupAddress:   pickupAddress   || null,
        seasoningStatus: seasoningStatus || 'seasoned',
        moisturePct:     moisturePct     || null,
        certification:   certification   || null,
        btuPerCord:      btuPerCord      || null,
        minOrderQty:     minOrderQty     || 1,
        isWholesale:     isWholesale     || false,
        countryCode:     countryCode     || null,
        regionName:      regionName      || null,
      });

      res.status(201).json({ message: 'Product created successfully', product });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  static async getBySupplier(req, res) {
    try {
      const { supplierId } = req.params;
      const products = await Product.findBySupplier(supplierId);
      res.json(products);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  static async getNearby(req, res) {
    try {
      const { latitude, longitude, radius, woodType } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }
      const products = await Product.findNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        radius ? parseFloat(radius) : 50,
        woodType || null
      );
      res.json(products);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch nearby products' });
    }
  }

  static async getAveragePrice(req, res) {
    try {
      const { woodType, latitude, longitude, radius } = req.query;
      if (!woodType || !latitude || !longitude) {
        return res.status(400).json({ error: 'woodType, latitude, and longitude are required' });
      }
      const priceData = await Product.getAveragePriceByType(
        woodType,
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        radius ? parseFloat(radius) : 50
      );
      res.json(priceData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch price data' });
    }
  }

  // GET /products/price-index — global price index, public (no auth required)
  static async getPriceIndex(req, res) {
    try {
      const { countryCode, regionName, woodType } = req.query;
      const rows = await Product.getPriceIndex({ countryCode, regionName, woodType });
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch price index' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const {
        quantity, pricePerUnit, description, active, pickupAvailable, pickupAddress,
        seasoningStatus, moisturePct, certification, btuPerCord,
        minOrderQty, isWholesale, countryCode, regionName,
      } = req.body;

      const product = await Product.update(id, {
        quantity, pricePerUnit, description, active, pickupAvailable, pickupAddress,
        seasoningStatus, moisturePct, certification, btuPerCord,
        minOrderQty, isWholesale, countryCode, regionName,
      });

      res.json({ message: 'Product updated successfully', product });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
}

module.exports = ProductController;
