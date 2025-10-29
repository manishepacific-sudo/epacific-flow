-- Add missing columns to profiles table for auth bootstrap
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT true;

-- Create demo admin account data (will need to be created via auth.admin later)
-- This is just the profile data - the auth user will be created via edge function