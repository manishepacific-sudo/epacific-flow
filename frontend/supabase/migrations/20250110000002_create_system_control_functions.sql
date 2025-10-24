-- Migration: Create RPC functions for system control operations
-- Purpose: Provide admin-only utilities for backup validation, restore validation, and clearing test/demo data
BEGIN;

-- Function: backup_database()
CREATE OR REPLACE FUNCTION public.backup_database()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := jsonb_build_object();
  _timestamp timestamptz := now();
  _role text;
BEGIN
  PERFORM set_config('search_path', 'public', true);
  SELECT get_current_user_role() INTO _role;
  IF _role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  result := jsonb_build_object('timestamp', _timestamp);
  -- Safely aggregate tables; guard against missing tables to avoid "relation does not exist"
  -- Use to_regclass to detect table presence and COALESCE to convert empty results to []
  result := result || jsonb_build_object('tables', jsonb_build_object(
    'profiles', CASE WHEN to_regclass('public.profiles') IS NOT NULL THEN COALESCE((SELECT to_jsonb(array_agg(t)) FROM (SELECT * FROM profiles) t), '[]'::jsonb) ELSE '[]'::jsonb END,
    'user_roles', CASE WHEN to_regclass('public.user_roles') IS NOT NULL THEN COALESCE((SELECT to_jsonb(array_agg(t)) FROM (SELECT * FROM user_roles) t), '[]'::jsonb) ELSE '[]'::jsonb END,
    'reports', CASE WHEN to_regclass('public.reports') IS NOT NULL THEN COALESCE((SELECT to_jsonb(array_agg(t)) FROM (SELECT * FROM reports) t), '[]'::jsonb) ELSE '[]'::jsonb END,
    'payments', CASE WHEN to_regclass('public.payments') IS NOT NULL THEN COALESCE((SELECT to_jsonb(array_agg(t)) FROM (SELECT * FROM payments) t), '[]'::jsonb) ELSE '[]'::jsonb END,
    'attendance', CASE WHEN to_regclass('public.attendance') IS NOT NULL THEN COALESCE((SELECT to_jsonb(array_agg(t)) FROM (SELECT * FROM attendance) t), '[]'::jsonb) ELSE '[]'::jsonb END,
    'notifications', CASE WHEN to_regclass('public.notifications') IS NOT NULL THEN COALESCE((SELECT to_jsonb(array_agg(t)) FROM (SELECT * FROM notifications) t), '[]'::jsonb) ELSE '[]'::jsonb END,
    'system_settings', CASE WHEN to_regclass('public.system_settings') IS NOT NULL THEN COALESCE((SELECT to_jsonb(array_agg(t)) FROM (SELECT * FROM system_settings) t), '[]'::jsonb) ELSE '[]'::jsonb END,
    'security_audit_log', CASE WHEN to_regclass('public.security_audit_log') IS NOT NULL THEN COALESCE((SELECT to_jsonb(array_agg(t)) FROM (SELECT * FROM security_audit_log) t), '[]'::jsonb) ELSE '[]'::jsonb END
  ));

  PERFORM log_security_event('database_backup', NULL, jsonb_build_object('detail', 'Backup requested via backup_database()'));

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.backup_database() IS 'Creates a JSONB snapshot of critical tables for admin use (read-only export). SECURITY DEFINER and admin role required.';

-- Function: restore_database(backup_data JSONB)
CREATE OR REPLACE FUNCTION public.restore_database(backup_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _role text;
BEGIN
  PERFORM set_config('search_path', 'public', true);
  SELECT get_current_user_role() INTO _role;
  IF _role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  IF backup_data IS NULL OR NOT (backup_data ? 'timestamp') OR NOT (backup_data ? 'tables') THEN
    RAISE EXCEPTION 'Invalid backup structure';
  END IF;

  PERFORM log_security_event('database_restore_attempted', NULL, jsonb_build_object('detail', 'Restore validation attempted via restore_database()'));

  RETURN jsonb_build_object('status', 'validation_passed', 'message', 'Backup structure is valid. Manual restoration required for safety.');
END;
$$;

COMMENT ON FUNCTION public.restore_database(jsonb) IS 'Validates backup JSONB structure. Does NOT perform automatic restoration. SECURITY DEFINER and admin role required.';

-- Function: clear_test_data()
CREATE OR REPLACE FUNCTION public.clear_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _role text;
  deleted_profiles int := 0;
  deleted_reports int := 0;
  deleted_payments int := 0;
  deleted_attendance int := 0;
BEGIN
  PERFORM set_config('search_path', 'public', true);
  SELECT get_current_user_role() INTO _role;
  IF _role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  BEGIN
    DELETE FROM reports WHERE user_id IN (SELECT id FROM profiles WHERE is_demo = true);
    GET DIAGNOSTICS deleted_reports = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;

  BEGIN
    DELETE FROM payments WHERE user_id IN (SELECT id FROM profiles WHERE is_demo = true);
    GET DIAGNOSTICS deleted_payments = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;

  BEGIN
    DELETE FROM attendance WHERE user_id IN (SELECT id FROM profiles WHERE is_demo = true);
    GET DIAGNOSTICS deleted_attendance = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;

  BEGIN
    DELETE FROM profiles WHERE is_demo = true;
    GET DIAGNOSTICS deleted_profiles = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;

  PERFORM log_security_event('test_data_cleared', NULL, jsonb_build_object('counts', jsonb_build_object('profiles', deleted_profiles, 'reports', deleted_reports, 'payments', deleted_payments, 'attendance', deleted_attendance)));

  RETURN jsonb_build_object('deleted', jsonb_build_object('profiles', deleted_profiles, 'reports', deleted_reports, 'payments', deleted_payments, 'attendance', deleted_attendance));
END;
$$;

COMMENT ON FUNCTION public.clear_test_data() IS 'Deletes demo/test records (profiles.is_demo = true) and cascades to related tables. SECURITY DEFINER and admin role required.';

COMMIT;
