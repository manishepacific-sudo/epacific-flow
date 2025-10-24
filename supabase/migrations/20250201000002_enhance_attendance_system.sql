-- Enhance attendance table for complete attendance management system
-- Add check-in/check-out times, geofencing, and improved status tracking

-- Add new columns to attendance table
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS check_in_time timestamptz,
ADD COLUMN IF NOT EXISTS check_out_time timestamptz,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS remarks text,
ADD COLUMN IF NOT EXISTS geofence_valid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS office_latitude numeric(10,8),
ADD COLUMN IF NOT EXISTS office_longitude numeric(11,8),
ADD COLUMN IF NOT EXISTS distance_from_office numeric(8,2); -- in meters

-- Update status constraint to include more states
ALTER TABLE public.attendance 
DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('pending_approval', 'approved', 'rejected', 'checked_in', 'checked_out'));

-- Update default status
ALTER TABLE public.attendance 
ALTER COLUMN status SET DEFAULT 'pending_approval';

-- Create index for check-in/check-out times
CREATE INDEX IF NOT EXISTS attendance_check_in_time_idx ON public.attendance(check_in_time);
CREATE INDEX IF NOT EXISTS attendance_check_out_time_idx ON public.attendance(check_out_time);
CREATE INDEX IF NOT EXISTS attendance_geofence_valid_idx ON public.attendance(geofence_valid);

-- Create system settings table for office location and geofencing
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Insert default office location (you can update this with your actual office coordinates)
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'office_location',
  '{"latitude": 28.6139, "longitude": 77.2090, "radius": 100, "address": "New Delhi, India"}',
  'Office location for geofencing validation'
) ON CONFLICT (key) DO NOTHING;

-- Insert geofencing settings
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'geofencing',
  '{"enabled": true, "radius_meters": 100, "strict_mode": false}',
  'Geofencing configuration for attendance validation'
) ON CONFLICT (key) DO NOTHING;

-- Create function to calculate distance between two coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric, lon1 numeric, 
  lat2 numeric, lon2 numeric
) RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  earth_radius numeric := 6371000; -- Earth radius in meters
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$;

-- Create function to validate geofencing
CREATE OR REPLACE FUNCTION validate_geofence(
  user_lat numeric,
  user_lon numeric
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  office_location jsonb;
  geofence_config jsonb;
  office_lat numeric;
  office_lon numeric;
  radius_meters numeric;
  distance numeric;
  is_valid boolean;
BEGIN
  -- Get office location
  SELECT value INTO office_location 
  FROM public.system_settings 
  WHERE key = 'office_location';
  
  -- Get geofencing config
  SELECT value INTO geofence_config 
  FROM public.system_settings 
  WHERE key = 'geofencing';
  
  -- Extract values
  office_lat := (office_location->>'latitude')::numeric;
  office_lon := (office_location->>'longitude')::numeric;
  radius_meters := (geofence_config->>'radius_meters')::numeric;
  
  -- Calculate distance
  distance := calculate_distance(user_lat, user_lon, office_lat, office_lon);
  
  -- Check if within radius
  is_valid := distance <= radius_meters;
  
  RETURN jsonb_build_object(
    'valid', is_valid,
    'distance', distance,
    'radius', radius_meters,
    'office_lat', office_lat,
    'office_lon', office_lon
  );
END;
$$;

-- Create trigger to automatically validate geofencing on insert/update
CREATE OR REPLACE FUNCTION validate_attendance_geofence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  geofence_result jsonb;
BEGIN
  -- Only validate if location coordinates are provided
  IF NEW.location_latitude IS NOT NULL AND NEW.location_longitude IS NOT NULL THEN
    geofence_result := validate_geofence(NEW.location_latitude, NEW.location_longitude);
    
    NEW.geofence_valid := (geofence_result->>'valid')::boolean;
    NEW.distance_from_office := (geofence_result->>'distance')::numeric;
    NEW.office_latitude := (geofence_result->>'office_lat')::numeric;
    NEW.office_longitude := (geofence_result->>'office_lon')::numeric;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS attendance_geofence_validation ON public.attendance;
CREATE TRIGGER attendance_geofence_validation
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION validate_attendance_geofence();

-- Update RLS policies to include new columns
-- Policy: Users can update their own attendance for check-out
CREATE POLICY "Users can update own attendance for checkout"
ON public.attendance FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view system settings
CREATE POLICY "Users can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create trigger for system_settings updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for attendance analytics
CREATE OR REPLACE VIEW attendance_analytics AS
SELECT 
  DATE(attendance_date) as date,
  COUNT(*) as total_attendance,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_count,
  COUNT(CASE WHEN geofence_valid = true THEN 1 END) as valid_location_count,
  COUNT(CASE WHEN geofence_valid = false THEN 1 END) as invalid_location_count,
  AVG(distance_from_office) as avg_distance_from_office
FROM public.attendance
WHERE attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(attendance_date)
ORDER BY date DESC;

-- Grant access to analytics view
GRANT SELECT ON attendance_analytics TO authenticated;



