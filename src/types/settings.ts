import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Re-export system settings types using Tables aliases
export type SystemSetting = Tables<'system_settings'>;
export type SystemSettingInsert = TablesInsert<'system_settings'>;
export type SystemSettingUpdate = TablesUpdate<'system_settings'>;