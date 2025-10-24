import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Check, 
  X, 
  User, 
  Calendar, 
  DollarSign,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isValid } from "date-fns";
import { downloadFileFromStorage } from "@/utils/fileDownload";
import { DBReport } from "@/types";

interface Profile {
  full_name: string;
  email: string;
  mobile_number: string;
  center_address: string;
  registrar: string;
  role: string;
}

interface ReportWithProfile extends DBReport {
  profiles?: Profile | null;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  proof_url?: string;
  phonepe_transaction_id?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [report, setReport] = useState<ReportWithProfile | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [rejectionMessage, setRejectionMessage] = useState('');

  const isManagerOrAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const canEdit = isManagerOrAdmin && report?.status === 'pending';

  useEffect(() => {
    if (reportId) {
      fetchReportDetails();
    }
  }, [reportId]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch report with user profile
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles (
            full_name,
            email,
            mobile_number,
            center_address,
            registrar,
            role
          )
        `)
        .eq('id', reportId)
        .single();

      if (reportError) {
        // If reports table doesn't exist, show error
        if (reportError.message?.includes('does not exist') || 
            reportError.message?.includes('schema cache')) {
          toast({
            title: "Reports System Unavailable",
            description: "The reports system is not available. Please contact your administrator.",
            variant: "destructive"
          });
          navigate(-1);
          return;
        }
        throw reportError;
      }

      // Check if user can view this report
      if (profile?.role === 'user' && reportData.user_id !== profile.user_id) {
        toast({
          title: "Access Denied",
          description: "You can only view your own reports.",
          variant: "destructive"
        });
        navigate('/dashboard/user');
        return;
      }

      setReport({
        ...reportData,
        status: reportData.status as 'pending' | 'approved' | 'rejected'
      });
      setManagerNotes(reportData.manager_notes || '');
      setRejectionMessage(reportData.rejection_message || '');

      // Fetch associated payment if exists
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('report_id', reportId)
        .single();

      if (paymentData && !paymentError) {
        setPayment(paymentData);
      }

    } catch (error) {
      console.error('Error fetching report details:', error);
      toast({
        title: "Error",
        description: "Failed to load report details.",
        variant: "destructive"
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!report || !actionType) return;

    try {
      setActionLoading(true);

      const updateData: any = {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString()
      };

      if (actionType === 'approve') {
        updateData.manager_notes = managerNotes;
      } else {
        updateData.rejection_message = rejectionMessage;
        updateData.manager_notes = managerNotes;
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', report.id);

      if (error) throw error;

      toast({
        title: `Report ${actionType === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The report has been ${actionType === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });

      // Refresh report data
      await fetchReportDetails();
      setShowActionDialog(false);
      setActionType(null);
      setManagerNotes('');
      setRejectionMessage('');

    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!report?.attachment_url) return;

    try {
      await downloadFileFromStorage(report.attachment_url, 'report-attachments');
      toast({
        title: "Download Started",
        description: "The report file is being downloaded.",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the report file.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: "default",
      rejected: "destructive",
      pending: "secondary"
    } as const;

    const colors = {
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };

    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || "secondary"}
        className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"}
      >
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      completed: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      rejected: "bg-red-100 text-red-800 border-red-200"
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Helper function to safely format date strings from Supabase DATE columns
  const formatReportDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    
    // Handle YYYY-MM-DD format from Supabase DATE columns
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return isValid(date) ? format(date, 'MMM dd, yyyy') : 'N/A';
    }
    
    // Handle other date formats
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'MMM dd, yyyy') : 'N/A';
  };

  if (loading) {
    return (
      <Layout role={profile?.role as any}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout role={profile?.role as any}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">The report you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role={profile?.role as any}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Report Details</h1>
                <p className="text-muted-foreground">View and manage report information</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusIcon(report.status)}
              {getStatusBadge(report.status)}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Report Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GlassCard className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{report.title}</h2>
                        <p className="text-muted-foreground">Report ID: {report.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="mt-1 text-sm leading-relaxed">{report.description}</p>
                    </div>

                    <div className={`grid grid-cols-1 gap-4 ${report.report_date ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-lg font-semibold">₹{report.amount.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {report.report_date && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Report Date</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatReportDate(report.report_date)}</span>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Submitted Date & Time</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>

                    {report.manager_notes && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Manager Notes</Label>
                        <p className="mt-1 text-sm leading-relaxed p-3 bg-muted/50 rounded-lg">
                          {report.manager_notes}
                        </p>
                      </div>
                    )}

                    {report.rejection_message && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                        <p className="mt-1 text-sm leading-relaxed p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                          {report.rejection_message}
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Payment Information */}
              {payment && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Payment Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                        <p className="mt-1 capitalize">{payment.method}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                        <div className="mt-1">
                          {getPaymentStatusBadge(payment.status)}
                        </div>
                      </div>
                      
                      {payment.phonepe_transaction_id && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Transaction ID</Label>
                          <p className="mt-1 font-mono text-sm">{payment.phonepe_transaction_id}</p>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Payment Date</Label>
                        <p className="mt-1">{format(new Date(payment.created_at), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>

                    {payment.admin_notes && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium text-muted-foreground">Admin Notes</Label>
                        <p className="mt-1 text-sm leading-relaxed p-3 bg-muted/50 rounded-lg">
                          {payment.admin_notes}
                        </p>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* User Information */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold">User Information</h3>
                  </div>

                  {report.profiles && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {report.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{report.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{report.profiles.role}</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{report.profiles.email}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{report.profiles.mobile_number}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{report.profiles.registrar}</span>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-sm">{report.profiles.center_address}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              {/* Actions */}
              {canEdit && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Actions</h3>
                    <div className="space-y-3">
                      <Button
                        onClick={() => {
                          setActionType('approve');
                          setShowActionDialog(true);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve Report
                      </Button>
                      
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setActionType('reject');
                          setShowActionDialog(true);
                        }}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject Report
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Action Dialog */}
        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve Report' : 'Reject Report'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="manager-notes">Manager Notes</Label>
                <Textarea
                  id="manager-notes"
                  placeholder="Add notes about this report..."
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              {actionType === 'reject' && (
                <div>
                  <Label htmlFor="rejection-message">Rejection Reason *</Label>
                  <Textarea
                    id="rejection-message"
                    placeholder="Please provide a reason for rejection..."
                    value={rejectionMessage}
                    onChange={(e) => setRejectionMessage(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowActionDialog(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={actionLoading || (actionType === 'reject' && !rejectionMessage.trim())}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {actionLoading ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
