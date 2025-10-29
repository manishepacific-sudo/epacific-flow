-- Add foreign key constraint between payments.user_id and profiles.user_id
-- This will allow Supabase to automatically join payments with profiles

ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;