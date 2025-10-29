-- Add report_approved and payment_approved notification types
-- This migration extends the notification types to include approval notifications

-- Drop the existing check constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new check constraint with the additional types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'report_uploaded', 
  'payment_submitted', 
  'report_rejected', 
  'payment_rejected',
  'report_approved',
  'payment_approved'
));

-- Add a comment to document the change
COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS 
'Valid notification types: report_uploaded, payment_submitted, report_rejected, payment_rejected, report_approved, payment_approved';




