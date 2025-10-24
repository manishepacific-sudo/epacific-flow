-- Remove profiles.role column - Complete cleanup of dual role storage
-- Step 1: Drop ALL policies that depend on profiles.role

-- Drop storage policies that reference profiles.role
DROP POLICY IF EXISTS "Managers can view all attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON storage.objects;

-- Drop profile policies that reference profiles.role
DROP POLICY IF EXISTS "Managers can create user profiles only" ON public.profiles;
DROP POLICY IF EXISTS "Managers can create user and manager profiles" ON public.profiles;
DROP POLICY IF EXISTS "Secure demo profile creation with rate limiting" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile except role" ON public.profiles;

-- Step 2: Recreate storage policies using get_current_user_role() instead
CREATE POLICY "Managers can view all attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-attachments'
  AND public.get_current_user_role() IN ('manager', 'admin')
);

CREATE POLICY "Admins can view all payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.get_current_user_role() = 'admin'
);

-- Step 3: Recreate profile policies without referencing profiles.role
-- Managers can create user profiles (role assignment happens in user_roles table via edge function)
CREATE POLICY "Managers can create profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_current_user_role() IN ('manager', 'admin')
);

-- Secure demo profile creation with rate limiting
CREATE POLICY "Secure demo profile creation with rate limiting"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (
  is_demo = true
  AND password_set = false
  AND (
    SELECT count(*) 
    FROM public.profiles 
    WHERE is_demo = true 
    AND created_at > now() - interval '1 hour'
  ) < 5
);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 4: Drop triggers that reference profiles.role
DROP TRIGGER IF EXISTS audit_profile_role_changes ON public.profiles;
DROP TRIGGER IF EXISTS prevent_profile_role_change_trigger ON public.profiles;

-- Step 5: Update validate_demo_account function to not check profiles.role
CREATE OR REPLACE FUNCTION public.validate_demo_account()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_demo = true THEN
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

-- Step 6: Now drop the role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- Step 7: Add documentation
COMMENT ON TABLE public.profiles IS 'User profile information. Roles are stored in user_roles table. Use get_current_user_role() or has_role() to check user roles.';