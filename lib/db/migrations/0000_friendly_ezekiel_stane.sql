-- Add platform column to orders table
-- This migration adds the nullable "platform" field used to track the source
-- website (e.g. "Bridge Eat", "Bridge Fleur") for each order.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "platform" text;
