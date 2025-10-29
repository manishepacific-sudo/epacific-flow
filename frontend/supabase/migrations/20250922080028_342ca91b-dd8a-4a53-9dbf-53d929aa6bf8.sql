-- Ensure the demo account validation trigger is properly set up
-- This adds additional security validation for demo accounts

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
    
    -- Prevent obviously fake data patterns
    IF NEW.email ILIKE '%spam%' OR NEW.email ILIKE '%fake%' OR NEW.email ILIKE '%test123%' THEN
      RAISE EXCEPTION 'Invalid email address pattern for demo account';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger to enforce demo account validation
DROP TRIGGER IF EXISTS validate_demo_account_trigger ON public.profiles;
CREATE TRIGGER validate_demo_account_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_demo_account();