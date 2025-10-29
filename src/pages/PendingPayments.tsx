import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Clock, 
  ArrowRight,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PendingPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPendingReports();
    }
  }, [user]);

  const fetchPendingReports = async () => {
    try {
      // Get approved reports that don't have completed payments
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'approved');

      if (reportsError) throw reportsError;

      // For each report, check if there's a completed payment
      const reportsWithPaymentStatus = await Promise.all(
        (reportsData || []).map(async (report) => {
          const { data: payment } = await supabase
            .from('payments')
            .select('status')
            .eq('report_id', report.id)
            .eq('status', 'approved')
            .single();

          return {
            ...report,
            hasCompletedPayment: !!payment
          };
        })
      );

      // Filter to only show reports without completed payments
      const pending = reportsWithPaymentStatus.filter(report => !report.hasCompletedPayment);
      setPendingReports(pending);
    } catch (error) {
      console.error('Error fetching pending reports:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load pending payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = (reportId: string) => {
    navigate(`/payment/${reportId}`);
  };

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
            Pending Payments 💳
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Complete payments for your approved reports
          </p>
        </motion.div>

        {/* Pending Reports */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="h-5 w-5 text-warning" />
              <h2 className="text-xl font-semibold">Reports Awaiting Payment</h2>
              <Badge variant="secondary" className="bg-warning/20 text-warning">
                {pendingReports.length}
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading pending payments...</p>
              </div>
            ) : pendingReports.length === 0 ? (
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
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <GlassCard className="hover-glow p-4">
                      <div className="space-y-4">
                        {/* Report Header */}
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

                        {/* Report Details */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Submitted:</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="text-success font-medium">Ready for Payment</span>
                          </div>
                        </div>

                        {/* Payment Amount */}
                        <div className="p-3 bg-warning/10 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Payment Due:</span>
                            <span className="text-lg font-bold text-warning">₹25,000</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
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
                              // View report details
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
        </motion.div>

        {/* Payment Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Payment Instructions</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Before Making Payment:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Ensure your report has been approved by the manager</li>
                  <li>• Have your payment proof ready (screenshot/receipt)</li>
                  <li>• Note down the report ID for reference</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Payment Methods:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Bank transfer with proof upload (Available)</li>
                  <li>• PhonePe payment gateway (Coming Soon)</li>
                  <li>• Razorpay integration (Coming Soon)</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}