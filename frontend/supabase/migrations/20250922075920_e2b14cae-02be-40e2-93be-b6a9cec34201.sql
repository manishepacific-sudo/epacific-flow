-- Fix security vulnerability: Remove overly permissive anonymous profile creation policy
-- and add proper validation for demo accounts

-- Drop the dangerous anonymous profile creation policy
DROP POLICY IF EXISTS "Anonymous users can create demo profiles" ON public.profiles;

-- Create a more secure policy for demo account creation
-- This allows creating demo profiles only when specific conditions are met
CREATE POLICY "Secure demo profile creation" ON public.profiles
FOR INSERT 
WITH CHECK (
  -- Only allow demo profile creation if:
  -- 1. The profile is explicitly marked as demo
  -- 2. The role is restricted to 'user' only (no admin/manager demo accounts)
  -- 3. There's a reasonable limit to prevent spam
  is_demo = true 
  AND role = 'user'
  AND password_set = false
  AND (
    -- Limit demo accounts creation (optional additional check)
    SELECT COUNT(*) FROM public.profiles 
    WHERE is_demo = true 
    AND created_at > NOW() - INTERVAL '1 hour'
  ) < 10
);

-- Create a policy for authenticated invite-based profile creation
-- This ensures invited users can create their profiles during the invite flow
CREATE POLICY "Invited users can create profiles" ON public.profiles
FOR INSERT
WITH CHECK (
  -- Allow profile creation for authenticated users during invite flow
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND password_set = false
);

-- Update the existing "Users can insert their own profile" policy to be more specific
-- This ensures only authenticated users can create their own profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can create their own profile" ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND password_set = true
);

-- Add a function to validate demo account creation with additional security
CREATE OR REPLACE FUNCTION public.validate_demo_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Additional validation for demo accounts
  IF NEW.is_demo = true THEN
    -- Ensure demo accounts can't be admin or manager
    IF NEW.role NOT IN ('user') THEN
      RAISE EXCEPTION 'Demo accounts can only have user role';
    END IF;
    
    -- Ensure demo accounts have realistic data (prevent obvious spam)
    IF NEW.email IS NULL OR NEW.email = '' THEN
      RAISE EXCEPTION 'Demo accounts must have a valid email';
    END IF;
    
    IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
      RAISE EXCEPTION 'Demo accounts must have a valid full name';
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