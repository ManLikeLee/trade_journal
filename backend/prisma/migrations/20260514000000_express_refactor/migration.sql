-- Migration: Add platform to accounts, add mistake/lesson to trade_notes
-- Add MT_SYNC to TradeSource enum

ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "platform" TEXT;

ALTER TABLE "trade_notes" ADD COLUMN IF NOT EXISTS "mistake" TEXT;
ALTER TABLE "trade_notes" ADD COLUMN IF NOT EXISTS "lesson" TEXT;

-- Add MT_SYNC value to TradeSource enum (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'MT_SYNC'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TradeSource')
  ) THEN
    ALTER TYPE "TradeSource" ADD VALUE 'MT_SYNC';
  END IF;
END$$;
