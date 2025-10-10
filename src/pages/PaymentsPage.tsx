import { useState, useEffect, useCallback } from "react";
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
import { Upload, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { downloadFileFromStorage } from '@/utils/fileDownload';

interface PaymentRecord {
  id: string;
  report_id: string;
  amount: number;
  method: string;
  status: string;
  proof_url?: string;
  created_at: string;
  rejection_message?: string;
  report?: {
    title: string;
    description: string;
  };
}

// Note: pendingReports logic removed per recent refactor. Kept type for reference if needed later.

export default function PaymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // pendingPayments holds payment records with status 'pending' or 'rejected'
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const fetchPaymentsData = useCallback(async () => {
    // Fetch payments for the current user and populate states
    try {
      setLoading(true);
      // Fetch all payments for this user, include joined report data as `report`
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          report:report_id (
            title,
            description
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Filter pending/rejected payments for the Pending tab
      const pending = (paymentsData || []).filter((p: PaymentRecord) => p.status === 'pending' || p.status === 'rejected');

      setPendingPayments(pending as PaymentRecord[]);
      setRecentPayments(paymentsData || []);
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error fetching payments data:', error);
      toast({
        title: "Error loading data",
        description: message || "Failed to load payments information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

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
  }, [user, fetchPaymentsData]);

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error loading proof:', error);
      toast({
        title: "Error",
        description: message || "Failed to load payment proof. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadProof = async (proofUrl: string, reportTitle?: string) => {
    try {
      await downloadFileFromStorage('payment-proofs', proofUrl, reportTitle || undefined);
      toast({
        title: "Success",
        description: "Payment proof downloaded successfully",
      });
    } catch (error: unknown) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: (error as Error).message || 'Failed to download payment proof',
        variant: "destructive"
      });
    }
  };

  const handleResubmitProof = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setResubmitDialogOpen(true);
  };

  const handleProofFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPayment) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload JPG, PNG, WEBP, or PDF', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 5MB', variant: 'destructive' });
      return;
    }

    setUploadingProof(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${selectedPayment.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // Call edge function to update payment proof
      const fnResponse = await supabase.functions.invoke('resubmit-payment-proof', {
        body: { paymentId: selectedPayment.id, proofUrl: fileName }
      });

      // supabase.functions.invoke may return an object with an 'error' property
      const maybeError = (fnResponse as unknown) as { error?: unknown };
      if (maybeError?.error) throw maybeError.error;

      toast({ title: 'Success', description: 'Payment proof resubmitted successfully' });
      setResubmitDialogOpen(false);
      setSelectedPayment(null);
      await fetchPaymentsData();
    } catch (error: unknown) {
      console.error('Error resubmitting proof:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Error', description: message || 'Failed to resubmit payment proof', variant: 'destructive' });
    } finally {
      setUploadingProof(false);
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

  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
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
        {/* Resubmit Dialog */}
        <Dialog open={resubmitDialogOpen} onOpenChange={setResubmitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resubmit Payment Proof</DialogTitle>
              <DialogDescription>Upload a new payment proof document. The payment will be reviewed again by a manager.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {selectedPayment && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Amount</div>
                      <div className="text-lg font-bold">₹{selectedPayment.amount.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Report</div>
                      <div className="font-medium">{selectedPayment.report?.title || 'Report'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label>Upload New Proof</Label>
                <Input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" onChange={handleProofFileUpload} disabled={uploadingProof} />
                <p className="text-xs text-muted-foreground mt-1">Accepted formats: JPG, PNG, WEBP, PDF (max 5MB)</p>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { setResubmitDialogOpen(false); setSelectedPayment(null); }} disabled={uploadingProof}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                Pending Payments ({pendingPayments.length})
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
                    <h2 className="text-xl font-semibold">Pending Payments</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchPaymentsData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {pendingPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-success" />
                    <h3 className="text-lg font-semibold mb-2">No Pending Payments</h3>
                    <p className="text-muted-foreground">
                      You have no pending or rejected payment submissions.
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
                    {pendingPayments.map((payment, index) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <GlassCard className={`hover-glow p-4 ${payment.status === 'rejected' ? 'border border-destructive/50 bg-destructive/5' : ''}`}>
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold truncate">{payment.report?.title || 'Report'}</h3>
                                <p className="text-sm text-muted-foreground truncate">{payment.report?.description}</p>
                              </div>
                              <div>{getMethodBadge(payment.method)}</div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Submitted</p>
                                <p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                              </div>

                              <div className="text-right">
                                <p className="text-lg font-bold">₹{payment.amount.toLocaleString()}</p>
                                {getStatusBadge(payment.status)}
                              </div>
                            </div>

                            {payment.status === 'rejected' && payment.rejection_message && (
                              <div className="flex items-start gap-2 text-destructive text-sm">
                                <AlertTriangle className="h-4 w-4" />
                                <div>{payment.rejection_message}</div>
                              </div>
                            )}

                            <div className="flex gap-2">
                              {payment.proof_url && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleViewProof(payment.proof_url!)} aria-label={`View proof for ${payment.report?.title || payment.id}`} title={`View proof for ${payment.report?.title || payment.id}`}>
                                    <Eye className="h-4 w-4" />
                                    <span className="hidden sm:inline ml-2">View</span>
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDownloadProof(payment.proof_url!, payment.report?.title)} aria-label={`Download proof for ${payment.report?.title || payment.id}`} title={`Download proof for ${payment.report?.title || payment.id}`}>
                                    <Download className="h-4 w-4" />
                                    <span className="hidden sm:inline ml-2">Download</span>
                                  </Button>
                                </>
                              )}

                              {payment.status === 'rejected' && (
                                <Button variant="hero" size="sm" onClick={() => handleResubmitProof(payment)}>
                                  Resubmit Proof
                                </Button>
                              )}
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
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewProof(payment.proof_url!)}
                                      aria-label={`View proof for ${payment.report?.title || payment.id}`}
                                      title={`View proof for ${payment.report?.title || payment.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="hidden sm:inline ml-2">View</span>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadProof(payment.proof_url!, payment.report?.title)}
                                      aria-label={`Download proof for ${payment.report?.title || payment.id}`}
                                      title={`Download proof for ${payment.report?.title || payment.id}`}
                                    >
                                      <Download className="h-4 w-4" />
                                      <span className="hidden sm:inline ml-2">Download</span>
                                    </Button>
                                  </>
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