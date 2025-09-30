-- Fix security vulnerability: Remove overly permissive anonymous profile creation policy
-- First, check and drop existing problematic policies

DROP POLICY IF EXISTS "Anonymous users can create demo profiles" ON public.profiles;
DROP POLICY IF EXISTS "Secure demo profile creation" ON public.profiles;

-- Create a more secure policy for demo account creation with proper validation
CREATE POLICY "Secure demo profile creation" ON public.profiles
FOR INSERT 
WITH CHECK (
  -- Only allow demo profile creation if:
  -- 1. The profile is explicitly marked as demo
  -- 2. The role is restricted to 'user' only (no admin/manager demo accounts)
  -- 3. Password is not set (for demo accounts)
  -- 4. Rate limiting to prevent spam
  is_demo = true 
  AND role = 'user'
  AND password_set = false
  AND (
    SELECT COUNT(*) FROM public.profiles 
    WHERE is_demo = true 
    AND created_at > NOW() - INTERVAL '1 hour'
  ) < 5  -- Limit to 5 demo accounts per hour
);

-- Ensure the existing policies are properly secured
-- Drop and recreate the user profile creation policy to be more explicit
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can create their own profile" ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);

-- Add validation function for demo accounts
CREATE OR REPLACE FUNCTION public.validate_demo_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Additional validation for demo accounts
  IF NEW.is_demo = true THEN
    -- Ensure demo accounts can only have user role
    IF NEW.role != 'user' THEN
      RAISE EXCEPTION 'Demo accounts can only have user role, not %', NEW.role;
    END IF;
    
    -- Ensure demo accounts have valid data
    IF NEW.email IS NULL OR length(trim(NEW.email)) < 5 THEN
      RAISE EXCEPTION 'Demo accounts must have a valid email address';
    END IF;
    
    IF NEW.full_name IS NULL OR length(trim(NEW.full_name)) < 2 THEN
      RAISE EXCEPTION 'Demo accounts must have a valid full name';
    END IF;
    
    -- Prevent obviously fake data
    IF NEW.email LIKE '%spam%' OR NEW.email LIKE '%fake%' OR NEW.email LIKE '%test123%' THEN
      RAISE EXCEPTION 'Invalid email address for demo account';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce demo account validation
DROP TRIGGER IF EXISTS validate_demo_account_trigger ON public.profiles;
CREATE TRIGGER validate_demo_account_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_demo_account();