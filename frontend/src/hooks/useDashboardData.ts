import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardDataOptions {
  limit?: number;
  offset?: number;
}

export const useDashboardUsers = (options: DashboardDataOptions = {}) => {
  const { limit = 20, offset = 0 } = options;
  
  return useQuery({
    queryKey: ['dashboard-users', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDashboardReports = (options: DashboardDataOptions = {}) => {
  const { limit = 20, offset = 0 } = options;
  
  return useQuery({
    queryKey: ['dashboard-reports', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*, profiles(full_name, email, mobile_number, center_address, registrar)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useDashboardPayments = (options: DashboardDataOptions = {}) => {
  const { limit = 20, offset = 0 } = options;
  
  return useQuery({
    queryKey: ['dashboard-payments', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, profiles(full_name, email, mobile_number, center_address, registrar)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [usersRes, reportsRes, paymentsRes] = await Promise.all([
        supabase.from('profiles').select('id'),
        supabase.from('reports').select('id, status'),
        supabase.from('payments').select('id, status, amount'),
      ]);

      const users = usersRes.data || [];
      const reports = reportsRes.data || [];
      const payments = paymentsRes.data || [];

      const pendingReports = reports.filter(r => r.status === 'pending').length;
      const pendingPayments = payments.filter(p => p.status === 'pending').length;
      const totalRevenue = payments
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      return {
        totalUsers: users.length,
        totalReports: reports.length,
        pendingApprovals: pendingReports + pendingPayments,
        totalRevenue,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
