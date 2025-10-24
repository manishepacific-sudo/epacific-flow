import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserStats {
  totalUsers: number;
  totalAdmins: number;
  totalManagers: number;
  totalRegularUsers: number;
  activeUsers: number;
  pendingUsers: number;
  demoUsers: number;
}

export function useUserStats() {
  return useQuery<UserStats, Error>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        const profiles = Array.isArray(data) ? data : [];
        const totalUsers = profiles.length;
        const totalAdmins = profiles.filter((p: any) => p.role === 'admin').length;
        const totalManagers = profiles.filter((p: any) => p.role === 'manager').length;
        const totalRegularUsers = profiles.filter((p: any) => p.role === 'user').length;
        const activeUsers = profiles.filter((p: any) => p.password_set && !p.is_demo).length;
        const pendingUsers = profiles.filter((p: any) => !p.password_set).length;
        const demoUsers = profiles.filter((p: any) => p.is_demo).length;
        return { totalUsers, totalAdmins, totalManagers, totalRegularUsers, activeUsers, pendingUsers, demoUsers };
      } catch (err) {
        console.debug('[useUserStats] error', err);
        return { totalUsers: 0, totalAdmins: 0, totalManagers: 0, totalRegularUsers: 0, activeUsers: 0, pendingUsers: 0, demoUsers: 0 };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });
}
