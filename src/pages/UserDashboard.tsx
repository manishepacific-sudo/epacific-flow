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
  AlertTriangle,
  Info,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import AttendanceCalendar from "@/components/AttendanceCalendar";

interface Report {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  attachment_url: string;
  rejection_message?: string;
  manager_notes?: string;
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
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [profileTimeout, setProfileTimeout] = useState(false);

  // Set timeout for profile loading
  useEffect(() => {
    if (!authLoading && !profile && user) {
      const timer = setTimeout(() => {
        console.error('Profile loading timeout - user authenticated but profile not loaded');
        setProfileTimeout(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, profile, user]);

  // Show loading state while profile is being fetched
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If profile hasn't loaded after timeout, show error
  if (!profile && profileTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Profile Loading Error</h2>
          <p className="text-muted-foreground max-w-md">
            Unable to load your user profile. This could be a database or permissions issue.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/login');
              }}
              variant="destructive"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Still waiting for profile
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

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
            .select('id, user_id, title, description, amount, status, created_at, updated_at, attachment_url, rejection_message, manager_notes')
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
          const error = reportsRes.value.error;
          if (error?.message?.includes('does not exist') || 
              error?.message?.includes('schema cache')) {
            console.warn('Reports table not found, using empty reports data');
            setReports([]);
          } else {
            console.error('Reports fetch error:', error);
          }
        }

        if (paymentsRes.status === 'fulfilled' && !paymentsRes.value.error) {
          setPayments((paymentsRes.value.data || []) as Payment[]);
        } else if (paymentsRes.status === 'fulfilled') {
          console.error('Payments fetch error:', paymentsRes.value.error);
        }

        if (attendanceRes.status === 'fulfilled' && !attendanceRes.value.error) {
          setAttendance((attendanceRes.value.data || []) as Attendance[]);
        } else if (attendanceRes.status === 'fulfilled') {
          const error = attendanceRes.value.error;
          if (error?.message?.includes('does not exist') || 
              error?.message?.includes('schema cache')) {
            console.warn('Attendance table not found, using empty attendance data');
            setAttendance([]);
          } else {
            console.error('Attendance fetch error:', error);
          }
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
  }, [user, toast]);

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
  await downloadFileFromStorage('report-attachments', report.attachment_url, report.id);
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

  // View payment proof from payment-proofs bucket
  const handleViewPaymentProof = async (proofUrl?: string) => {
    if (!proofUrl) {
      toast({
        title: "Error",
        description: "No file available to view",
        variant: "destructive"
      });
      return;
    }

    try {
      if (proofUrl.startsWith('http')) {
        window.open(proofUrl, '_blank');
        return;
      }

      const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(proofUrl, 3600);
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

  const handleViewReportDetails = (report: Report) => {
    setSelectedReport(report);
    setReportDialogOpen(true);
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
  const recentNonRejectedPayments = payments.filter(p => p.status !== 'rejected');
  const approvedReports = reports.filter(r => r.status === 'approved').length;
  const rejectedReports = reports.filter(r => r.status === 'rejected');
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
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

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
            {getGreeting()}, {profile?.full_name || 'User'}! 👋
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingPayments.map((payment) => {
                  const relatedReport = reports.find(r => r.id === payment.report_id);
                  const status = payment.status;
                  const isPending = status === 'pending';
                  const fileName = payment.proof_url?.split('/').pop() || 'No file attached';
                  
                  return (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2 }}
                      onClick={(e) => {
                        console.log('Payment card clicked:', payment.id);
                        navigate(`/payment/user/${payment.id}`);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter') {
                          console.log('Payment card Enter pressed:', payment.id);
                          navigate(`/payment/user/${payment.id}`);
                        }
                      }}
                      className={cn(
                        "rounded-lg border p-4 transition-all hover:shadow-sm cursor-pointer min-h-[120px]",
                        isPending ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                          <span className="text-lg sm:text-2xl font-bold truncate">₹{payment.amount.toLocaleString()}</span>
                        </div>
                        {isPending ? (
                          <Badge className="bg-warning/20 text-warning border-warning/30 text-xs sm:text-sm flex-shrink-0">Pending</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs sm:text-sm flex-shrink-0">Rejected</Badge>
                        )}
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">File Name</p>
                        <p className="text-sm font-medium truncate">{fileName}</p>
                      </div>

                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-muted-foreground">
                        <span className="capitalize">{payment.method}</span>
                        <span className="truncate">
                          {(relatedReport?.title || 'Payment')} • {new Date(payment.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {(!isPending) && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            className="text-xs sm:text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Repay button clicked for payment:', payment.id);
                              navigate(`/payment/${payment.report_id}`, {
                                state: {
                                  repay: true,
                                  paymentId: payment.id,
                                  amount: payment.amount,
                                  method: payment.method,
                                }
                              });
                            }}
                          >
                            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Repay
                          </Button>
                        </div>
                      )}
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
                                onClick={() => navigate(`/report/${report.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              {report.attachment_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => handleReportDownload(report)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              )}
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
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/report/${report.id}`)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/report/${report.id}`); }}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                onClick={(e) => { e.stopPropagation(); navigate(`/report/${report.id}`); }}
                                title="View Full Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {report.attachment_url && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => { e.stopPropagation(); handleReportDownload(report); }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
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
              {recentNonRejectedPayments.length === 0 ? (
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
                      {recentNonRejectedPayments.slice(0, 3).map((payment) => (
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
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentNonRejectedPayments.slice(0, 5).map((payment) => (
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

        {/* Attendance Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceCalendar />
          </CardContent>
        </Card>
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Title</h3>
                <p className="text-lg font-semibold">{selectedReport.title}</p>
              </div>

              {selectedReport.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                  <Badge variant={
                    selectedReport.status === 'approved' ? 'default' : 
                    selectedReport.status === 'rejected' ? 'destructive' : 
                    'secondary'
                  }>
                    {selectedReport.status}
                  </Badge>
                </div>

                {selectedReport.amount && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount</h3>
                    <p className="text-sm font-semibold">₹{selectedReport.amount.toLocaleString()}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Submitted On</h3>
                  <p className="text-sm">{new Date(selectedReport.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                  <p className="text-sm">{new Date(selectedReport.updated_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedReport.rejection_message && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-destructive mb-1">Rejection Reason</h3>
                  <p className="text-sm">{selectedReport.rejection_message}</p>
                </div>
              )}

              {selectedReport.manager_notes && (
                <div className="bg-muted/50 border rounded-lg p-3">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Manager Notes</h3>
                  <p className="text-sm">{selectedReport.manager_notes}</p>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                {selectedReport.attachment_url && (
                  <>
                    <Button 
                      onClick={() => handleView(selectedReport.attachment_url)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Attachment
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleReportDownload(selectedReport)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}