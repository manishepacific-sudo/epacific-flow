import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  FileText,
  CreditCard,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Bell,
  Eye,
  Download,
  RefreshCw,
  MoreVertical,
  CheckCircle
} from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  // auth + toast
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // all hooks at top (important!)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingReports: 0,
    pendingPayments: 0,
    approvedThisMonth: 0
  });

  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [testingNotifications, setTestingNotifications] = useState(false);

  const isMobile = useIsMobile();

  // fetch dashboard data (useCallback so it can be safely used in deps)
  const fetchDashboardData = useCallback(async () => {
    if (!profile?.email) return;
    try {
      setLoading(true);
      setError(null);

      // Try edge functions first
      const [usersRes, reportsRes, paymentsRes] = await Promise.all([
        supabase.functions.invoke("get-users", { body: { admin_email: profile?.email } }),
        supabase.functions.invoke("get-reports", { body: { admin_email: profile?.email } }),
        supabase.functions.invoke("get-payments", { body: { admin_email: profile?.email } })
      ]);

      let usersData: any[] = [];
      let reportsData: Report[] = [];
      let paymentsData: Payment[] = [];

      // if any of the function calls returned an error, fallback to direct table queries
      if (usersRes?.error || reportsRes?.error || paymentsRes?.error) {
        const [fallbackUsersRes, fallbackReportsRes, fallbackPaymentsRes] = await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("reports").select("*, profiles(full_name)").order("created_at", { ascending: false }),
          supabase.from("payments").select("*, profiles(full_name)").order("created_at", { ascending: false })
        ]);

        usersData = (fallbackUsersRes as any).data || [];
        reportsData = ((fallbackReportsRes as any).data || []) as Report[];
        paymentsData = ((fallbackPaymentsRes as any).data || []) as Payment[];
      } else {
        // parse function responses (shape may differ depending on your function code)
        usersData = usersRes?.data?.users || [];
        reportsData = (reportsRes?.data?.reports || []) as Report[];
        paymentsData = (paymentsRes?.data?.payments || []) as Payment[];
      }

      // limit for display
      setReports(reportsData.slice(0, 5));
      setPayments(paymentsData.slice(0, 5));

      // compute approved this month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const approvedThisMonth = reportsData.filter((report: Report) => {
        const reportDate = new Date(report.created_at);
        return (
          report.status === "approved" &&
          reportDate.getMonth() === currentMonth &&
          reportDate.getFullYear() === currentYear
        );
      }).length;

      setStats({
        totalUsers: usersData.length,
        pendingReports: reportsData.filter((r: Report) => r.status === "pending").length,
        pendingPayments: paymentsData.filter((p: Payment) => p.status === "pending").length,
        approvedThisMonth
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to load dashboard data";
      console.error("Dashboard data fetch error:", err);
      setError(errMsg);
      toast({
        title: "Error loading data",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.email, toast]);

  useEffect(() => {
    if (user && profile?.role === "manager") {
      fetchDashboardData();
    }
  }, [user, profile?.role, fetchDashboardData]);

  const handleTestNotifications = async () => {
    setTestingNotifications(true);
    try {
      const { notifyReportApproved, notifyPaymentApproved } = await import("@/utils/notifications");
      const userId = "1c601c4f-056f-4328-b1ca-153c10abfb03";

      await notifyReportApproved(userId, "Monthly Report");
      await notifyPaymentApproved(userId, 1750);

      toast({
        title: "Test Notifications Created",
        description: "Test notifications have been created. Check the notification bell or switch to user view to see them."
      });
    } catch (err) {
      console.error("Error creating test notifications:", err);
      toast({
        title: "Error",
        description: "Failed to create test notifications: " + (err instanceof Error ? err.message : "Unknown error"),
        variant: "destructive"
      });
    } finally {
      setTestingNotifications(false);
    }
  };

  // Loading state
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

  // Error state
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

  // Stats cards
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
      <div className={cn("space-y-6", isMobile && "pb-20")}>
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
              {testingNotifications ? "Creating..." : "Test Notifications"}
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="elevated" className="p-6 hover:shadow-glow-blue">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className="text-3xl font-bold">{card.value}</p>
                        <p className="text-xs text-muted-foreground">{card.trend}</p>
                      </div>
                      <div className={`p-3 rounded-full ${card.bgColor}`}>
                        <Icon className={`h-6 w-6 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <Card variant="default" className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Reports</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={fetchDashboardData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <Card variant="default" className="py-8 border border-dashed">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No recent reports</p>
                  </CardContent>
                </Card>
              ) : isMobile ? (
                <div className="grid grid-cols-1 gap-4">
                  {reports.map((report) => (
                    <Card key={report.id} variant="interactive" size="sm" className="group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{report.title}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {report.profiles?.full_name} • {format(new Date(report.created_at), "MMM dd")}
                              </p>
                              <Badge
                                variant={report.status === "approved" ? "default" : report.status === "rejected" ? "destructive" : "secondary"}
                                className="mt-1"
                              >
                                {report.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <div className="flex items-center gap-2 w-full">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-3 w-3 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Download className="h-3 w-3 mr-2" />
                            Download
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-success">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Report</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg shrink-0">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium truncate">{report.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {report.profiles?.full_name || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={report.status === "approved" ? "default" : report.status === "rejected" ? "destructive" : "secondary"}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-success">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card variant="default" className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={fetchDashboardData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <Card variant="default" className="py-8 border border-dashed">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No recent payments</p>
                  </CardContent>
                </Card>
              ) : isMobile ? (
                <div className="grid grid-cols-1 gap-4">
                  {payments.map((payment) => (
                    <Card key={payment.id} variant="interactive" size="sm" className="group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-gradient-to-br from-success/20 to-success/5 rounded-xl shrink-0">
                              <CreditCard className="h-5 w-5 text-success" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">₹{payment.amount.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {payment.profiles?.full_name} • {format(new Date(payment.created_at), "MMM dd")}
                              </p>
                              <Badge
                                variant={payment.status === "approved" ? "default" : payment.status === "rejected" ? "destructive" : "secondary"}
                                className="mt-1"
                              >
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <div className="flex items-center gap-2 w-full">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-3 w-3 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Download className="h-3 w-3 mr-2" />
                            Download
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-success">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.profiles?.full_name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-success/20 to-success/5 rounded-lg shrink-0">
                              <CreditCard className="h-4 w-4 text-success" />
                            </div>
                            <span className="font-medium">₹{payment.amount.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={payment.status === "approved" ? "default" : payment.status === "rejected" ? "destructive" : "secondary"}
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-success">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
