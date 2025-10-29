-- Fix critical security issues

-- 1. Fix get_current_user_role() to use user_roles table instead of profiles
-- This prevents privilege escalation attacks
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$$;

-- 2. Fix validate_demo_account() to have proper search_path
CREATE OR REPLACE FUNCTION public.validate_demo_account()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 3. Drop and recreate get_user_role function with correct return type
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE FUNCTION public.get_user_role(user_id_param uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = user_id_param
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$$;

-- 4. Create function to validate admin role using user_roles (used in edge functions)
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_id_param
      AND role = 'admin'
  );
$$;