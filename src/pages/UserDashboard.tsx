import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CreditCard,
  Camera,
  DollarSign,
  Clock,
  CheckCircle,
  Upload,
  Calendar,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { downloadFileFromStorage } from "@/utils/fileDownload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Report {
  id: string;
  user_id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  attachment_url: string;
}

interface Payment {
  id: string;
  user_id: string;
  report_id: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  proof_url?: string;
  rejection_message?: string;
}

interface Attendance {
  id: string;
  user_id: string;
  attendance_date: string;
  status: 'pending' | 'approved' | 'rejected';
  photo_url?: string;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);

        // First check if user profile is loaded
        if (!user?.id) {
          throw new Error('User ID not available');
        }

        // Add limit and proper error handling for each query
        const [reportsRes, paymentsRes, attendanceRes] = await Promise.allSettled([
          supabase
            .from('reports')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .order('attendance_date', { ascending: false })
            .limit(50)
        ]);

        // Handle individual query results
        if (reportsRes.status === 'fulfilled' && !reportsRes.value.error) {
          setReports((reportsRes.value.data || []) as Report[]);
        } else if (reportsRes.status === 'fulfilled') {
          console.error('Reports fetch error:', reportsRes.value.error);
        }

        if (paymentsRes.status === 'fulfilled' && !paymentsRes.value.error) {
          setPayments((paymentsRes.value.data || []) as Payment[]);
        } else if (paymentsRes.status === 'fulfilled') {
          console.error('Payments fetch error:', paymentsRes.value.error);
        }

        if (attendanceRes.status === 'fulfilled' && !attendanceRes.value.error) {
          setAttendance((attendanceRes.value.data || []) as Attendance[]);
        } else if (attendanceRes.status === 'fulfilled') {
          console.error('Attendance fetch error:', attendanceRes.value.error);
        }

        // Show error only if all queries failed
        if ([reportsRes, paymentsRes, attendanceRes].every(res => 
          res.status === 'rejected' || (res.status === 'fulfilled' && res.value.error)
        )) {
          throw new Error('Failed to fetch any dashboard data');
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error loading data",
          description: error instanceof Error ? error.message : "Failed to load dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    const reportsChannel = supabase
      .channel('user-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${user.id}`,
        },
        fetchUserData
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel('user-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${user.id}`,
        },
        fetchUserData
      )
      .subscribe();

    const attendanceChannel = supabase
      .channel('user-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `user_id=eq.${user.id}`,
        },
        fetchUserData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [user?.id, toast]); // Explicitly depend on user.id instead of the whole user object

  // Handle report download
  const handleReportDownload = async (report: Report) => {
    try {
      if (!report.attachment_url) {
        toast({
          title: "Error",
          description: "No attachment available for this report",
          variant: "destructive"
        });
        return;
      }
      await downloadFileFromStorage('reports', report.attachment_url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download report",
        variant: "destructive"
      });
    }
  };

  // Handle report/proof view
  const handleView = async (url?: string) => {
    if (!url) {
      toast({
        title: "Error",
        description: "No file available to view",
        variant: "destructive"
      });
      return;
    }
    try {
      // First try to get a public URL
      const { data: publicUrlData } = await supabase.storage
        .from('report-attachments')
        .getPublicUrl(url);

      if (publicUrlData?.publicUrl) {
        // For public bucket, use public URL
        window.open(publicUrlData.publicUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // Fallback to signed URL if public URL fails
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('report-attachments')
        .createSignedUrl(url, 3600); // URL valid for 1 hour

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(signedUrlError?.message || 'Could not generate URL');
      }

      window.open(signedUrlData.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        title: "Error",
        description: "Could not open the file for viewing. Please check your permissions.",
        variant: "destructive"
      });
    }
  };

  // Handle resubmit proof
  const handleResubmitProof = (payment: Payment) => {
    setSelectedPayment(payment);
    setResubmitDialogOpen(true);
  };

  // Handle proof file upload
  const handleProofFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPayment) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG, WEBP) or PDF file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingProof(true);

    try {
      // Upload to payment-proofs bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${selectedPayment.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Call edge function to update payment
      const { error: functionError } = await supabase.functions.invoke('resubmit-payment-proof', {
        body: {
          paymentId: selectedPayment.id,
          proofUrl: fileName
        }
      });

      if (functionError) {
        throw functionError;
      }

      toast({
        title: "Success",
        description: "Payment proof resubmitted successfully. It will be reviewed by a manager.",
      });

      setResubmitDialogOpen(false);
      setSelectedPayment(null);

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error resubmitting proof:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resubmit payment proof",
        variant: "destructive"
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const quickActions = [
    {
      icon: Upload,
      title: "Upload Report",
      description: "Submit your monthly report",
      action: () => navigate("/upload/report"),
      color: "bg-primary",
    },
    {
      icon: Camera,
      title: "Mark Attendance",
      description: "Upload today's attendance photo",
      action: () => navigate("/attendance"),
      color: "bg-secondary",
    },
    {
      icon: CreditCard,
      title: "Payments",
      description: "Manage payments and view history",
      action: () => navigate("/payments"),
      color: "bg-warning",
    },
  ];

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'rejected');
  const pendingPaymentsCount = pendingPayments.length;
  const approvedReports = reports.filter(r => r.status === 'approved').length;
  const approvedReportsWithoutPayment = reports.filter(r => 
    r.status === 'approved' && !payments.some(p => p.report_id === r.id && p.status === 'approved')
  ).length;
  const totalPendingAmount = approvedReportsWithoutPayment * 25000;

  // Calculate monthly attendance metrics
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthlyAttendance = attendance.filter(a => {
    const attendanceDate = new Date(a.attendance_date);
    return attendanceDate.getMonth() === currentMonth && 
           attendanceDate.getFullYear() === currentYear &&
           a.status === 'approved';
  });

  const monthlyAttendanceCount = monthlyAttendance.length;
  const totalWorkingDays = 22; // Assuming 22 working days per month
  const attendancePercentage = totalWorkingDays > 0 
    ? Math.round((monthlyAttendanceCount / totalWorkingDays) * 100) 
    : 0;
  
  const dashboardCards = [
    {
      title: "Total Reports",
      value: reports.length,
      icon: FileText,
      trend: `${approvedReports} approved`,
      color: "text-primary",
    },
    {
      title: "Pending Amount",
      value: `₹${totalPendingAmount.toLocaleString()}`,
      icon: DollarSign,
      trend: `${approvedReportsWithoutPayment} reports awaiting payment`,
      color: "text-warning",
    },
    {
      title: "Monthly Attendance",
      value: monthlyAttendanceCount,
      icon: Calendar,
      trend: `${attendancePercentage}% this month`,
      color: "text-secondary",
    },
    {
      title: "Pending Reviews",
      value: pendingPaymentsCount,
      icon: Clock,
      trend: "Awaiting manager approval",
      color: "text-secondary",
    }
    
    
  ];

  const isMobile = useIsMobile();

  return (
    <Layout role={profile?.role}>
      <div className={cn("space-y-8 max-w-7xl mx-auto", isMobile && "pb-20")}>
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Good morning, {profile?.full_name || 'User'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your account today.
          </p>
        </motion.div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
                  </div>
                  <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{card.trend}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pending Payments Section */}
        {pendingPayments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPayments.map((payment) => {
                  const relatedReport = reports.find(r => r.id === payment.report_id);
                  const isRejected = payment.status === 'rejected';
                  
                  return (
                    <motion.div
                      key={payment.id}
                      className={cn(
                        "rounded-lg border p-4",
                        isRejected && "border-destructive/50 bg-destructive/5"
                      )}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CreditCard className="h-5 w-5 text-primary/80 flex-shrink-0" />
                              <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                              <Badge variant={isRejected ? 'destructive' : 'secondary'}>
                                {isRejected ? 'Rejected' : 'Pending'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {relatedReport?.title || 'Report'} • {new Date(payment.created_at).toLocaleDateString()}
                            </p>
                            {isRejected && payment.rejection_message && (
                              <div className="mt-2 flex items-start gap-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>{payment.rejection_message}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap">
                          {payment.proof_url && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleView(payment.proof_url)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Proof
                            </Button>
                          )}
                          {isRejected && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleResubmitProof(payment)}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Resubmit Proof
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports and Payments Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Reports Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Recent Reports</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="py-8 border border-dashed rounded-lg">
                  <div className="flex flex-col items-center justify-center text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No reports yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isMobile ? (
                    <div className="grid grid-cols-1 gap-4">
                      {reports.slice(0, 3).map((report) => {
                        const displayTitle = report.title !== 'Monthly Report' 
                          ? report.title 
                          : `Report - ${new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                        const uploadDate = new Date(report.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        });
                        return (
                          <motion.div
                            key={report.id}
                            className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-primary/80 flex-shrink-0" />
                                  <p className="font-semibold text-sm truncate">{displayTitle}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Uploaded: {uploadDate}
                                </p>
                              </div>
                              <Badge variant={report.status === 'approved' ? 'default' : report.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {report.status}
                              </Badge>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleReportDownload(report)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reports.slice(0, 5).map((report) => {
                        const displayTitle = report.title !== 'Monthly Report' 
                          ? report.title 
                          : `Report - ${new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                        const uploadDate = new Date(report.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        });
                        return (
                          <div
                            key={report.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <FileText className="h-5 w-5 text-primary/80 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{displayTitle}</p>
                                <p className="text-xs text-muted-foreground">
                                  {uploadDate}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <Badge variant={report.status === 'approved' ? 'default' : report.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {report.status}
                              </Badge>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleReportDownload(report)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Recent Payments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="py-8 border border-dashed rounded-lg">
                  <div className="flex flex-col items-center justify-center text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No payments yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isMobile ? (
                    <div className="grid grid-cols-1 gap-4">
                      {payments.slice(0, 3).map((payment) => (
                        <motion.div
                          key={payment.id}
                          className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary/80" />
                                <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={payment.status === 'approved' ? 'default' : payment.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {payment.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleView(payment.proof_url)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Proof
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payments.slice(0, 5).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-primary/80 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <Badge variant={payment.status === 'approved' ? 'default' : payment.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {payment.status}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleView(payment.proof_url)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              onClick={action.action}
              className="relative p-6 rounded-xl border bg-white dark:bg-gray-800 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-4">
                <div className={`${action.color} p-3 rounded-lg bg-opacity-10`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Attendance Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Monthly Attendance Progress</CardTitle>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">
                {monthlyAttendanceCount}/{totalWorkingDays} days
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress 
              value={attendancePercentage} 
              className="h-3 mb-2"
            />
            <p className="text-sm text-muted-foreground">
              {monthlyAttendanceCount > 0 
                ? `You've marked attendance for ${monthlyAttendanceCount} days this month`
                : "No attendance records for this month yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resubmit Proof Dialog */}
      <Dialog open={resubmitDialogOpen} onOpenChange={setResubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resubmit Payment Proof</DialogTitle>
            <DialogDescription>
              Upload a new payment proof document. The payment will be reviewed again by a manager.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {selectedPayment && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Payment Amount</p>
                <p className="text-lg font-bold">₹{selectedPayment.amount.toLocaleString()}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="proof-file">Upload New Proof</Label>
              <Input
                id="proof-file"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                onChange={handleProofFileUpload}
                disabled={uploadingProof}
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: JPG, PNG, WEBP, PDF (max 5MB)
              </p>
            </div>

            {uploadingProof && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span>Uploading proof...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}