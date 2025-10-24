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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar
} from "recharts";
import { downloadFileFromStorage } from '@/utils/fileDownload';
import ErrorBoundary from "@/components/ErrorBoundary";
import AttendanceAnalytics from "@/components/AttendanceAnalytics";

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
    totalUsers: 0,
    totalReports: 0,
    pendingApprovals: 0,
    totalRevenue: 0
  });
  const [recentData, setRecentData] = useState<RecentData>({
    users: [],
    reports: [],
    payments: []
  });
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
      const pendingReports = reports.filter(r => r.status === 'pending').length;
      const pendingPayments = payments.filter(p => p.status === 'pending').length;
      const totalRevenue = payments
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Update state
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
      handleError(error);
      
      // Fallback to direct queries
      try {
        const [usersRes, reportsRes, paymentsRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('reports').select('*').order('created_at', { ascending: false }),
          supabase.from('payments').select('*').order('created_at', { ascending: false })
        ]);

        if (usersRes.error) throw usersRes.error;
        if (reportsRes.error) throw reportsRes.error;
        if (paymentsRes.error) throw paymentsRes.error;

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

        const monthlyData = generateMonthlyData(reports, payments);
        setAnalyticsData(monthlyData);
      } catch (fallbackError) {
        handleError(fallbackError);
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <Layout role="admin">
      <div className={cn("space-y-8 max-w-7xl mx-auto", isMobile && "pb-20")}>
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
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </motion.div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
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
            </motion.div>
          ))}
        </div>

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
        </motion.div>

        {/* Attendance Analytics Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AttendanceAnalytics />
        </motion.div>
      </div>
    </Layout>
  );
}