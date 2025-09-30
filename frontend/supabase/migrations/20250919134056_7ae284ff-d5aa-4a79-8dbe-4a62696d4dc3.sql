-- Create storage policies for report-attachments bucket
CREATE POLICY "Users can upload their own report attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'report-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own report attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins and managers can view all report attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-attachments' AND get_current_user_role() = ANY (ARRAY['manager'::text, 'admin'::text]));

-- Update reports table to make title and description optional by setting default values
ALTER TABLE public.reports 
ALTER COLUMN title SET DEFAULT 'Monthly Report',
ALTER COLUMN description SET DEFAULT 'Report submitted via file upload';