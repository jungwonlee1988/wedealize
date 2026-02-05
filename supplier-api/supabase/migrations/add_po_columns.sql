-- Migration: Add missing columns to orders and order_items tables for PO CRUD
-- Run this in Supabase SQL Editor

-- orders table: add buyer/trade columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_contact VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS incoterms VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- order_items table: add unit column
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
