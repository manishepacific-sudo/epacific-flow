-- SECURITY FIX: Implement proper role-based access control
-- This migration creates a separate user_roles table and security definer functions
-- to prevent privilege escalation attacks

-- Step 1: Create enum for roles if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 4: Create security definer function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$$;

-- Step 5: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT user_id, role::app_role, NULL
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Create RLS policies for user_roles table
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can modify roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Step 7: Add trigger to prevent self-privilege escalation
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from assigning admin or manager roles to themselves
  IF (NEW.user_id = auth.uid() AND NEW.role IN ('admin', 'manager')) THEN
    RAISE EXCEPTION 'Cannot assign privileged roles to yourself';
  END IF;
  
  -- Log role assignment in audit log
  PERFORM log_security_event(
    'role_assigned',
    NEW.user_id,
    jsonb_build_object(
      'role', NEW.role,
      'assigned_by', auth.uid()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_self_privilege_escalation_trigger
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();

-- Step 8: Add trigger to prevent role changes in profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only admins can change roles
  IF (OLD.role != NEW.role AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_profile_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_change();

-- Step 9: Update get_current_user_role() to use new user_roles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Step 10: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Step 11: Add comment for documentation
COMMENT ON TABLE public.user_roles IS 'Stores user role assignments separately from profiles to prevent privilege escalation attacks. Always use has_role() or get_user_role() functions to check roles.';