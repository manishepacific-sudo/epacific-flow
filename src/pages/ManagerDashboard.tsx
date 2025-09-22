import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  BarChart3,
  Users,
  FileText,
  CreditCard,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Eye,
  Download
} from "lucide-react";
import Layout from "@/components/Layout";
import UserManagement from "@/components/UserManagement";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DashboardStats {
  totalUsers: number;
  pendingReports: number;
  pendingPayments: number;
  approvedThisMonth: number;
}

interface Report {
  id: string;
  title: string;
  description: string;
  amount: number;
  attachment_url: string;
  status: string;
  created_at: string;
  user_id: string;
  manager_notes?: string;
  rejection_message?: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  proof_url: string;
  status: string;
  created_at: string;
  user_id: string;
  report_id: string;
  admin_notes?: string;
  rejection_message?: string;
  phonepe_transaction_id?: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  reports?: {
    title: string;
  } | null;
}

export default function ManagerDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get initial tab from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const initialTab = urlParams.get('tab') || 'overview';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Data states
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingReports: 0,
    pendingPayments: 0,
    approvedThisMonth: 0
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Processing states
  const [processingReports, setProcessingReports] = useState<Set<string>>(new Set());
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && profile?.role === 'manager') {
      fetchDashboardData();
    }
  }, [user, profile]);

  // Handle tab changes and update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newUrl = `/dashboard/manager?tab=${newTab}`;
    navigate(newUrl, { replace: true });
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data in parallel
      const [usersRes, reportsRes, paymentsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (usersRes.error) {
        console.error('Users fetch error:', usersRes.error);
        throw new Error(`Failed to fetch users: ${usersRes.error.message}`);
      }
      if (reportsRes.error) {
        console.error('Reports fetch error:', reportsRes.error);
        throw new Error(`Failed to fetch reports: ${reportsRes.error.message}`);
      }
      if (paymentsRes.error) {
        console.error('Payments fetch error:', paymentsRes.error);
        throw new Error(`Failed to fetch payments: ${paymentsRes.error.message}`);
      }

      const usersData = usersRes.data || [];
      const reportsData = reportsRes.data || [];
      const paymentsData = paymentsRes.data || [];

      // Enhance reports with user profiles
      const enhancedReports = await Promise.all(
        reportsData.map(async (report) => {
          const user = usersData.find(u => u.user_id === report.user_id);
          return {
            ...report,
            profiles: user ? {
              full_name: user.full_name,
              email: user.email
            } : null
          };
        })
      );

      // Enhance payments with user profiles and report titles
      const enhancedPayments = await Promise.all(
        paymentsData.map(async (payment) => {
          const user = usersData.find(u => u.user_id === payment.user_id);
          const report = reportsData.find(r => r.id === payment.report_id);
          return {
            ...payment,
            profiles: user ? {
              full_name: user.full_name,
              email: user.email
            } : null,
            reports: report ? {
              title: report.title
            } : null
          };
        })
      );

      setReports(enhancedReports);
      setPayments(enhancedPayments);

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const approvedThisMonth = enhancedReports.filter(report => {
        const reportDate = new Date(report.created_at);
        return report.status === 'approved' && 
               reportDate.getMonth() === currentMonth && 
               reportDate.getFullYear() === currentYear;
      }).length;

      setStats({
        totalUsers: usersData.length,
        pendingReports: enhancedReports.filter(r => r.status === 'pending').length,
        pendingPayments: enhancedPayments.filter(p => p.status === 'pending').length,
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

  const handleReportAction = async (reportId: string, action: 'approved' | 'rejected', notes?: string) => {
    setProcessingReports(prev => new Set(prev).add(reportId));
    
    try {
      const updateData: any = { status: action };
      if (notes && action === 'rejected') {
        updateData.manager_notes = notes;
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: `Report ${action}`,
        description: `Report has been ${action} successfully.`,
        variant: action === 'approved' ? 'default' : 'destructive'
      });

      // Refresh data
      fetchDashboardData();
    } catch (error: any) {
      console.error('Report action error:', error);
      toast({
        title: "Action failed",
        description: error.message || `Failed to ${action} report`,
        variant: "destructive"
      });
    } finally {
      setProcessingReports(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  };

  const handlePaymentAction = async (paymentId: string, action: 'approved' | 'rejected', notes?: string) => {
    setProcessingPayments(prev => new Set(prev).add(paymentId));
    
    try {
      const updateData: any = { status: action };
      if (notes && action === 'rejected') {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: `Payment ${action}`,
        description: `Payment has been ${action} successfully.`,
        variant: action === 'approved' ? 'default' : 'destructive'
      });

      // Refresh data
      fetchDashboardData();
    } catch (error: any) {
      console.error('Payment action error:', error);
      toast({
        title: "Action failed",
        description: error.message || `Failed to ${action} payment`,
        variant: "destructive"
      });
    } finally {
      setProcessingPayments(prev => {
        const next = new Set(prev);
        next.delete(paymentId);
        return next;
      });
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('report-attachments')
        .createSignedUrl(filePath, 60);

      if (error) throw error;

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const viewProof = async (proofPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(proofPath, 60);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: "View failed",
        description: "Failed to view proof",
        variant: "destructive"
      });
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
          <h1 className="text-3xl font-bold gradient-text">Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, review reports, and approve payments
          </p>
        </motion.div>

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
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
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

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-fit">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payments
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
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
                  </div>
                </GlassCard>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Reports Management</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-500">
                      {stats.pendingReports} Pending
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{report.title}</p>
                              <p className="text-sm text-muted-foreground">{report.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>{report.profiles?.full_name}</TableCell>
                          <TableCell>₹{report.amount?.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(report.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={report.status === 'approved' ? 'default' : 
                                      report.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {report.attachment_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadFile(report.attachment_url, 'report.pdf')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {report.status === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReportAction(report.id, 'approved')}
                                    disabled={processingReports.has(report.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReportAction(report.id, 'rejected')}
                                    disabled={processingReports.has(report.id)}
                                  >
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </GlassCard>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Payments Management</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
                      {stats.pendingPayments} Pending
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Proof</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">Payment #{payment.id.slice(0, 8)}</p>
                              <p className="text-sm text-muted-foreground">{payment.reports?.title}</p>
                            </div>
                          </TableCell>
                          <TableCell>{payment.profiles?.full_name}</TableCell>
                          <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                          <TableCell className="capitalize">{payment.method}</TableCell>
                          <TableCell>{format(new Date(payment.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            {payment.proof_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewProof(payment.proof_url)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={payment.status === 'approved' ? 'default' : 
                                      payment.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePaymentAction(payment.id, 'approved')}
                                  disabled={processingPayments.has(payment.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePaymentAction(payment.id, 'rejected')}
                                  disabled={processingPayments.has(payment.id)}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  );
}