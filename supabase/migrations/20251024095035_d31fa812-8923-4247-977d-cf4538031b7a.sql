-- Fix critical storage bucket policies for report-attachments and payment-proofs
-- Drop insecure policies from migration 20250919172518
DROP POLICY IF EXISTS "Allow authenticated users to upload report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own report files" ON storage.objects;

-- Create secure storage policies for report-attachments bucket
-- Users can only upload to their own folder
CREATE POLICY "Users can upload to their own folder in report-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files, managers/admins can view all
CREATE POLICY "Users can view own files, admins/managers view all in report-attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR get_current_user_role() IN ('admin', 'manager')
  )
);

-- Users can update only their own files
CREATE POLICY "Users can update their own files in report-attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete only their own files
CREATE POLICY "Users can delete their own files in report-attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create secure storage policies for payment-proofs bucket
CREATE POLICY "Users can upload to their own folder in payment-proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own files, admins view all in payment-proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR get_current_user_role() = 'admin'
  )
);

CREATE POLICY "Users can update their own files in payment-proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files in payment-proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix notification policies to use secure function instead of profiles.role
-- Create SECURITY DEFINER function for notifications
CREATE OR REPLACE FUNCTION public.get_user_role_for_notifications(user_id_param uuid)
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

-- Drop existing notification policies
DROP POLICY IF EXISTS "Only admins and managers can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their role notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their role notifications" ON public.notifications;

-- Recreate notification policies with secure function
CREATE POLICY "Only admins and managers can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role_for_notifications(auth.uid()) IN ('admin', 'manager')
);

CREATE POLICY "Users can view their role notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  target_role = public.get_user_role_for_notifications(auth.uid())
);

CREATE POLICY "Users can update their role notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  target_role = public.get_user_role_for_notifications(auth.uid())
);

-- Prevent users from modifying their own role in profiles
-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with restriction on role changes
CREATE POLICY "Users can update their own profile except role"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Role must not change, or user must be admin
    role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
    OR public.get_current_user_role() = 'admin'
  )
);

-- Update storage policies from older migrations to use get_current_user_role()
-- Drop old policies that reference profiles.role directly
DROP POLICY IF EXISTS "Users can upload their own report attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own report attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can view all report attachments" ON storage.objects;
DROP POLICY IF EXISTS "Managers and admins can view all report files" ON storage.objects;

-- These are now replaced by the policies created above