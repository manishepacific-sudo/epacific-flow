import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  CreditCard, 
  Camera,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ManagerDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchManagerData();
    }
  }, [user]);

  const fetchManagerData = async () => {
    try {
      const [reportsRes, paymentsRes] = await Promise.all([
        supabase
          .from('reports')
          .select(`
            *,
            profiles!inner(full_name, email)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select(`
            *,
            profiles!inner(full_name, email)
          `)
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

  const pendingReports = reports.filter(r => r.status === 'pending');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  const dashboardCards = [
    {
      title: "Pending Reports",
      value: pendingReports.length,
      icon: FileText,
      trend: "Awaiting review",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Payments",
      value: pendingPayments.length,
      icon: CreditCard,
      trend: "Need approval",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pending Attendance",
      value: 0,
      icon: Camera,
      trend: "To be verified",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Team Members",
      value: reports.length > 0 ? new Set(reports.map(r => r.user_id)).size : 0,
      icon: Users,
      trend: "Active users",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const handleApprove = async (type: string, id: string) => {
    try {
      const table = type === 'report' ? 'reports' : 'payments';
      const { error } = await supabase
        .from(table)
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Approved successfully",
        description: `${type} has been approved`,
      });
      
      fetchManagerData();
    } catch (error) {
      console.error('Error approving:', error);
      toast({
        title: "Approval failed",
        description: "Failed to approve item",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (type: string, id: string) => {
    try {
      const table = type === 'report' ? 'reports' : 'payments';
      const { error } = await supabase
        .from(table)
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Rejected successfully",
        description: `${type} has been rejected`,
      });
      
      fetchManagerData();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast({
        title: "Rejection failed",
        description: "Failed to reject item",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout role="manager">
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            Manager Dashboard 👨‍💼
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Review and approve pending reports, payments, and attendance records.
          </p>
        </motion.div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="hover-glow p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{card.title}</p>
                    <p className="text-lg sm:text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{card.trend}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-xl ${card.bgColor} flex-shrink-0`}>
                    <card.icon className={`h-4 w-4 sm:h-6 sm:w-6 ${card.color}`} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Approval Queue */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8">
          {/* Pending Reports */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Pending Reports</h3>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {pendingReports.length}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : pendingReports.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No pending reports
                  </div>
                ) : (
                  pendingReports.map((report) => (
                    <div key={report.id} className="p-4 glass-button rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            By {report.profiles?.full_name} • {new Date(report.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {report.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-warning/20 text-warning">
                          Pending
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="success" 
                          className="flex-1"
                          onClick={() => handleApprove('report', report.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleReject('report', report.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Pending Payments */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-warning" />
                  <h3 className="text-lg font-semibold">Pending Payments</h3>
                </div>
                <Badge variant="secondary" className="bg-warning/20 text-warning">
                  {pendingPayments.length}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : pendingPayments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No pending payments
                  </div>
                ) : (
                  pendingPayments.map((payment) => (
                    <div key={payment.id} className="p-4 glass-button rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm capitalize">{payment.method} Payment</p>
                          <p className="text-xs text-muted-foreground">
                            By {payment.profiles?.full_name} • {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm font-medium text-warning mt-1">
                            ₹{payment.amount.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-warning/20 text-warning">
                          Pending
                        </Badge>
                      </div>
                      
                      {payment.proof_url && (
                        <div className="mb-3">
                          <Button variant="outline" size="sm" className="text-xs">
                            View Proof
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="success" 
                          className="flex-1"
                          onClick={() => handleApprove('payment', payment.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleReject('payment', payment.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Pending Attendance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-semibold">Pending Attendance</h3>
              </div>
              <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                0
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center py-8 text-muted-foreground col-span-full">
                <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pending attendance records</p>
                <p className="text-sm mt-1">Attendance feature coming soon</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Priority Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="text-lg font-semibold">Priority Alerts</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 glass-button rounded-lg border border-warning/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm">3 reports pending for more than 24 hours</span>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 glass-button rounded-lg border border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">All attendance records up to date</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}