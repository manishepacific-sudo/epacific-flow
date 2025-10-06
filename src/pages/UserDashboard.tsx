import { useState, useEffect } from "react";
import { motion } from "framer-motion";
<<<<<<< HEAD
import { 
  FileText, 
  CreditCard, 
  Camera, 
=======
import {
  FileText,
  CreditCard,
  Camera,
>>>>>>> feature/settings-management
  DollarSign,
  Clock,
  CheckCircle,
  Upload,
<<<<<<< HEAD
  Calendar
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
=======
  Calendar,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
>>>>>>> feature/settings-management
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
<<<<<<< HEAD
=======
import { useIsMobile } from "@/hooks/use-mobile";

interface Report {
  id: string;
  user_id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Payment {
  id: string;
  user_id: string;
  report_id: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Attendance {
  id: string;
  user_id: string;
  attendance_date: string;
  status: 'pending' | 'approved' | 'rejected';
  photo_url?: string;
}
>>>>>>> feature/settings-management

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
<<<<<<< HEAD
  const [reports, setReports] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();

      // Set up real-time subscriptions for reports and payments
      const reportsChannel = supabase
        .channel('user-reports')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUserData(); // Refresh data when reports change
          }
        )
        .subscribe();

      const paymentsChannel = supabase
        .channel('user-payments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUserData(); // Refresh data when payments change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(reportsChannel);
        supabase.removeChannel(paymentsChannel);
      };
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const [reportsRes, paymentsRes] = await Promise.all([
        supabase
          .from('reports')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
      ]);

      if (reportsRes.error) throw reportsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setReports(reportsRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
=======

  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const [reportsRes, paymentsRes, attendanceRes] = await Promise.all([
          supabase
            .from('reports')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .order('attendance_date', { ascending: false })
        ]);

        if (reportsRes.error) throw reportsRes.error;
        if (paymentsRes.error) throw paymentsRes.error;
        if (attendanceRes.error) throw attendanceRes.error;

        setReports(reportsRes.data || []);
        setPayments(paymentsRes.data || []);
        setAttendance(attendanceRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error loading data",
          description: "Failed to load dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    const reportsChannel = supabase
      .channel('user-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${user.id}`,
        },
        fetchUserData
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel('user-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${user.id}`,
        },
        fetchUserData
      )
      .subscribe();

    const attendanceChannel = supabase
      .channel('user-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `user_id=eq.${user.id}`,
        },
        fetchUserData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [user, toast]);
>>>>>>> feature/settings-management

  const quickActions = [
    {
      icon: Upload,
      title: "Upload Report",
      description: "Submit your monthly report",
      action: () => navigate("/upload/report"),
      color: "bg-primary",
    },
    {
      icon: Camera,
      title: "Mark Attendance",
      description: "Upload today's attendance photo",
      action: () => navigate("/attendance"),
      color: "bg-secondary",
    },
    {
      icon: CreditCard,
      title: "Payments",
      description: "Manage payments and view history",
      action: () => navigate("/payments"),
      color: "bg-warning",
    },
  ];

  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const approvedReports = reports.filter(r => r.status === 'approved').length;
  const approvedReportsWithoutPayment = reports.filter(r => 
    r.status === 'approved' && !payments.some(p => p.report_id === r.id && p.status === 'approved')
  ).length;
  const totalPendingAmount = approvedReportsWithoutPayment * 25000;
<<<<<<< HEAD
=======

  // Calculate monthly attendance metrics
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthlyAttendance = attendance.filter(a => {
    const attendanceDate = new Date(a.attendance_date);
    return attendanceDate.getMonth() === currentMonth && 
           attendanceDate.getFullYear() === currentYear &&
           a.status === 'approved';
  });

  const monthlyAttendanceCount = monthlyAttendance.length;
  const totalWorkingDays = 22; // Assuming 22 working days per month
  const attendancePercentage = totalWorkingDays > 0 
    ? Math.round((monthlyAttendanceCount / totalWorkingDays) * 100) 
    : 0;
>>>>>>> feature/settings-management
  
  const dashboardCards = [
    {
      title: "Total Reports",
      value: reports.length,
      icon: FileText,
      trend: `${approvedReports} approved`,
      color: "text-primary",
    },
    {
      title: "Pending Amount",
      value: `₹${totalPendingAmount.toLocaleString()}`,
      icon: DollarSign,
      trend: `${approvedReportsWithoutPayment} reports awaiting payment`,
      color: "text-warning",
    },
    {
      title: "Monthly Attendance",
<<<<<<< HEAD
      value: 0, // Placeholder for now
      icon: Calendar,
      trend: "0% this month",
=======
      value: monthlyAttendanceCount,
      icon: Calendar,
      trend: `${attendancePercentage}% this month`,
>>>>>>> feature/settings-management
      color: "text-secondary",
    },
    {
      title: "Pending Reviews",
      value: pendingPayments,
      icon: Clock,
      trend: "Awaiting manager approval",
      color: "text-secondary",
    }
    
    
  ];

<<<<<<< HEAD
  return (
    <Layout role="user">
      <div className="space-y-8 max-w-7xl mx-auto">
=======
  const isMobile = useIsMobile();

  return (
    <Layout role={profile?.role}>
      <div className={cn("space-y-8 max-w-7xl mx-auto", isMobile && "pb-20")}>
>>>>>>> feature/settings-management
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Good morning, {profile?.full_name || 'User'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your account today.
          </p>
        </motion.div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div
<<<<<<< HEAD
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="hover-glow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-2xl font-bold mb-1">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.trend}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-accent ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </GlassCard>
=======
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
                  </div>
                  <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{card.trend}</p>
              </div>
>>>>>>> feature/settings-management
            </motion.div>
          ))}
        </div>

<<<<<<< HEAD
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <GlassCard 
                  className="hover-glow cursor-pointer text-center p-6 transition-all duration-300"
                  onClick={action.action}
                >
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Reports</h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/upload/report")}>
                    View All
                </Button>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No reports submitted yet
                  </div>
                ) : (
                  reports.slice(0, 3).map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={report.status === 'approved' ? 'default' : 'secondary'}
                          className={`text-xs ${report.status === 'approved' ? 'bg-success' : ''}`}
                        >
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent Payments */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Payment Status</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/payments")}>
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No payments submitted yet
                  </div>
                ) : (
                  payments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-warning" />
                        <div>
                          <p className="font-medium text-sm capitalize">{payment.method} Payment</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">₹{payment.amount.toLocaleString()}</span>
                        <Badge 
                          variant={payment.status === 'approved' ? 'default' : 'secondary'}
                          className={`text-xs ${payment.status === 'approved' ? 'bg-success' : ''}`}
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Attendance Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Monthly Attendance Progress</h3>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">
                  0/20 days
                </span>
              </div>
            </div>
            <Progress 
              value={0} 
              className="h-3 mb-2"
            />
            <p className="text-sm text-muted-foreground">
              No attendance records yet
            </p>
          </GlassCard>
        </motion.div>
=======
        {/* Reports and Payments Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Reports Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Recent Reports</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="py-8 border border-dashed rounded-lg">
                  <div className="flex flex-col items-center justify-center text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No reports yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isMobile ? (
                    <div className="grid grid-cols-1 gap-4">
                      {reports.slice(0, 3).map((report) => (
                        <motion.div
                          key={report.id}
                          className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary/80" />
                                <p className="font-semibold truncate">{report.title}</p>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={report.status === 'approved' ? 'default' : report.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {report.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reports.slice(0, 5).map((report) => (
                        <div
                          key={report.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary/80 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{report.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <Badge variant={report.status === 'approved' ? 'default' : report.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {report.status}
                            </Badge>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Recent Payments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="py-8 border border-dashed rounded-lg">
                  <div className="flex flex-col items-center justify-center text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No payments yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isMobile ? (
                    <div className="grid grid-cols-1 gap-4">
                      {payments.slice(0, 3).map((payment) => (
                        <motion.div
                          key={payment.id}
                          className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary/80" />
                                <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={payment.status === 'approved' ? 'default' : payment.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {payment.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payments.slice(0, 5).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-primary/80 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <Badge variant={payment.status === 'approved' ? 'default' : payment.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {payment.status}
                            </Badge>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              onClick={action.action}
              className="relative p-6 rounded-xl border bg-white dark:bg-gray-800 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-4">
                <div className={`${action.color} p-3 rounded-lg bg-opacity-10`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Attendance Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Monthly Attendance Progress</CardTitle>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">
                {monthlyAttendanceCount}/{totalWorkingDays} days
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress 
              value={attendancePercentage} 
              className="h-3 mb-2"
            />
            <p className="text-sm text-muted-foreground">
              {monthlyAttendanceCount > 0 
                ? `You've marked attendance for ${monthlyAttendanceCount} days this month`
                : "No attendance records for this month yet"}
            </p>
          </CardContent>
        </Card>
>>>>>>> feature/settings-management
      </div>
    </Layout>
  );
}