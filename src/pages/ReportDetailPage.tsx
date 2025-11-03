import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Trash2,
  Upload,
  ExternalLink,
  CreditCard
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
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isValid } from "date-fns";
import { downloadFileFromStorage } from "@/utils/fileDownload";
import { DBReport, Profile, ProfileLike } from "@/types";
import { buildReportApprovalUpdate } from "@/utils/approvals";
import { getReportBadgeProps, getReportStatusLabel, getPaymentBadgeClass, getPaymentStatusLabel } from "@/utils/statusBadges";
 

// Profile and ProfileLike reused from shared types

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
  const [approverProfile, setApproverProfile] = useState<ProfileLike | null>(null);
  const [rejectorProfile, setRejectorProfile] = useState<ProfileLike | null>(null);

  const isManagerOrAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const canEdit = isManagerOrAdmin && report?.status === 'pending_approval';

  useEffect(() => {
    if (reportId) {
      fetchReportDetails();
    }
  }, [reportId]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);

      const selectQuery = `
        *,
        profiles (
          full_name,
          email,
          mobile_number,
          center_address,
          registrar,
          role
        )
      `;

      const { data: reportRecord, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();

      if (reportError) {
        const message = reportError.message?.toLowerCase() || '';
        const tableMissing =
          message.includes('relation "public.reports" does not exist') ||
          message.includes('relation "reports" does not exist') ||
          message.includes('table "public.reports" does not exist') ||
          message.includes('schema cache');

        if (tableMissing) {
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

      if (!reportRecord) {
        toast({
          title: "Report Not Found",
          description: "The requested report could not be located.",
          variant: "destructive"
        });
        navigate(-1);
        return;
      }

      let profileDetails: Profile | null = null;
      if (reportRecord.user_id) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select(`
              full_name,
              email,
              mobile_number,
              center_address,
              registrar,
              role
            `)
            .eq('user_id', reportRecord.user_id)
            .maybeSingle();

          profileDetails = profileData || null;
        } catch (profileError) {
          console.warn('Failed to load report owner profile', profileError);
        }
      }

      // Check if user can view this report
      if (profile?.role === 'user' && reportRecord.user_id !== profile.user_id) {
        toast({
          title: "Access Denied",
          description: "You can only view your own reports.",
          variant: "destructive"
        });
        navigate('/dashboard/user');
        return;
      }

      setReport({
        ...reportRecord,
        status: reportRecord.status as 'pending_approval' | 'approved' | 'rejected',
        profiles: profileDetails
      });
      setManagerNotes(reportRecord.manager_notes || '');
      setRejectionMessage(reportRecord.rejection_message || '');

      // Fetch payment if exists
      try {
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('report_id', reportId)
          .single();

        if (paymentData && !paymentError) {
          setPayment(paymentData as any);
        }
      } catch (e) {
        console.error('Failed to fetch payment', e);
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
    if (!profile?.user_id) {
      toast({
        title: "Permission Required",
        description: "You must be signed in as a manager to perform this action.",
        variant: "destructive"
      });
      return;
    }

    try {
      setActionLoading(true);

      const updateData = buildReportApprovalUpdate(actionType === 'approve' ? 'approve' : 'reject', {
        manager_notes: managerNotes,
        rejection_message: rejectionMessage,
        user_id: profile.user_id
      });

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', report.id);

      if (error) throw error;

      // Send notifications similar to ManagerReportApproval
      try {
        if (actionType === 'reject') {
          const { notifyReportRejected } = await import("@/utils/notifications");
          await notifyReportRejected(
            report.user_id,
            report.title || 'Monthly Report',
            rejectionMessage || ''
          );
        } else if (actionType === 'approve') {
          const { notifyReportApproved } = await import("@/utils/notifications");
          await notifyReportApproved(
            report.user_id,
            report.title || 'Monthly Report'
          );
        }
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

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
      await downloadFileFromStorage('report-attachments', report.attachment_url);
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

  const handleViewPaymentProof = async (proofUrl?: string) => {
    if (!proofUrl) {
      toast({
        title: "Error",
        description: "No payment proof available to view",
        variant: "destructive"
      });
      return;
    }

    try {
      if (proofUrl.startsWith('http')) {
        window.open(proofUrl, '_blank');
        return;
      }

      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(proofUrl, 3600);
      
      if (error || !data?.signedUrl) throw error || new Error('Failed to create signed URL');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error viewing payment proof:', error);
      toast({
        title: "Error",
        description: "Could not open the payment proof. Please check your permissions.",
        variant: "destructive"
      });
    }
  };

  const handleResubmit = () => {
    if (!report) return;
    // Navigate to report upload page with report data pre-filled
    navigate('/upload/report', { 
      state: { 
        resubmit: true, 
        reportId: report.id,
        skipPaymentIfPaymentApproved: payment?.status === 'approved',
        previousData: {
          title: report.title,
          description: report.description,
          amount: report.amount
        }
      } 
    });
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
    const props = getReportBadgeProps((status as any));
    return (
      <Badge variant={props.variant} className={props.className}>
        {getReportStatusLabel(status)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    return (
      <Badge className={getPaymentBadgeClass((status as any))}>
        {getPaymentStatusLabel(status)}
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
          {/* Breadcrumbs */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={
                      profile?.role === 'admin' ? '/dashboard/admin' :
                      profile?.role === 'manager' ? '/dashboard/manager' : '/dashboard/user'
                    }>Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={
                      profile?.role === 'user' ? '/dashboard/user' : '/reports-management'
                    }>Reports</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Report Details</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </motion.div>
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

                  {report.status === 'rejected' && report.rejection_message && (
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
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Payment Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                        <p className="mt-1 text-lg font-semibold text-green-600">₹{payment.amount.toLocaleString()}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                        <div className="mt-1">
                          {getPaymentStatusBadge(payment.status)}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Payment Mode</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <p className="capitalize">{payment.method}</p>
                        </div>
                      </div>
                      
                      {payment.phonepe_transaction_id && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Transaction ID</Label>
                          <p className="mt-1 font-mono text-sm break-all">{payment.phonepe_transaction_id}</p>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Payment Date</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">{format(new Date(payment.created_at), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                      </div>
                    </div>

                    {payment.proof_url && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium text-muted-foreground">Payment Proof</Label>
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPaymentProof(payment.proof_url)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Proof
                          </Button>
                        </div>
                      </div>
                    )}

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

              {/* Activity Timeline removed */}

              {/* Location & Verification removed */}

              {/* File Preview removed */}
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
                            {(() => {
                              const name = report.profiles?.full_name?.trim() || '';
                              if (!name) return 'UU';
                              const parts = name.split(/\s+/).filter(Boolean);
                              const initials = parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
                              return initials || 'UU';
                            })()}
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
              {(canEdit || (profile?.role === 'user' && report?.status === 'rejected')) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Actions</h3>
                    <div className="space-y-3">
                      {canEdit ? (
                        <>
                          <Button
                            onClick={() => {
                              setActionType('approve');
                              setShowActionDialog(true);
                            }}
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={actionLoading || !profile?.user_id}
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
                            disabled={actionLoading || !profile?.user_id}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject Report
                          </Button>
                        </>
                      ) : profile?.role === 'user' && report?.status === 'rejected' && (
                        <>
                          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-800 dark:text-red-200">
                              This report was rejected. You can resubmit it with corrections.
                            </p>
                          </div>
                          <Button
                            onClick={handleResubmit}
                            className="w-full bg-orange-600 hover:bg-orange-700"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Resubmit Report
                          </Button>
                        </>
                      )}
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
