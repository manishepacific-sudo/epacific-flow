-- Update reports table to add rejection_message and update status values
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS rejection_message text;

-- Update payments table to add rejection_message and update status values  
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS rejection_message text;

-- Update existing status values in reports (if any exist)
UPDATE public.reports 
SET status = CASE 
  WHEN status = 'pending' THEN 'pending_review'
  WHEN status = 'approved' THEN 'approved' 
  WHEN status = 'rejected' THEN 'rejected'
  ELSE status
END;

-- Update existing status values in payments (if any exist)
UPDATE public.payments
SET status = CASE
  WHEN status = 'pending' THEN 'pending_review'
  WHEN status = 'completed' THEN 'verified'
  WHEN status = 'rejected' THEN 'rejected'
  ELSE status
END;