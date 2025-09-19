-- Add RLS policies for report-attachments storage bucket
-- Users can upload their own report files
CREATE POLICY "Users can upload their own report files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'report-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own report files
CREATE POLICY "Users can view their own report files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'report-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Managers and admins can view all report files
CREATE POLICY "Managers and admins can view all report files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'report-attachments' 
  AND get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text])
);