import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Re-export system settings types using Tables aliases
export type SystemSetting = Tables<'system_settings'>;
export type SystemSettingInsert = TablesInsert<'system_settings'>;
export type SystemSettingUpdate = TablesUpdate<'system_settings'>;

export type EmailProvider = 'smtp' | 'sendgrid' | 'mailgun' | 'aws-ses';

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  secure: boolean;
}

export interface EmailServiceSettings {
  provider: EmailProvider;
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  smtp?: SmtpConfig;
  apiKey?: string;
  hasApiKey?: boolean;
  hasSmtpPassword?: boolean;
}

export interface SmsProvider {
  provider: 'Twilio' | 'AWS SNS' | 'Nexmo' | 'Other';
  enabled: boolean;
  senderId?: string;
  apiKey?: string;
  hasApiKey?: boolean;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface SystemSettings {
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  language: string;
}

export interface ThirdPartyApiSettings {
  name: string;
  apiKey?: string;
  enabled: boolean;
  config: Record<string, any>;
  hasApiKey?: boolean;
}