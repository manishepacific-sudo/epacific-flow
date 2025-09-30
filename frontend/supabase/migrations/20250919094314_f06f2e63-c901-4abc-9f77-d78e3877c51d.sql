-- First, create a security definer function to get current user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop ALL existing policies on profiles to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers and admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create any profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can create user profiles only" ON public.profiles;

-- Recreate profiles policies with proper permissions
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all profiles" ON public.profiles
FOR SELECT USING (public.get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Admins can create any profile" ON public.profiles
FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Managers can create user profiles only" ON public.profiles
FOR INSERT WITH CHECK (
  public.get_current_user_role() = 'manager' AND role = 'user'
);

-- Drop and recreate reports policies
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update their own pending reports" ON public.reports;
DROP POLICY IF EXISTS "Managers and admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Managers and admins can update all reports" ON public.reports;

CREATE POLICY "Users can view their own reports" ON public.reports
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" ON public.reports
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reports" ON public.reports
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Managers and admins can view all reports" ON public.reports
FOR SELECT USING (public.get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Managers and admins can update all reports" ON public.reports
FOR UPDATE USING (public.get_current_user_role() IN ('manager', 'admin'));

-- Drop and recreate payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own pending payments" ON public.payments;
DROP POLICY IF EXISTS "Managers and admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;

CREATE POLICY "Users can view their own payments" ON public.payments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON public.payments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending payments" ON public.payments
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Managers and admins can view all payments" ON public.payments
FOR SELECT USING (public.get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Admins can update all payments" ON public.payments
FOR UPDATE USING (public.get_current_user_role() = 'admin');