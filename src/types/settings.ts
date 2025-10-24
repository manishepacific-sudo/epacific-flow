// System settings types - These tables may not be in the auto-generated types yet
// but are used by the application for managing system configuration

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingInsert {
  id?: string;
  key: string;
  value: any;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SystemSettingUpdate {
  id?: string;
  key?: string;
  value?: any;
  description?: string;
  created_at?: string;
  updated_at?: string;
}
