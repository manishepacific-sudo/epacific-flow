-- Add registrar field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN registrar text;