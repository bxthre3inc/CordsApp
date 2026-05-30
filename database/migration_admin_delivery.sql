-- Migration: Add admin role and delivery profiles

-- Extend role check to include admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('buyer', 'supplier', 'delivery', 'admin'));

-- Delivery driver availability and profile
CREATE TABLE IF NOT EXISTS delivery_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  available BOOLEAN DEFAULT false,
  current_location JSONB,
  earnings_today DECIMAL(10, 2) DEFAULT 0,
  earnings_week DECIMAL(10, 2) DEFAULT 0,
  earnings_total DECIMAL(10, 2) DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  avg_rating DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_profiles_user_id ON delivery_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_profiles_available ON delivery_profiles(available);
