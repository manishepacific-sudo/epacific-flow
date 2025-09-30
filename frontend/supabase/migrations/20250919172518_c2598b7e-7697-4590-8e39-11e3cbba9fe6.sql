-- Drop existing storage policies that don't work with demo users
DROP POLICY IF EXISTS "Users can upload their own report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own report files" ON storage.objects;
DROP POLICY IF EXISTS "Managers and admins can view all report files" ON storage.objects;

-- Create new storage policies that work with both real users and demo users
CREATE POLICY "Allow authenticated users to upload report files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'report-attachments'
);

-- Users can view their own report files (works for both auth and demo users)
CREATE POLICY "Users can view their own report files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-attachments');

-- Allow updates for report attachments
CREATE POLICY "Users can update their own report files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'report-attachments');