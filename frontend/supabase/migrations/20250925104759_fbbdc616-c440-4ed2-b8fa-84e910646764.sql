-- Update payments status check constraint to include 'approved'
ALTER TABLE public.payments 
DROP CONSTRAINT payments_status_check;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'completed'::text, 'rejected'::text]));