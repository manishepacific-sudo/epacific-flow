-- Seed user management invite setting
INSERT INTO public.system_settings (key, category, value, description)
VALUES ('user_mgmt.invites.enabled','system','{"enabled": true}'::jsonb,'Enable or disable user invitation functionality')
ON CONFLICT (key) DO NOTHING;
