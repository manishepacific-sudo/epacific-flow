import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  FileText, 
  CreditCard, 
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
  UserPlus,
  Settings
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import EnhancedUserManagement from "@/components/EnhancedUserManagement";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    pendingApprovals: 0,
    totalRevenue: 0
  });
  const [recentData, setRecentData] = useState({
    users: [],
    reports: [],
    payments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Use edge functions to fetch data (bypasses RLS for demo mode)
      const [usersResult, reportsResult, paymentsResult] = await Promise.all([
        supabase.functions.invoke('get-users', { body: { admin_email: user?.email } }),
        supabase.functions.invoke('get-reports', { body: { admin_email: user?.email } }),
        supabase.functions.invoke('get-payments', { body: { admin_email: user?.email } })
      ]);

      const users = usersResult.data?.users || [];
      const reports = reportsResult.data?.reports || [];
      const payments = paymentsResult.data?.payments || [];

      const pendingReports = reports.filter(r => r.status === 'pending_review').length;
      const pendingPayments = payments.filter(p => p.status === 'pending_review').length;
      const totalRevenue = payments
        .filter(p => p.status === 'verified')
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalUsers: users.length,
        totalReports: reports.length,
        pendingApprovals: pendingReports + pendingPayments,
        totalRevenue
      });

      setRecentData({
        users: users.slice(0, 3),
        reports: reports.slice(0, 3),
        payments: payments.slice(0, 3)
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Fallback to direct queries
      try {
        const [usersRes, reportsRes, paymentsRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('reports').select('*').order('created_at', { ascending: false }),
          supabase.from('payments').select('*').order('created_at', { ascending: false })
        ]);

        const users = usersRes.data || [];
        const reports = reportsRes.data || [];
        const payments = paymentsRes.data || [];

        const pendingReports = reports.filter(r => r.status === 'pending_review').length;
        const pendingPayments = payments.filter(p => p.status === 'pending_review').length;
        const totalRevenue = payments
          .filter(p => p.status === 'verified')
          .reduce((sum, p) => sum + p.amount, 0);

        setStats({
          totalUsers: users.length,
          totalReports: reports.length,
          pendingApprovals: pendingReports + pendingPayments,
          totalRevenue
        });

        setRecentData({
          users: users.slice(0, 3),
          reports: reports.slice(0, 3),
          payments: payments.slice(0, 3)
        });
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const dashboardCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      trend: "+12% from last month",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Reports",
      value: stats.totalReports,
      icon: FileText,
      trend: "+8% from last month",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Clock,
      trend: "Requires attention",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: "+15% from last month",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  if (loading) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Overview of system activity and user management
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-6">

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.trend}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentData.users.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No users found
                  </div>
                ) : (
                  recentData.users.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentData.reports.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No reports found
                  </div>
                ) : (
                  recentData.reports.map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">{report.title}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={report.status === 'approved' ? 'default' : 'secondary'}
                        className={`text-xs ${report.status === 'approved' ? 'bg-green-100 text-green-800' : ''}`}
                      >
                        {report.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start gap-2 h-12">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-12">
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-12">
                <TrendingUp className="h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </motion.div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <EnhancedUserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}