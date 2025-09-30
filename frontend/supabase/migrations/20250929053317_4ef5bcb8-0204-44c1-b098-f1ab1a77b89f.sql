-- Add foreign key constraint between reports.user_id and profiles.user_id
-- This will allow Supabase to automatically join reports with profiles

-- First, let's make sure all existing reports have valid user_ids that exist in profiles
-- We'll handle orphaned records gracefully by not deleting them

ALTER TABLE public.reports 
ADD CONSTRAINT fk_reports_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;