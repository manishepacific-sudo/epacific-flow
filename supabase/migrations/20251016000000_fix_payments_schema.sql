-- Migration: Fix payments schema to allow 'razorpay' and add payment_date
-- References:
-- - frontend/supabase/migrations/20250925104759_fbbdc616-c440-4ed2-b8fa-84e910646764.sql
-- - frontend/supabase/migrations/20250919075523_2397f7d4-7a4b-4af3-8f20-f645f6f433c9.sql
-- - supabase/migrations/20251015000000_add_approval_tracking_to_reports.sql

-- 1) Update method CHECK constraint to include 'razorpay'
-- Drop any existing CHECK constraints on payments.method that restrict values to ('phonepe','offline')
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN LATERAL unnest(c.conkey) AS attnum(attnum) ON true
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = attnum.attnum
    WHERE c.contype = 'c'
      AND n.nspname = 'public'
      AND t.relname = 'payments'
      AND a.attname = 'method'
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Add the desired check constraint
ALTER TABLE public.payments
  ADD CONSTRAINT payments_method_check CHECK (method IN ('phonepe','razorpay','offline'));

-- 2) Add optional payment_date column and index
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_date DATE;
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- 3) Add helpful documentation comments
COMMENT ON COLUMN public.payments.method IS 'Payment method: phonepe, razorpay, or offline';
COMMENT ON COLUMN public.payments.payment_date IS 'Date when the payment was made (user-selected)';


