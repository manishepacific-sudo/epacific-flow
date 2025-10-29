-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  location_latitude NUMERIC NOT NULL,
  location_longitude NUMERIC NOT NULL,
  location_address TEXT,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'checked_in', 'checked_out')),
  manager_notes TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  city TEXT,
  remarks TEXT,
  geofence_valid BOOLEAN NOT NULL DEFAULT false,
  office_latitude NUMERIC,
  office_longitude NUMERIC,
  distance_from_office NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance
CREATE POLICY "Users can create their own attendance"
  ON public.attendance
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attendance"
  ON public.attendance
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
  ON public.attendance
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all attendance"
  ON public.attendance
  FOR SELECT
  USING (get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Managers and admins can update all attendance"
  ON public.attendance
  FOR UPDATE
  USING (get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Admins can delete attendance"
  ON public.attendance
  FOR DELETE
  USING (get_current_user_role() = 'admin');

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for attendance photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for attendance photos
CREATE POLICY "Users can upload their own attendance photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'attendance-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own attendance photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'attendance-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Managers and admins can view all attendance photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'attendance-photos' 
    AND get_current_user_role() IN ('manager', 'admin')
  );

-- Add comment
COMMENT ON TABLE public.attendance IS 'Stores employee attendance records with geolocation and photo verification';