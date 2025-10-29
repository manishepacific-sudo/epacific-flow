-- Epacific Flow Database Setup
-- Run this SQL in your Supabase SQL Editor to create all required tables

-- ============================================
-- 1. PROFILES TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  station_id TEXT NOT NULL,
  center_address TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- 2. REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Monthly Report',
  description TEXT NOT NULL DEFAULT 'Report submitted via file upload',
  attachment_url TEXT,
  amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  manager_notes TEXT,
  rejection_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 3. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('phonepe', 'offline')),
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  phonepe_transaction_id TEXT,
  admin_notes TEXT,
  rejection_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 4. ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  photo_url TEXT NOT NULL,
  location_latitude NUMERIC(10,8) NOT NULL,
  location_longitude NUMERIC(11,8) NOT NULL,
  location_address TEXT,
  city TEXT,
  attendance_date DATE NOT NULL DEFAULT current_date,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'checked_in', 'checked_out')),
  manager_notes TEXT,
  rejection_message TEXT,
  remarks TEXT,
  geofence_valid BOOLEAN DEFAULT true,
  office_latitude NUMERIC(10,8),
  office_longitude NUMERIC(11,8),
  distance_from_office NUMERIC(8,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- 5. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- 6. INDEXES
-- ============================================
-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_user_id_report_date ON public.reports(user_id, report_date);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_report_id ON public.payments(report_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS attendance_user_id_idx ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS attendance_status_idx ON public.attendance(status);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS attendance_check_in_time_idx ON public.attendance(check_in_time);
CREATE INDEX IF NOT EXISTS attendance_check_out_time_idx ON public.attendance(check_out_time);
CREATE INDEX IF NOT EXISTS attendance_geofence_valid_idx ON public.attendance(geofence_valid);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_user_date_idx ON public.attendance(user_id, attendance_date);

-- ============================================
-- 7. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('report-attachments', 'report-attachments', false),
  ('attendance-photos', 'attendance-photos', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Reports policies
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own reports" ON public.reports;
CREATE POLICY "Users can create their own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending reports" ON public.reports;
CREATE POLICY "Users can update their own pending reports" ON public.reports FOR UPDATE USING (auth.uid() = user_id AND status = 'pending_approval');

DROP POLICY IF EXISTS "Managers and admins can view all reports" ON public.reports;
CREATE POLICY "Managers and admins can view all reports" ON public.reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers and admins can update all reports" ON public.reports;
CREATE POLICY "Managers and admins can update all reports" ON public.reports FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
CREATE POLICY "Users can create their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Managers and admins can view all payments" ON public.payments;
CREATE POLICY "Managers and admins can view all payments" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Attendance policies
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance;
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Managers and admins can view all attendance" ON public.attendance;
CREATE POLICY "Managers and admins can view all attendance" ON public.attendance FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers and admins can update attendance" ON public.attendance;
CREATE POLICY "Managers and admins can update attendance" ON public.attendance FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Users can update own attendance for checkout" ON public.attendance;
CREATE POLICY "Users can update own attendance for checkout" ON public.attendance FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- System settings policies
DROP POLICY IF EXISTS "Users can view system settings" ON public.system_settings;
CREATE POLICY "Users can view system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);

-- ============================================
-- 10. STORAGE POLICIES
-- ============================================

-- Report attachments storage policies
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'report-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
CREATE POLICY "Users can view own files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'report-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Managers and admins can view all files" ON storage.objects;
CREATE POLICY "Managers and admins can view all files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'report-attachments' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Attendance photos storage policies
DROP POLICY IF EXISTS "Users can upload attendance photos" ON storage.objects;
CREATE POLICY "Users can upload attendance photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'attendance-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own attendance photos" ON storage.objects;
CREATE POLICY "Users can view own attendance photos" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'attendance-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Managers and admins can view all attendance photos" ON storage.objects;
CREATE POLICY "Managers and admins can view all attendance photos" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'attendance-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- ============================================
-- 11. FUNCTIONS AND TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. SEED DATA
-- ============================================

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES 
  ('office_location', '{"latitude": 28.6139, "longitude": 77.2090, "radius": 100, "address": "New Delhi, India"}', 'Office location for geofencing validation'),
  ('geofencing', '{"enabled": true, "radius_meters": 100, "strict_mode": false}', 'Geofencing configuration for attendance validation'),
  ('system.app.name', '"Epacific Flow"', 'Application name displayed throughout the system'),
  ('system.app.description', '"Employee management and workflow system"', 'Brief description of the application purpose'),
  ('system.timezone', '"Asia/Kolkata"', 'Default timezone for date and time display'),
  ('system.datetime.format', '{"dateFormat": "DD/MM/YYYY", "timeFormat": "12h"}', 'Date and time format preferences'),
  ('system.language', '"en"', 'Default language for the application interface'),
  ('system.maintenance.mode', 'false', 'System maintenance mode toggle')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 13. ANALYTICS VIEW
-- ============================================
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

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Epacific Flow database setup completed successfully!';
  RAISE NOTICE 'All tables, policies, and functions have been created.';
  RAISE NOTICE 'You can now use all features of the application.';
END $$;

