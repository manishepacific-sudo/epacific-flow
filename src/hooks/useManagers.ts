import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Manager { value: string; label: string; email?: string }

export function useManagers() {
  return useQuery<Manager[], Error>({
    queryKey: ['managers'],
    queryFn: async () => {
      try {
        // Get manager user IDs from user_roles
        const { data: managerRoles, error: roleError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'manager');
        
        if (roleError) throw roleError;
        
        const managerIds = (managerRoles || []).map(r => r.user_id);
        if (managerIds.length === 0) return [];
        
        // Get manager profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', managerIds)
          .order('full_name', { ascending: true });
          
        if (error) throw error;
        const managers = (data || []).map((m: any) => ({ value: m.user_id, label: m.full_name || m.email || m.user_id, email: m.email }));
        return managers;
      } catch (err) {
        console.debug('[useManagers] error', err);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false
  });
}
