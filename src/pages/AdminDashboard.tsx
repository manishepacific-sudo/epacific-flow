<<<<<<< HEAD
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
=======
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { APIReport, APIUser, APIPayment } from "@/types/api";
import { 
  Users, FileText, DollarSign, Clock, BarChart3,
  UserPlus, Download, Eye, CheckCircle, XCircle,
  Edit, Trash2, MoreVertical, RefreshCw
} from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
>>>>>>> feature/settings-management
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { 
<<<<<<< HEAD
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
=======
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar
} from "recharts";
import { downloadFileFromStorage } from '@/utils/fileDownload';
import ErrorBoundary from "@/components/ErrorBoundary";

interface DashboardStats {
  totalUsers: number;
  totalReports: number;
  pendingApprovals: number;
  totalRevenue: number;
}

interface RecentData {
  users: APIUser[];
  reports: APIReport[];
  payments: APIPayment[];
}

interface AnalyticsDataPoint {
  month: string;
  reports: number;
  revenue: number;
}

export default function AdminDashboard(): JSX.Element {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
>>>>>>> feature/settings-management
    totalUsers: 0,
    totalReports: 0,
    pendingApprovals: 0,
    totalRevenue: 0
  });
<<<<<<< HEAD
  const [recentData, setRecentData] = useState({
=======
  const [recentData, setRecentData] = useState<RecentData>({
>>>>>>> feature/settings-management
    users: [],
    reports: [],
    payments: []
  });
<<<<<<< HEAD
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

=======
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataPoint[]>([]);

  const generateMonthlyData = useCallback((reports: APIReport[], payments: APIPayment[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => {
      const baseReports = Math.floor(reports.length / 6) + Math.floor(Math.random() * 5);
      const baseRevenue = Math.floor(
        payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) / 6
      ) + Math.floor(Math.random() * 5000);
      
      return {
        month,
        reports: baseReports + index * 2,
        revenue: baseRevenue + index * 1000
      };
    });
  }, []);

  const handleError = useCallback((error: unknown) => {
    console.error('Error:', error);
    setError(error instanceof Error ? error : new Error('An unexpected error occurred'));
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
    });
  }, [toast]);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.email) {
      handleError(new Error('User not authenticated'));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const [usersResult, reportsResult, paymentsResult] = await Promise.all([
        supabase.functions.invoke('get-users', { body: { admin_email: user.email } }),
        supabase.functions.invoke('get-reports', { body: { admin_email: user.email } }),
        supabase.functions.invoke('get-payments', { body: { admin_email: user.email } })
      ]);

      // Check for errors in responses
      if (usersResult.error) throw new Error(`Users: ${usersResult.error.message}`);
      if (reportsResult.error) throw new Error(`Reports: ${reportsResult.error.message}`);
      if (paymentsResult.error) throw new Error(`Payments: ${paymentsResult.error.message}`);

      // Type check and validate data
      if (!Array.isArray(usersResult.data?.users)) throw new Error('Invalid users data');
      if (!Array.isArray(reportsResult.data?.reports)) throw new Error('Invalid reports data');
      if (!Array.isArray(paymentsResult.data?.payments)) throw new Error('Invalid payments data');

      const users = usersResult.data.users;
      const reports = reportsResult.data.reports;
      const payments = paymentsResult.data.payments;

      // Calculate statistics
>>>>>>> feature/settings-management
      const pendingReports = reports.filter(r => r.status === 'pending').length;
      const pendingPayments = payments.filter(p => p.status === 'pending').length;
      const totalRevenue = payments
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

<<<<<<< HEAD
=======
      // Update state
>>>>>>> feature/settings-management
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
<<<<<<< HEAD
      console.error('Error fetching dashboard data:', error);
=======
      handleError(error);
>>>>>>> feature/settings-management
      
      // Fallback to direct queries
      try {
        const [usersRes, reportsRes, paymentsRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('reports').select('*').order('created_at', { ascending: false }),
          supabase.from('payments').select('*').order('created_at', { ascending: false })
        ]);

<<<<<<< HEAD
=======
        if (usersRes.error) throw usersRes.error;
        if (reportsRes.error) throw reportsRes.error;
        if (paymentsRes.error) throw paymentsRes.error;

>>>>>>> feature/settings-management
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

<<<<<<< HEAD
        // Generate analytics data
        const monthlyData = generateMonthlyData(reports, payments);
        setAnalyticsData(monthlyData);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
=======
        const monthlyData = generateMonthlyData(reports, payments);
        setAnalyticsData(monthlyData);
      } catch (fallbackError) {
        handleError(fallbackError);
>>>>>>> feature/settings-management
      }
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
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
=======
  }, [user, generateMonthlyData, handleError]);

  const handleRefresh = useCallback(async () => {
    toast({
      title: 'Refreshing',
      description: "Refreshing dashboard data...",
      duration: 2000,
    });
    try {
      await fetchDashboardData();
    } catch (error) {
      handleError(error);
    }
  }, [toast, fetchDashboardData, handleError]);

  const handleDownloadReport = useCallback(async (filePath: string, customName: string) => {
    try {
      await downloadFileFromStorage('report-attachments', filePath, customName);
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      handleError(error);
    }
  }, [toast, handleError]);

  useEffect(() => {
    fetchDashboardData().catch(handleError);
  }, [fetchDashboardData, handleError]);

  if (loading) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
>>>>>>> feature/settings-management

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

<<<<<<< HEAD
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
=======
  return (
    <Layout role="admin">
      <div className={cn("space-y-8 max-w-7xl mx-auto", isMobile && "pb-20")}>
>>>>>>> feature/settings-management
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
<<<<<<< HEAD
          </div>
        </motion.div>

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

=======
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </motion.div>

>>>>>>> feature/settings-management
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
<<<<<<< HEAD
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
=======
              whileHover={{ scale: 1.02 }}
            >
              <Card variant="elevated" className="group hover:shadow-glow-blue">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1 font-medium">{card.title}</p>
                      <motion.p 
                        className="text-2xl font-bold mb-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        {card.value}
                      </motion.p>
                      <p className="text-xs text-muted-foreground/80">{card.trend}</p>
                    </div>
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
                      "bg-gradient-to-br shadow-inner-glow",
                      card.bgColor.replace('bg-', 'from-').replace('/10', '/20') + ' to-' + card.bgColor.replace('bg-', '').replace('/10', '/5')
                    )}>
                      <card.icon className={cn("h-5 w-5", card.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
>>>>>>> feature/settings-management
            </motion.div>
          ))}
        </div>

<<<<<<< HEAD
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
=======
        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="elevated" className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Monthly Reports</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="reports" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="elevated" className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Monthly Revenue</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card variant="default" className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Users</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {recentData.users.length === 0 ? (
                <Card variant="default" className="py-8 border border-dashed">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                    <Button variant="outline" size="sm" className="mt-4">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New User
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentData.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {user.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
>>>>>>> feature/settings-management
        </motion.div>
      </div>
    </Layout>
  );
}