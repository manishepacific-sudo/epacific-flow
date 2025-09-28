import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3,
  Users,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Bell
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedUserManagement from "@/components/EnhancedUserManagement";
import ReportManagement from "@/pages/ReportManagement";
import PaymentManagement from "@/pages/PaymentManagement";

interface DashboardStats {
  totalUsers: number;
  pendingReports: number;
  pendingPayments: number;
  approvedThisMonth: number;
}

interface Report {
  id: string;
  title: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
}

export default function ManagerDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingReports: 0,
    pendingPayments: 0,
    approvedThisMonth: 0
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [testingNotifications, setTestingNotifications] = useState(false);

  useEffect(() => {
    if (user && profile?.role === 'manager') {
      fetchDashboardData();
    }
  }, [user, profile]);

  const handleTestNotifications = async () => {
    setTestingNotifications(true);
    try {
      const { notifyReportApproved, notifyPaymentApproved } = await import("@/utils/notifications");
      const userId = '1c601c4f-056f-4328-b1ca-153c10abfb03';
      
      await notifyReportApproved(userId, 'Monthly Report');
      await notifyPaymentApproved(userId, 1750);
      
      toast({
        title: "Test Notifications Created",
        description: "Test notifications have been created. Check the notification bell or switch to user view to see them.",
      });
    } catch (error) {
      console.error('Error creating test notifications:', error);
      toast({
        title: "Error",
        description: "Failed to create test notifications: " + (error instanceof Error ? error.message : 'Unknown error'),
        variant: "destructive"
      });
    } finally {
      setTestingNotifications(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!profile?.email) return;
    
    try {
      setLoading(true);
      setError(null);

      const [usersRes, reportsRes, paymentsRes] = await Promise.all([
        supabase.functions.invoke('get-users', {
          body: { admin_email: profile?.email }
        }),
        supabase.functions.invoke('get-reports', {
          body: { admin_email: profile?.email }
        }),
        supabase.functions.invoke('get-payments', {
          body: { admin_email: profile?.email }
        })
      ]);

      let usersData, reportsData, paymentsData;

      if (usersRes.error || reportsRes.error || paymentsRes.error) {
        console.log('Edge functions failed, using fallback queries');
        const [fallbackUsersRes, fallbackReportsRes, fallbackPaymentsRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('reports').select('*, profiles(full_name)').order('created_at', { ascending: false }),
          supabase.from('payments').select('*, profiles(full_name)').order('created_at', { ascending: false })
        ]);

        usersData = fallbackUsersRes.data || [];
        reportsData = fallbackReportsRes.data || [];
        paymentsData = fallbackPaymentsRes.data || [];
      } else {
        usersData = usersRes.data?.users || [];
        reportsData = reportsRes.data?.reports || [];
        paymentsData = paymentsRes.data?.payments || [];
      }

      setReports(reportsData.slice(0, 5));
      setPayments(paymentsData.slice(0, 5));

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const approvedThisMonth = reportsData.filter((report: any) => {
        const reportDate = new Date(report.created_at);
        return report.status === 'approved' && 
               reportDate.getMonth() === currentMonth && 
               reportDate.getFullYear() === currentYear;
      }).length;

      setStats({
        totalUsers: usersData.length,
        pendingReports: reportsData.filter((r: any) => r.status === 'pending').length,
        pendingPayments: paymentsData.filter((p: any) => p.status === 'pending').length,
        approvedThisMonth
      });

    } catch (error: any) {
      console.error('Dashboard data fetch error:', error);
      setError(error.message || 'Failed to load dashboard data');
      toast({
        title: "Error loading data",
        description: error.message || "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout role="manager">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout role="manager">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Failed to load data</h3>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <Button onClick={fetchDashboardData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const statsCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: "Total registered users"
    },
    {
      title: "Pending Reports",
      value: stats.pendingReports,
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      trend: "Need review"
    },
    {
      title: "Pending Payments",
      value: stats.pendingPayments,
      icon: CreditCard,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      trend: "Need approval"
    },
    {
      title: "Approved This Month",
      value: stats.approvedThisMonth,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: "Reports approved"
    }
  ];

  return (
    <Layout role="manager">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Manager Dashboard</h1>
              <p className="text-muted-foreground">
                Overview of system activity and pending tasks
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleTestNotifications}
              disabled={testingNotifications}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              {testingNotifications ? 'Creating...' : 'Test Notifications'}
            </Button>
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

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlassCard className="p-6 hover-glow">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className="text-3xl font-bold">{card.value}</p>
                        <p className="text-xs text-muted-foreground">{card.trend}</p>
                      </div>
                      <div className={`p-3 rounded-full ${card.bgColor}`}>
                        <card.icon className={`h-6 w-6 ${card.color}`} />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Reports */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Reports</h3>
                  <Badge variant="secondary">{reports.length}</Badge>
                </div>
                <div className="space-y-3">
                  {reports.slice(0, 5).map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.profiles?.full_name} • {format(new Date(report.created_at), 'MMM dd')}
                        </p>
                      </div>
                      <Badge 
                        variant={report.status === 'approved' ? 'default' : 
                                report.status === 'rejected' ? 'destructive' : 'secondary'}
                      >
                        {report.status}
                      </Badge>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No recent reports</p>
                  )}
                </div>
              </GlassCard>

              {/* Recent Payments */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Payments</h3>
                  <Badge variant="secondary">{payments.length}</Badge>
                </div>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.profiles?.full_name} • {format(new Date(payment.created_at), 'MMM dd')}
                        </p>
                      </div>
                      <Badge 
                        variant={payment.status === 'approved' ? 'default' : 
                                payment.status === 'rejected' ? 'destructive' : 'secondary'}
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No recent payments</p>
                  )}
                </div>
              </GlassCard>
            </div>
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