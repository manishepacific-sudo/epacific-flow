import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, CreditCard, Download, Eye, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@/components/AuthProvider";

type Status = 'pending' | 'approved' | 'rejected';

interface Payment {
  id: string;
  amount: number;
  method: string;
  phonepe_transaction_id?: string | null;
  status: Status;
  proof_url?: string | null;
  created_at: string;
  updated_at: string;
  rejection_message?: string | null;
  user_id: string;
  report_id: string;
}

export default function UserPaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/dashboard/user');
      return;
    }

    const fetchPayment = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (profile?.role === 'user' && data?.user_id && profile.user_id && data.user_id !== profile.user_id) {
          toast({ title: 'Access denied', description: 'You can only view your payments.', variant: 'destructive' });
          navigate('/dashboard/user');
          return;
        }
        setPayment(data as Payment);
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to load payment details', variant: 'destructive' });
        navigate('/dashboard/user');
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [id, profile?.role, profile?.user_id, navigate, toast]);

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
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
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
    } catch {
      toast({ title: 'Download failed', description: 'Unable to download proof', variant: 'destructive' });
    }
  };

  const handleRepay = () => {
    if (!payment) return;
    navigate(`/payment/${payment.report_id}`, {
      state: {
        repay: true,
        paymentId: payment.id,
        amount: payment.amount,
        method: payment.method,
      }
    });
  };

  return (
    <Layout role={(profile?.role as 'user') || 'user'}>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {statusBadge}
        </div>

        {loading || !payment ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <GlassCard className="p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Amount</div>
                  <div className="text-2xl font-bold">₹{payment.amount?.toLocaleString()}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Method</div>
                    <div className="flex items-center gap-2 font-medium capitalize"><CreditCard className="h-4 w-4" />{payment.method}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Submitted</div>
                    <div className="font-medium"><Calendar className="h-4 w-4 inline mr-2" />{format(new Date(payment.created_at), 'PPP')}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-sm text-muted-foreground">Transaction ID</div>
                    <div className="font-mono text-sm break-all">{payment.phonepe_transaction_id || '-'}</div>
                  </div>
                </div>

                {payment.rejection_message && (
                  <div className="mt-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
                    <div className="text-xs text-destructive font-medium mb-1 flex items-center gap-1"><ShieldAlert className="h-4 w-4"/> Rejection Reason</div>
                    <div className="text-sm text-destructive">{payment.rejection_message}</div>
                  </div>
                )}

                {payment.status === 'rejected' && (
                  <div className="pt-2">
                    <Button className="w-full" variant="default" onClick={handleRepay}>
                      Repay Now
                    </Button>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-4 sm:p-6">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Payment Proof</div>
                {payment.proof_url ? (
                  <>
                    <div className="p-3 rounded-lg bg-accent/50 text-sm font-medium break-all">
                      {payment.proof_url.split('/').pop() || 'payment-proof'}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="flex-1" onClick={viewProof}>
                        <Eye className="h-4 w-4 mr-2"/>View
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={downloadProof}>
                        <Download className="h-4 w-4 mr-2"/>Download
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No proof uploaded</div>
                )}
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </Layout>
  );
}


