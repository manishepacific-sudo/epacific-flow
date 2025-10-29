-- Fix storage bucket policies to enforce path-based ownership checks
-- First drop ALL existing non-admin storage policies to start fresh

DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname NOT LIKE '%company%'
        AND policyname NOT LIKE '%admin%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Create secure policies for report-attachments bucket with path-based ownership
CREATE POLICY "Users can upload their own report files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'report-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own report files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'report-attachments' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR get_current_user_role() IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can update their own report files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'report-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own report files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'report-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create secure policies for payment-proofs bucket with path-based ownership
CREATE POLICY "Users can upload their own payment proofs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own payment proofs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'payment-proofs' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR get_current_user_role() IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can update their own payment proofs" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'payment-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own payment proofs" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'payment-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create secure policies for attendance-photos bucket with path-based ownership
CREATE POLICY "Users can upload their own attendance photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'attendance-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own attendance photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'attendance-photos' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR get_current_user_role() IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can update their own attendance photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'attendance-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own attendance photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'attendance-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);