-- First, create a security definer function to get current user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Managers and admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers and admins can update all reports" ON public.reports;
DROP POLICY IF EXISTS "Managers and admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;
DROP POLICY IF EXISTS "Managers and admins can view all payments" ON public.payments;

-- Create new policies using the security definer function for profiles
CREATE POLICY "Managers and admins can view all profiles" ON public.profiles
FOR SELECT USING (public.get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Admins can create any profile" ON public.profiles
FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Managers can create user profiles only" ON public.profiles
FOR INSERT WITH CHECK (
  public.get_current_user_role() = 'manager' AND role = 'user'
);

-- Update reports policies
CREATE POLICY "Managers and admins can view all reports" ON public.reports
FOR SELECT USING (public.get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Managers and admins can update all reports" ON public.reports
FOR UPDATE USING (public.get_current_user_role() IN ('manager', 'admin'));

-- Update payments policies
CREATE POLICY "Managers and admins can view all payments" ON public.payments
FOR SELECT USING (public.get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Admins can update all payments" ON public.payments
FOR UPDATE USING (public.get_current_user_role() = 'admin');