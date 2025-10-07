-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Users can upload their own report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own report files" ON storage.objects;
DROP POLICY IF EXISTS "Managers can view all report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Managers can view all payment proofs" ON storage.objects;

-- Make buckets public for authenticated access
UPDATE storage.buckets SET public = true WHERE id IN ('report-attachments', 'payment-proofs');

-- Report attachments policies
CREATE POLICY "Users can upload their own report files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'report-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their own report files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'report-attachments'
  AND (
    -- User can view their own files
    (auth.uid()::text = (storage.foldername(name))[1])
    -- Managers and admins can view all files
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('manager', 'admin')
    )
  )
);

-- Payment proofs policies
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND (
    -- User can view their own files
    (auth.uid()::text = (storage.foldername(name))[1])
    -- Managers and admins can view all files
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('manager', 'admin')
    )
  )
);