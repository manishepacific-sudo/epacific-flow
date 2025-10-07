import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Type definitions for settings
type SettingKey = 'session.timeout.duration' | 'session.timeout.warning' | 'payments.methods' | 'payments.bank.details';

// Type for batch settings response
type BatchSettingsResponse = {
  [K in SettingKey]?: SettingTypeMap[K];
};
type PaymentMethod = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  color?: string;
};

type BankDetails = {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
};

type SettingTypeMap = {
  'session.timeout.duration': number;
  'session.timeout.warning': number;
  'payments.methods': PaymentMethod[];
  'payments.bank.details': BankDetails;
};

// Default values map
export const DEFAULT_SETTINGS: SettingTypeMap = {
  'session.timeout.duration': 15, // 15 minutes
  'session.timeout.warning': 2,   // 2 minutes
  'payments.methods': [{
    id: "razorpay",
    name: "Razorpay",
    description: "Pay securely via Razorpay",
    enabled: true,
    color: "bg-blue-500"
  }, {
    id: "offline",
    name: "Offline Payment",
    description: "Pay via bank transfer",
    enabled: true,
    color: "bg-green-500"
  }],
  'payments.bank.details': {
    accountName: "Epacific Services",
    accountNumber: "1234567890",
    ifscCode: "EPAC0001234",
    bankName: "Demo Bank"
  }
};

// Default colors by payment method ID
const DEFAULT_METHOD_COLORS: Record<string, string> = {
  razorpay: "bg-blue-500",
  offline: "bg-green-500"
};

// Main settings hook with type safety and fallbacks
// Batch settings hook for efficient fetching
export function useSettingsBatch<K extends SettingKey>(keys: K[]) {
  // Sort keys for stable cache key
  const sortedKeys = [...keys].sort();

  return useQuery<Pick<SettingTypeMap, K>, Error>({
    queryKey: ['settings', 'batch', ...sortedKeys],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('manage-settings', {
          body: { 
            action: 'get',
            payload: { keys: sortedKeys }
          }
        });

        if (error) {
          console.debug(`[useSettingsBatch] Falling back to defaults for keys ${keys.join(', ')}:`, error);
          return keys.reduce((acc, key) => {
            acc[key] = DEFAULT_SETTINGS[key];
            return acc;
          }, {} as Pick<SettingTypeMap, K>);
        }

        const settingsArray = (data?.data ?? []) as Array<{key: SettingKey, value: unknown}>;
        const values = settingsArray.reduce((acc, setting) => {
          if (setting.key === 'session.timeout.duration' || setting.key === 'session.timeout.warning') {
            // Normalize timeout/warning values to numbers
            acc[setting.key] = typeof setting.value === 'object' && setting.value 
              ? (setting.value as { minutes: number }).minutes 
              : typeof setting.value === 'number' 
                ? setting.value 
                : DEFAULT_SETTINGS[setting.key];
          } else if (setting.key === 'payments.methods') {
            // Cast payment methods to their expected type
            acc[setting.key] = setting.value as PaymentMethod[];
          } else if (setting.key === 'payments.bank.details') {
            // Cast bank details to their expected type
            acc[setting.key] = setting.value as BankDetails;
          }
          return acc;
        }, {} as Partial<SettingTypeMap>);
        
        return keys.reduce((acc, key) => {
          acc[key] = (values[key] ?? DEFAULT_SETTINGS[key]) as SettingTypeMap[K];
          return acc;
        }, {} as Pick<SettingTypeMap, K>);
      } catch (err) {
        console.debug(`[useSettingsBatch] Falling back to defaults due to exception:`, err);
        return keys.reduce((acc, key) => {
          acc[key] = DEFAULT_SETTINGS[key];
          return acc;
        }, {} as Pick<SettingTypeMap, K>);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 30 * 60 * 1000,
    staleTime: 5 * 60 * 1000
  });
}

// Single setting hook
export function useSettings<K extends SettingKey>(key: K) {
  // Auth not required for public settings
  return useQuery<SettingTypeMap[K], Error>({
    queryKey: ['settings', key],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('manage-settings', {
          body: { 
            action: 'get',
            payload: { key }
          }
        });

        if (error) {
          console.debug(`[useSettings] Falling back to defaults for ${key} due to error:`, error);
          return DEFAULT_SETTINGS[key];
        }

        return data?.data?.value ?? DEFAULT_SETTINGS[key];
      } catch (err) {
        console.debug(`[useSettings] Falling back to defaults for ${key} due to exception:`, err);
        return DEFAULT_SETTINGS[key];
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 30 * 60 * 1000, // 30 minutes
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// Session timeout settings hook with batch fetching
export function useSessionTimeoutSettings() {
  const { data } = useSettingsBatch(['session.timeout.duration', 'session.timeout.warning']);
  
  const timeout = typeof data?.['session.timeout.duration'] === 'number' 
    ? data['session.timeout.duration'] 
    : DEFAULT_SETTINGS['session.timeout.duration'];
    
  const warning = typeof data?.['session.timeout.warning'] === 'number' 
    ? data['session.timeout.warning'] 
    : DEFAULT_SETTINGS['session.timeout.warning'];

  return {
    timeoutMinutes: timeout,
    warningMinutes: warning
  };
}

// Payment methods settings hook with transformation and validation
export function usePaymentMethodsSettings() {
  const { data: methods } = useSettings('payments.methods');
  const methodsList = Array.isArray(methods) ? methods : DEFAULT_SETTINGS['payments.methods'];
  
  // Only include supported payment methods
  const supportedIds = new Set(['razorpay', 'offline']);
  
  return methodsList
    .filter(method => supportedIds.has(method.id))
    .map(method => ({
      id: method.id,
      name: method.name,
      description: method.description,
      available: !!method.enabled,
      color: method.color ?? DEFAULT_METHOD_COLORS[method.id] ?? 'bg-muted'
    }));
}

// Bank details settings hook with defaults merging and validation
export function useBankDetails() {
  const { data: details } = useSettings('payments.bank.details');
  const isValidObject = details && typeof details === 'object' && !Array.isArray(details);
  const raw = isValidObject ? details : {};
  
  return {
    ...DEFAULT_SETTINGS['payments.bank.details'],
    ...(raw as Partial<typeof DEFAULT_SETTINGS['payments.bank.details']>)
  };
}