-- Migration: Enterprise contracts + pickup support

-- Enterprise contracts (admin-managed, one per supplier)
CREATE TABLE IF NOT EXISTS enterprise_contracts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  estimated_monthly_cords INTEGER,
  -- Negotiated rates (set by admin)
  monthly_fee DECIMAL(10, 2),
  per_cord_fee DECIMAL(8, 4),
  per_mile_fee DECIMAL(8, 4),        -- NULL if supplier does not deliver
  delivers BOOLEAN DEFAULT false,
  -- Lifecycle
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled')),
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enterprise leads (pre-contract intake form, no user_id required yet)
CREATE TABLE IF NOT EXISTS enterprise_leads (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(30),
  estimated_monthly_cords INTEGER,
  delivers BOOLEAN DEFAULT false,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pickup support on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pickup_address JSONB;

-- Allow 'pickup' as a delivery type on orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_delivery_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_delivery_type_check
  CHECK (delivery_type IN ('standard', 'express', 'pickup'));

-- Add enterprise plan to supplier_profiles
ALTER TABLE supplier_profiles DROP CONSTRAINT IF EXISTS supplier_profiles_account_type_check;
ALTER TABLE supplier_profiles ADD CONSTRAINT supplier_profiles_account_type_check
  CHECK (account_type IN ('free', 'starter', 'professional', 'enterprise'));

CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_user_id ON enterprise_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_status ON enterprise_contracts(status);
CREATE INDEX IF NOT EXISTS idx_enterprise_leads_status ON enterprise_leads(status);
