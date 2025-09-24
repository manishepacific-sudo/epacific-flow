import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Check, 
  X, 
  Download,
  Calendar,
  DollarSign,
  User,
  FileText
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  method: string;
  proof_url: string;
  phonepe_transaction_id?: string;
  status: string;
  created_at: string;
  user_id: string;
  report_id: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  reports?: {
    title: string;
    description: string;
  } | null;
}

export default function ManagerPaymentApproval() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          ),
          reports:report_id (
            title,
            description
          )
        `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data || []) as unknown as Payment[]);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error loading payments",
        description: "Failed to load pending payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (paymentId: string, action: 'approved' | 'rejected') => {
    setProcessing(paymentId);
    
    try {
      const updateData: any = {
        status: action,
        admin_notes: adminNotes[paymentId] || null
      };

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: `Payment ${action}`,
        description: `The payment has been ${action} successfully`,
      });

      // Refresh the list
      fetchPendingPayments();
      
      // Clear admin notes
      setAdminNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[paymentId];
        return newNotes;
      });

    } catch (error) {
      console.error(`Error ${action} payment:`, error);
      toast({
        title: `Failed to ${action.slice(0, -1)} payment`,
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const viewProofFile = async (filePath: string) => {
    try {
      // Try to download the file directly and create object URL
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('payment-proofs')
        .download(filePath);

      if (downloadError) {
        throw new Error(`Could not access file: ${downloadError.message}`);
      }

      // Get file extension to determine how to handle it
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      const fileName = filePath.split('/').pop() || 'payment-proof';
      
      // Create object URL for viewing
      const objectUrl = URL.createObjectURL(fileData);
      
      if (fileExtension === 'pdf' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
        // For PDFs and images, open in new tab for viewing
        const newWindow = window.open(objectUrl, '_blank');
        
        if (!newWindow) {
          toast({
            title: "Popup blocked",
            description: "Please allow popups to view the payment proof",
            variant: "destructive"
          });
          // Clean up if popup was blocked
          URL.revokeObjectURL(objectUrl);
          return;
        }
        
        // Set proper title for the window
        setTimeout(() => {
          if (newWindow.document) {
            newWindow.document.title = `Payment Proof - ${fileName}`;
          }
        }, 100);
        
        // Clean up object URL after a delay to allow viewing
        setTimeout(() => URL.revokeObjectURL(objectUrl), 300000); // 5 minutes
      } else {
        // For other file types, force download
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up object URL immediately for downloads
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        
        toast({
          title: "Download started",
          description: "The payment proof is being downloaded",
        });
      }
    } catch (error) {
      console.error('Error viewing proof file:', error);
      toast({
        title: "View failed",
        description: `Failed to view proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'razorpay':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'phonepe':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'offline':
        return 'bg-secondary';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Pending Payment Approvals</h2>
        </div>
        
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Pending Payment Approvals</h2>
        <Badge variant="secondary">{payments.length}</Badge>
      </div>

      {payments.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No pending payments</h3>
          <p className="text-muted-foreground">All payments have been reviewed</p>
        </GlassCard>
      ) : (
        <div className="grid gap-6">
          {payments.map((payment, index) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Payment Info */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">
                          Payment for {payment.reports?.title || 'Monthly Report'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {payment.profiles?.full_name || 'Unknown User'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Pending Review
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-success" />
                        <span className="font-bold text-success text-lg">
                          ₹{payment.amount.toLocaleString()}
                        </span>
                      </div>
                      
                      <Badge variant="outline" className={getMethodBadgeColor(payment.method)}>
                        {payment.method === 'phonepe' && 'PhonePe'}
                        {payment.method === 'razorpay' && 'Razorpay'}
                        {payment.method === 'offline' && 'Offline Payment'}
                      </Badge>

                      {payment.phonepe_transaction_id && (
                        <div className="text-xs text-muted-foreground">
                          ID: {payment.phonepe_transaction_id}
                        </div>
                      )}
                    </div>

                    {payment.proof_url && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewProofFile(payment.proof_url)}
                        >
                          View Payment Proof
                        </Button>
                      </div>
                    )}

                    {/* Admin Notes */}
                    <div className="space-y-2">
                      <Label htmlFor={`admin-notes-${payment.id}`}>Admin Notes (Optional)</Label>
                      <Textarea
                        id={`admin-notes-${payment.id}`}
                        placeholder="Add notes for approval or rejection..."
                        value={adminNotes[payment.id] || ''}
                        onChange={(e) => setAdminNotes(prev => ({
                          ...prev,
                          [payment.id]: e.target.value
                        }))}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex lg:flex-col gap-3">
                    <Button
                      variant="default"
                      className="flex-1 lg:flex-none bg-success hover:bg-success/90"
                      onClick={() => handleApproval(payment.id, 'approved')}
                      disabled={processing === payment.id}
                      loading={processing === payment.id}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve Payment
                    </Button>
                    
                    <Button
                      variant="destructive"
                      className="flex-1 lg:flex-none"
                      onClick={() => handleApproval(payment.id, 'rejected')}
                      disabled={processing === payment.id}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject Payment
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}