import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  IndianRupee
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

export default function PaymentsManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const role = profile?.role as 'admin' | 'manager';
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Try edge function first
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('get-payments', {
        body: { admin_email: profile?.email }
      });

      let paymentsData;
      if (edgeError) {
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('payments')
          .select(`
            *,
            profiles(full_name, email),
            reports(title)
          `)
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        paymentsData = fallbackData || [];
      } else {
        paymentsData = edgeData?.payments || [];
      }

      setPayments(paymentsData);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error loading payments",
        description: error.message || "Failed to load payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

      fetchPayments();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/20 text-warning">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    approved: payments.filter(p => p.status === 'approved').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
  };

  return (
    <Layout role={role}>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold gradient-text">Payments Management</h1>
          <p className="text-muted-foreground">
            Review and approve payment submissions
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { title: "Total Payments", value: stats.total, icon: CreditCard, color: "text-blue-500" },
            { title: "Pending Review", value: stats.pending, icon: Clock, color: "text-orange-500" },
            { title: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-green-500" },
            { title: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-500" },
            { title: "Total Amount", value: `₹${stats.totalAmount.toLocaleString()}`, icon: IndianRupee, color: "text-purple-500" }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Payments Table */}
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">All Payments</h3>
              <Button variant="outline" onClick={fetchPayments} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Details</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">Payment #{payment.id.slice(-8)}</p>
                            {payment.phonepe_transaction_id && (
                              <p className="text-sm text-muted-foreground">
                                PhonePe: {payment.phonepe_transaction_id}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {payment.profiles?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {payment.profiles?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {payment.reports?.title || 'Unknown Report'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg">
                            ₹{payment.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {payment.method}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payment.status)}
                            {getStatusBadge(payment.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {payment.proof_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewProof(payment.proof_url)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {payment.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePaymentAction(payment.id, 'approved')}
                                  disabled={processingPayments.has(payment.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    const notes = prompt("Rejection reason (optional):");
                                    handlePaymentAction(payment.id, 'rejected', notes || undefined);
                                  }}
                                  disabled={processingPayments.has(payment.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
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
            )}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}