-- Global Marketplace migration: quality fields, metric units, supplier verification.
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards everywhere).

-- Quality and global fields on products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seasoning_status  VARCHAR(20)  DEFAULT 'seasoned'
    CHECK (seasoning_status IN ('green','seasoning','seasoned','kiln_dried')),
  ADD COLUMN IF NOT EXISTS moisture_pct      NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS certification     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS btu_per_cord      INTEGER,
  ADD COLUMN IF NOT EXISTS min_order_qty     NUMERIC(8,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_wholesale      BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS country_code      VARCHAR(2),
  ADD COLUMN IF NOT EXISTS region_name       VARCHAR(100);

-- Expand unit constraint to include metric and international units.
-- Drop old constraint first (name may differ across deploys — catches both).
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_products_unit;
ALTER TABLE products
  ADD CONSTRAINT products_unit_check CHECK (unit IN (
    'cord', 'half_cord', 'face_cord', 'board_foot', 'ton',
    'metric_ton', 'cubic_meter', 'stere', 'kg', 'lb'
  ));

-- Supplier verification and global location on supplier profiles
ALTER TABLE supplier_profiles
  ADD COLUMN IF NOT EXISTS verified       BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS business_name  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS country_code   VARCHAR(2),
  ADD COLUMN IF NOT EXISTS region_name    VARCHAR(100);

-- Indexes for price-index queries
CREATE INDEX IF NOT EXISTS idx_products_country_wood
  ON products (country_code, wood_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_products_wood_active
  ON products (wood_type) WHERE active = true;
