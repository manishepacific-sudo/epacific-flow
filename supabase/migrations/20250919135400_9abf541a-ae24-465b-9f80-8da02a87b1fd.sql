-- Update reports table to add amount column for storing parsed amounts
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS amount numeric;

-- Update payment table to store payment method as enum for better data integrity
UPDATE public.payments 
SET method = 'phonepe' 
WHERE method = 'phonepe';

UPDATE public.payments 
SET method = 'razorpay' 
WHERE method = 'razorpay';

UPDATE public.payments 
SET method = 'offline' 
WHERE method = 'offline';

-- Update report statuses to match the new workflow
UPDATE public.reports 
SET status = 'pending_approval' 
WHERE status = 'pending';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);