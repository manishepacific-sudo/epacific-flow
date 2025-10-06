-- Add seed data for system settings
INSERT INTO public.system_settings (key, category, value, description) VALUES
  (
    'system.app.name',
    'system',
    '"Epacific Flow"',
    'Application name displayed throughout the system'
  ),
  (
    'system.app.description',
    'system',
    '"Employee management and workflow system"',
    'Brief description of the application purpose'
  ),
  (
    'system.timezone',
    'system',
    '"Asia/Kolkata"',
    'Default timezone for date and time display'
  ),
  (
    'system.datetime.format',
    'system',
    '{"dateFormat": "DD/MM/YYYY", "timeFormat": "12h"}',
    'Date and time format preferences'
  ),
  (
    'system.language',
    'system',
    '"en"',
    'Default language for the application interface'
  ),
  (
    'system.maintenance.mode',
    'system',
    'false',
    'System maintenance mode toggle'
  )
ON CONFLICT (key) DO NOTHING;