import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  CreditCard, 
  Camera, 
  DollarSign,
  Clock,
  CheckCircle,
  Upload,
  Calendar
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
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
      value: 0, // Placeholder for now
      icon: Calendar,
      trend: "0% this month",
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

  return (
    <Layout role="user">
      <div className="space-y-8 max-w-7xl mx-auto">
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
            </motion.div>
          ))}
        </div>

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
      </div>
    </Layout>
  );
}