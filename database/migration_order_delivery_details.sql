-- Migration: Add delivery detail fields to orders
-- Hand stacking is required on all delivery orders at the platform rate ($15/cord)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS gate_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stacking_fee DECIMAL(10, 2) DEFAULT 0;

-- Delivery location can now be null for pickup orders
ALTER TABLE orders ALTER COLUMN delivery_location DROP NOT NULL;

-- Update delivery_profiles: stacking is always required — no optional flag
-- stacking_fee_per_cord is the driver's acknowledgment of the platform rate
ALTER TABLE delivery_profiles ALTER COLUMN offers_stacking SET DEFAULT true;
UPDATE delivery_profiles SET offers_stacking = true WHERE offers_stacking = false OR offers_stacking IS NULL;
