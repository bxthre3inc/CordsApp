-- Persist platform commission and supplier payout on each settled order
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS platform_commission  NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_payout      NUMERIC(10, 2) DEFAULT 0;
