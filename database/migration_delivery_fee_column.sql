-- Store the delivery fee on the order at creation time so driver and platform
-- splits can always be calculated from the order record directly.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0;
