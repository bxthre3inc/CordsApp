const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Redis-backed rate limiting when REDIS_URL is set; falls back to in-memory.
// In-memory works for single-process dev; Redis is required for multi-instance prod.
function buildStore() {
  if (!process.env.REDIS_URL) return undefined; // express-rate-limit default (in-memory)
  try {
    const { RedisStore } = require('rate-limit-redis');
    const Redis = require('ioredis');
    const client = new Redis(process.env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
    client.on('error', err => console.warn('[Redis] rate-limit store error:', err.message));
    return new RedisStore({ sendCommand: (...args) => client.call(...args) });
  } catch (e) {
    console.warn('[Redis] rate-limit-redis unavailable, using memory store:', e.message);
    return undefined;
  }
}

const store = buildStore();

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store,
  message: { error: 'Too many login attempts, please try again later' },
});

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const locationRoutes = require('./routes/locations');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const deliveryRoutes = require('./routes/delivery');
const enterpriseRoutes = require('./routes/enterprise');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/enterprise', enterpriseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  const redisStatus = process.env.REDIS_URL ? '(Redis-backed)' : '(in-memory — set REDIS_URL for production)';
  console.log(`Cords API server running on port ${PORT} | Rate limiting: ${redisStatus}`);
});

module.exports = app;
