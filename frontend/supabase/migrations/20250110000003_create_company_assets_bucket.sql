-- Migration: Create company-assets storage bucket and RLS policies
-- Purpose: Store public company assets (logos/branding) with admin-only write access and public read access
BEGIN;

-- Create or update bucket entry (supabase metadata table) with size/mime constraints
INSERT INTO storage.buckets (id, name, public, owner, file_size_limit, allowed_mime_types, updated_at)
VALUES (
  'company-assets',
  'company-assets',
  true,
  NULL,
  5242880, -- 5MB limit
  ARRAY['image/png','image/jpeg','image/svg+xml','image/webp'],
  now()
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = EXCLUDED.updated_at;

-- Create RLS policies for admin write and public read. These examples follow the project's existing patterns.
-- Allow admins to INSERT
CREATE POLICY IF NOT EXISTS "Admins can upload company assets" ON storage.objects
  FOR INSERT
  TO public
  USING ( (auth.uid() IS NOT NULL AND get_current_user_role() = 'admin') AND bucket_id = 'company-assets' )
  WITH CHECK ( (auth.uid() IS NOT NULL AND get_current_user_role() = 'admin') AND bucket_id = 'company-assets' );

-- Allow admins to UPDATE
CREATE POLICY IF NOT EXISTS "Admins can update company assets" ON storage.objects
  FOR UPDATE
  TO public
  USING ( (auth.uid() IS NOT NULL AND get_current_user_role() = 'admin') AND bucket_id = 'company-assets' )
  WITH CHECK ( (auth.uid() IS NOT NULL AND get_current_user_role() = 'admin') AND bucket_id = 'company-assets' );

-- Allow admins to DELETE
CREATE POLICY IF NOT EXISTS "Admins can delete company assets" ON storage.objects
  FOR DELETE
  TO public
  USING ( (auth.uid() IS NOT NULL AND get_current_user_role() = 'admin') AND bucket_id = 'company-assets' );

-- Allow anyone to SELECT (public read for assets)
CREATE POLICY IF NOT EXISTS "Anyone can view company assets" ON storage.objects
  FOR SELECT
  TO public
  USING ( bucket_id = 'company-assets' );

COMMIT;
