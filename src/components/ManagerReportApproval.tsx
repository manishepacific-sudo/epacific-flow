import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Check, 
  X, 
  Eye, 
  Calendar,
  DollarSign,
  User,
  Download
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { notifyReportRejected } from "@/utils/notifications";

interface Report {
  id: string;
  title: string;
  description: string;
  amount: number;
  attachment_url: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export default function ManagerReportApproval() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingReports();
  }, []);

  const fetchPendingReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data || []) as unknown as Report[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error loading reports",
        description: "Failed to load pending reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (reportId: string, action: 'approved' | 'rejected') => {
    setProcessing(reportId);
    
    try {
      const updateData: any = {
        status: action,
        manager_notes: action === 'rejected' ? rejectionNotes[reportId] || '' : null
      };

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      // Send notification to user
      const report = reports.find(r => r.id === reportId);
      if (report) {
        if (action === 'rejected' && rejectionNotes[reportId]) {
          await notifyReportRejected(
            report.user_id,
            report.title || 'Monthly Report',
            rejectionNotes[reportId]
          );
        } else if (action === 'approved') {
          const { notifyReportApproved } = await import("@/utils/notifications");
          await notifyReportApproved(
            report.user_id,
            report.title || 'Monthly Report'
          );
        }
      }

      toast({
        title: `Report ${action}`,
        description: `The report has been ${action} successfully`,
      });

      // Refresh the list
      fetchPendingReports();
      
      // Clear rejection notes
      setRejectionNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[reportId];
        return newNotes;
      });

    } catch (error) {
      console.error(`Error ${action} report:`, error);
      toast({
        title: `Failed to ${action.slice(0, -1)} report`,
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const downloadFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('report-attachments')
        .download(filePath);

      if (error) throw error;

      // Get the file extension to determine the proper filename
      const fileName = filePath.split('/').pop() || 'report';
      
      // Force download by creating a temporary URL and triggering download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      
      // Force the download attribute to ensure it downloads instead of opening
      a.setAttribute('download', fileName);
      a.style.display = 'none';
      document.body.appendChild(a);
      
      // Trigger download
      a.click();
      
      // Clean up immediately
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `The report file "${fileName}" is being downloaded`,
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Pending Report Approvals</h2>
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
        <FileText className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Pending Report Approvals</h2>
        <Badge variant="secondary">{reports.length}</Badge>
      </div>

      {reports.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No pending reports</h3>
          <p className="text-muted-foreground">All reports have been reviewed</p>
        </GlassCard>
      ) : (
        <div className="grid gap-6">
          {reports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Report Info */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">
                          {report.title || 'Monthly Report'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {report.profiles?.full_name || 'Unknown User'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(report.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Pending Approval
                      </Badge>
                    </div>

                    <p className="text-muted-foreground">
                      {report.description || 'No description provided'}
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-success" />
                        <span className="font-semibold text-success">
                          ₹{report.amount?.toLocaleString() || '0'}
                        </span>
                      </div>
                      
                      {report.attachment_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(report.attachment_url)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Report
                        </Button>
                      )}
                    </div>

                    {/* Rejection Notes */}
                    <div className="space-y-2">
                      <Label htmlFor={`notes-${report.id}`}>Manager Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${report.id}`}
                        placeholder="Add notes for rejection or approval..."
                        value={rejectionNotes[report.id] || ''}
                        onChange={(e) => setRejectionNotes(prev => ({
                          ...prev,
                          [report.id]: e.target.value
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
                      onClick={() => handleApproval(report.id, 'approved')}
                      disabled={processing === report.id}
                      loading={processing === report.id}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    
                    <Button
                      variant="destructive"
                      className="flex-1 lg:flex-none"
                      onClick={() => handleApproval(report.id, 'rejected')}
                      disabled={processing === report.id}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
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