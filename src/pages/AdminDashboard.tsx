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
  Settings,
  Download,
  Eye,
  CheckCircle,
  XCircle
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
import ReportManagement from "@/pages/ReportManagement";
import PaymentManagement from "@/pages/PaymentManagement";
import { useToast } from "@/hooks/use-toast";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar
} from "recharts";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [analyticsData, setAnalyticsData] = useState([]);
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

      const pendingReports = reports.filter(r => r.status === 'pending').length;
      const pendingPayments = payments.filter(p => p.status === 'pending').length;
      const totalRevenue = payments
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

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

      // Generate analytics data
      const monthlyData = generateMonthlyData(reports, payments);
      setAnalyticsData(monthlyData);
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

        const pendingReports = reports.filter(r => r.status === 'pending').length;
        const pendingPayments = payments.filter(p => p.status === 'pending').length;
        const totalRevenue = payments
          .filter(p => p.status === 'approved')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

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

        // Generate analytics data
        const monthlyData = generateMonthlyData(reports, payments);
        setAnalyticsData(monthlyData);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (reports: any[], payments: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => {
      // Simulate data based on actual counts with some randomness
      const baseReports = Math.floor(reports.length / 6) + Math.floor(Math.random() * 5);
      const baseRevenue = Math.floor(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) / 6) + Math.floor(Math.random() * 5000);
      
      return {
        month,
        reports: baseReports + index * 2,
        revenue: baseRevenue + index * 1000
      };
    });
  };

  const downloadFile = async (url: string, filename?: string) => {
    try {
      const { data, error } = await supabase.storage.from('report-attachments').download(url);
      
      if (error) throw error;
      
      // Determine content type - force download for HTML files
      let contentType = data.type;
      if (filename?.toLowerCase().endsWith('.html') || url.toLowerCase().includes('.html')) {
        contentType = 'application/octet-stream'; // Force download instead of display
      }
      
      const blob = new Blob([data], { type: contentType });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      link.setAttribute('download', filename || 'download'); // Ensure download attribute
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      toast({ title: "File downloaded successfully" });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({ 
        title: "Download failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const exportData = async (type: 'csv' | 'pdf' = 'csv') => {
    try {
      const [reportsRes, paymentsRes, usersRes] = await Promise.all([
        supabase.from('reports').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ]);

      const data = {
        reports: reportsRes.data || [],
        payments: paymentsRes.data || [],
        users: usersRes.data || [],
        generatedAt: new Date().toISOString()
      };

      if (type === 'csv') {
        const csvContent = convertToCSV(data);
        downloadCSV(csvContent, 'admin-report.csv');
      }

      toast({ title: `${type.toUpperCase()} report generated successfully` });
    } catch (error: any) {
      toast({ 
        title: "Export failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const convertToCSV = (data: any) => {
    const reports = data.reports.map((r: any) => 
      `Report,${r.id},${r.title},${r.status},${r.amount || 0},${r.created_at}`
    );
    const payments = data.payments.map((p: any) => 
      `Payment,${p.id},${p.method},${p.status},${p.amount},${p.created_at}`
    );
    
    const header = 'Type,ID,Title/Method,Status,Amount,Date\n';
    return header + [...reports, ...payments].join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-6">

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 analytics-charts">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Reports</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="reports" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Revenue</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

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
                    <div key={report.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{Number(report.amount || 0).toLocaleString()} • {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.attachment_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadFile(report.attachment_url, `report-${report.id}.pdf`)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        <Badge 
                          variant={report.status === 'approved' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {report.status}
                        </Badge>
                      </div>
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
              <Button 
                variant="outline" 
                className="justify-start gap-2 h-12"
                onClick={() => window.open('/dashboard/admin', '_blank')}
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 h-12"
                onClick={() => {
                  const element = document.querySelector('.analytics-charts');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 h-12"
                onClick={() => exportData('csv')}
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>
        </motion.div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <EnhancedUserManagement />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="space-y-6">
              <ReportManagement />
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <div className="space-y-6">
              <PaymentManagement />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}