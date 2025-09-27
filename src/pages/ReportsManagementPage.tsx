import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  RefreshCw
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

interface Report {
  id: string;
  title: string;
  description: string;
  amount: number;
  attachment_url: string;
  status: string;
  created_at: string;
  user_id: string;
  manager_notes?: string;
  rejection_message?: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export default function ReportsManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const role = profile?.role as 'admin' | 'manager';
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingReports, setProcessingReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Try edge function first
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('get-reports', {
        body: { admin_email: profile?.email }
      });

      let reportsData;
      if (edgeError) {
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('reports')
          .select(`
            *,
            profiles(full_name, email)
          `)
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        reportsData = fallbackData || [];
      } else {
        reportsData = edgeData?.reports || [];
      }

      setReports(reportsData);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error loading reports",
        description: error.message || "Failed to load reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId: string, action: 'approved' | 'rejected', notes?: string) => {
    setProcessingReports(prev => new Set(prev).add(reportId));
    
    try {
      const updateData: any = { status: action };
      if (notes && action === 'rejected') {
        updateData.manager_notes = notes;
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: `Report ${action}`,
        description: `Report has been ${action} successfully.`,
        variant: action === 'approved' ? 'default' : 'destructive'
      });

      fetchReports();
    } catch (error: any) {
      console.error('Report action error:', error);
      toast({
        title: "Action failed",
        description: error.message || `Failed to ${action} report`,
        variant: "destructive"
      });
    } finally {
      setProcessingReports(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('report-attachments')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `The file "${fileName}" is being downloaded`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the report file",
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
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    approved: reports.filter(r => r.status === 'approved').length,
    rejected: reports.filter(r => r.status === 'rejected').length
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
          <h1 className="text-3xl font-bold gradient-text">Reports Management</h1>
          <p className="text-muted-foreground">
            Review and manage submitted reports
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: "Total Reports", value: stats.total, icon: FileText, color: "text-blue-500" },
            { title: "Pending Review", value: stats.pending, icon: Clock, color: "text-orange-500" },
            { title: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-green-500" },
            { title: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-500" }
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

        {/* Reports Table */}
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">All Reports</h3>
              <Button variant="outline" onClick={fetchReports} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reports found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{report.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {report.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {report.profiles?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {report.profiles?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            ₹{report.amount?.toLocaleString() || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(report.status)}
                            {getStatusBadge(report.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(report.created_at), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {report.attachment_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadFile(report.attachment_url, `${report.title}.pdf`)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {report.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReportAction(report.id, 'approved')}
                                  disabled={processingReports.has(report.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    const notes = prompt("Rejection reason (optional):");
                                    handleReportAction(report.id, 'rejected', notes || undefined);
                                  }}
                                  disabled={processingReports.has(report.id)}
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