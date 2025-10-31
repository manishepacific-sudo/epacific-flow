import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Download, Check, X, User, CreditCard, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@/components/AuthProvider";
import { notifyPaymentApproved, notifyPaymentRejected } from "@/utils/notifications";

type Status = 'pending' | 'approved' | 'rejected';

interface PaymentWithProfile {
  id: string;
  amount: number;
  method: string;
  phonepe_transaction_id?: string | null;
  status: Status;
  proof_url?: string | null;
  created_at: string;
  updated_at: string;
  admin_notes?: string | null;
  rejection_message?: string | null;
  user_id: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
    mobile_number?: string | null;
    registrar?: string | null;
  } | null;
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canModerate = profile?.role === 'admin' || profile?.role === 'manager';

  const [payment, setPayment] = useState<PaymentWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      console.error('No payment ID provided');
      navigate('/dashboard/user');
      return;
    }
    
    const fetchPayment = async () => {
      try {
        setLoading(true);
        console.log('Fetching payment with ID:', id);
        
        const { data, error } = await supabase
          .from('payments')
          .select(`*, profiles:user_id(full_name,email,mobile_number,registrar)`) 
          .eq('id', id)
          .single();
          
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Payment data loaded:', data);
        setPayment(data as unknown as PaymentWithProfile);
      } catch (error) {
        console.error('Error loading payment', error);
        toast({ 
          title: 'Error', 
          description: `Failed to load payment: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          variant: 'destructive' 
        });
        navigate('/dashboard/user');
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [id, navigate, toast]);

  const statusBadge = useMemo(() => {
    if (!payment) return null;
    switch (payment.status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-warning/20 text-warning">Pending</Badge>;
    }
  }, [payment]);

  const viewProof = async () => {
    if (!payment?.proof_url) return;
    try {
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(payment.proof_url, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      toast({ title: 'View failed', description: 'Unable to open proof file', variant: 'destructive' });
    }
  };

  const downloadProof = async () => {
    if (!payment?.proof_url) return;
    try {
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(payment.proof_url, 300);
      if (error) throw error;
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = `payment-proof-${payment.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast({ title: 'Download failed', description: 'Unable to download proof', variant: 'destructive' });
    }
  };

  const setStatus = async (next: Status, reason?: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();

      const updatePayload = {
        status: next,
        updated_at: now,
        rejection_message: next === 'rejected' ? (reason || '') : null,
        admin_notes: next === 'approved' ? null : undefined,
      };

      const { error } = await supabase.from('payments').update(updatePayload).eq('id', id);
      if (error) throw error;

      try {
        if (payment) {
          if (next === 'approved') {
            await notifyPaymentApproved(payment.user_id, payment.amount, `/payment/user/${payment.id}`);
          } else if (next === 'rejected') {
            await notifyPaymentRejected(payment.user_id, payment.amount, reason || '', `/payment/user/${payment.id}`);
          }
        }
      } catch {}

      const { data } = await supabase
        .from('payments')
        .select(`*, profiles:user_id(full_name,email,mobile_number,registrar)`) 
        .eq('id', id)
        .single();
      setPayment(data as any);

      toast({ title: `Payment ${next}`, description: `Payment has been ${next}.` });
    } catch (error) {
      console.error('Status update error:', error);
      toast({ title: 'Action failed', description: 'Unable to update status', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setRejectOpen(false);
      setRejectionReason('');
    }
  };

  return (
    <Layout role={(profile?.role as 'admin' | 'manager') || 'admin'}>
      <div className="space-y-6">
        {loading || !payment ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
            <div className="space-y-4 lg:space-y-6 xl:col-span-2">
              <GlassCard className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Payment Details</h2>
                    <div className="text-sm text-muted-foreground">ID: {payment.id.slice(0,8)}...</div>
                  </div>
                  {statusBadge}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-accent/50">
                    <div className="text-sm text-muted-foreground">Amount</div>
                    <div className="text-2xl font-bold">₹{payment.amount?.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50">
                    <div className="text-sm text-muted-foreground">Method</div>
                    <div className="flex items-center gap-2 font-medium capitalize"><CreditCard className="h-4 w-4" />{payment.method}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50">
                    <div className="text-sm text-muted-foreground">Transaction ID</div>
                    <div className="font-mono text-sm break-all">{payment.phonepe_transaction_id || '-'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50">
                    <div className="text-sm text-muted-foreground">Submitted</div>
                    <div className="font-medium">{format(new Date(payment.created_at), 'PPP')}</div>
                  </div>
                </div>

                {payment.rejection_message && (
                  <div className="mt-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
                    <div className="text-xs text-destructive font-medium mb-1 flex items-center gap-1"><ShieldAlert className="h-4 w-4"/> Rejection Reason</div>
                    <div className="text-sm text-destructive">{payment.rejection_message}</div>
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4">User Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                  <div className="flex items-center gap-2"><User className="h-4 w-4"/><span className="text-muted-foreground">Name:</span><span className="font-medium">{payment.profiles?.full_name || 'Unknown'}</span></div>
                  <div className="flex items-center gap-2"><span className="text-muted-foreground">Email:</span><span className="font-medium break-all">{payment.profiles?.email || '-'}</span></div>
                  <div className="flex items-center gap-2"><span className="text-muted-foreground">Mobile:</span><span className="font-medium">{payment.profiles?.mobile_number || '-'}</span></div>
                  {payment.profiles?.registrar && (
                    <div className="flex items-center gap-2 col-span-2">
                      <span className="text-muted-foreground">Registrar:</span>
                      <span className="font-semibold text-primary">{payment.profiles.registrar}</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>

            <div className="space-y-6">
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Proof</h3>
                {payment.proof_url ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">File Name</div>
                      <div className="p-3 rounded-lg bg-accent/50 text-sm font-medium break-all">
                        {payment.proof_url.split('/').pop() || 'payment-proof'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={viewProof}>
                        <Eye className="h-4 w-4 mr-2"/>View
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={downloadProof}>
                        <Download className="h-4 w-4 mr-2"/>Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No proof uploaded</div>
                )}
              </GlassCard>

              {canModerate && payment.status === 'pending' && (
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Actions</h3>
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full bg-success hover:bg-success/90"
                      disabled={actionLoading}
                      onClick={() => setStatus('approved')}
                    >
                      <Check className="h-4 w-4 mr-2"/> Approve Payment
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={actionLoading}
                      onClick={() => setRejectOpen(true)}
                    >
                      <X className="h-4 w-4 mr-2"/> Reject Payment
                    </Button>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        )}

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea id="reject-reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="destructive" disabled={!rejectionReason.trim() || actionLoading} onClick={() => setStatus('rejected', rejectionReason)}>Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}


