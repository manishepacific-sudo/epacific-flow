-- Add additional fields to attendance table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'location_accuracy'
  ) THEN
    ALTER TABLE public.attendance ADD COLUMN location_accuracy numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.attendance ADD COLUMN approved_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.attendance ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'remarks'
  ) THEN
    ALTER TABLE public.attendance ADD COLUMN remarks text;
  END IF;
END$$;


