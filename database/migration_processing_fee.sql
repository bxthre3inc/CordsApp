-- Migration: Add processing fee columns to orders
-- 2% charged to buyer (on top of their total)
-- 2% deducted from seller payout (on their wood revenue)
-- Together these cover Stripe's 2.9% + $0.30 and generate a small margin

ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_processing_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_processing_fee DECIMAL(10, 2) DEFAULT 0;
