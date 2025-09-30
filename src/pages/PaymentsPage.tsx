import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Clock, 
  ArrowRight,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  DollarSign,
  AlertTriangle,
  Download,
  RefreshCw
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PaymentRecord {
  id: string;
  report_id: string;
  amount: number;
  method: string;
  status: string;
  proof_url?: string;
  created_at: string;
  report?: {
    title: string;
    description: string;
  };
}

interface PendingReport {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  hasPayment: boolean;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    if (user) {
      fetchPaymentsData();
      
      // Set up real-time subscription for payment updates
      const channel = supabase
        .channel('payment-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchPaymentsData(); // Refresh data when payments change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchPaymentsData = async () => {
    try {
      setLoading(true);
      
      // Fetch approved reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch all payments for this user
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          reports:report_id (
            title,
            description
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Process pending reports (approved reports without completed payments)
      const pendingReportsWithPaymentStatus = await Promise.all(
        (reportsData || []).map(async (report) => {
          const hasCompletedPayment = (paymentsData || []).some(
            payment => payment.report_id === report.id && payment.status === 'approved'
          );
          
          return {
            ...report,
            hasPayment: hasCompletedPayment
          } as PendingReport;
        })
      );

      // Filter to get reports that need payment
      const pending = pendingReportsWithPaymentStatus.filter(report => !report.hasPayment);
      
      setPendingReports(pending);
      setRecentPayments(paymentsData || []);
      
    } catch (error) {
      console.error('Error fetching payments data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load payments information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = (reportId: string) => {
    navigate(`/payment/${reportId}`);
  };

  const handleRetryPayment = (reportId: string) => {
    navigate(`/payment/${reportId}`);
  };

  const handleViewProof = async (proofUrl: string) => {
    try {
      // Handle both full URLs and storage paths
      if (proofUrl.startsWith('http')) {
        window.open(proofUrl, '_blank');
        return;
      }
      
      const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(proofUrl, 300);
      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error loading proof:', error);
      toast({
        title: "Error",
        description: "Failed to load payment proof. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-white">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/20 text-warning">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'razorpay':
        return <Badge className="bg-blue-500 text-white">Razorpay</Badge>;
      case 'offline':
        return <Badge className="bg-gray-500 text-white">Bank Transfer</Badge>;
      case 'phonepe':
        return <Badge className="bg-purple-500 text-white">PhonePe</Badge>;
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  const totalPendingAmount = pendingReports.reduce((sum, report) => sum + (report.amount || 25000), 0);
  const totalPaidAmount = recentPayments
    .filter(payment => payment.status === 'approved')
    .reduce((sum, payment) => sum + payment.amount, 0);

  if (loading) {
    return (
      <Layout role="user">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading payments...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="user">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            Payments Dashboard 💳
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your payments and view transaction history
          </p>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/20 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-xl font-bold text-warning">₹{totalPendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-success">₹{totalPaidAmount.toLocaleString()}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-xl font-bold">{recentPayments.length}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Tabs for Pending and History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Payments ({pendingReports.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Payment History ({recentPayments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <h2 className="text-xl font-semibold">Reports Awaiting Payment</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchPaymentsData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {pendingReports.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-success" />
                    <h3 className="text-lg font-semibold mb-2">No Pending Payments</h3>
                    <p className="text-muted-foreground">
                      All your approved reports have been paid for.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/dashboard/user')}
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingReports.map((report, index) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <GlassCard className="hover-glow p-4">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold truncate">{report.title}</h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {report.description}
                                </p>
                              </div>
                              <Badge variant="default" className="bg-success text-white ml-2">
                                Approved
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Submitted:</span>
                                <span>{new Date(report.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="p-3 bg-warning/10 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Payment Due:</span>
                                <span className="text-lg font-bold text-warning">
                                  ₹{(report.amount || 25000).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Button 
                                variant="hero" 
                                className="w-full"
                                onClick={() => handlePayNow(report.id)}
                              >
                                Pay Now
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => {
                                  toast({
                                    title: "Report Details",
                                    description: `Title: ${report.title}\nDescription: ${report.description}`,
                                  });
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Payment History</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchPaymentsData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {recentPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
                    <p className="text-muted-foreground">
                      Your payment transactions will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentPayments.map((payment, index) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <GlassCard className="hover-glow p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-primary/20 rounded-lg">
                                <CreditCard className="h-5 w-5 text-primary" />
                              </div>
                              
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold">Report ID: {payment.report_id.slice(0, 8)}...</p>
                                  {getMethodBadge(payment.method)}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {payment.report?.title || 'Report'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(payment.created_at).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg font-bold">₹{payment.amount.toLocaleString()}</p>
                                {getStatusBadge(payment.status)}
                              </div>
                              
                              <div className="flex gap-2">
                                {payment.proof_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewProof(payment.proof_url!)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {payment.status === 'rejected' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRetryPayment(payment.report_id)}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  );
}