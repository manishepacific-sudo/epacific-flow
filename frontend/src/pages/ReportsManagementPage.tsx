import { useState, useEffect } from "react";
import { FileText, CheckCircle2, XCircle, Clock, Download, ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SearchFilterExport, { FilterConfig } from "@/components/shared/SearchFilterExport";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 20;

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
    mobile_number: string;
    center_address: string;
    registrar: string;
  } | null;
}

export default function ReportsManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const role = profile?.role as 'admin' | 'manager';
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingReports, setProcessingReports] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    role: 'all',
    registrar: 'all',
    status: 'all',
    approval: 'all',
    dateRange: { from: null as Date | null, to: null as Date | null }
  });

  const filterConfig: FilterConfig = {
    statuses: ['pending', 'approved', 'rejected'],
    additionalFilters: [{
      key: 'approval',
      label: 'Approval Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ]
    }]
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('reports')
        .select(`*,
          profiles (full_name, email, mobile_number, center_address, registrar)
        `)
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      setReports(fallbackData || []);
    } catch (error: any) {
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
      const { error } = await supabase.from('reports').update(updateData).eq('id', reportId);
      if (error) throw error;
      toast({
        title: `Report ${action}`,
        description: `Report has been ${action} successfully.`,
        variant: action === 'approved' ? 'default' : 'destructive'
      });
      fetchReports();
    } catch (error: any) {
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
      const { data, error } = await supabase.storage.from('report-attachments').download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const filteredReports = reports.filter(report => {
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = (
        report.title?.toLowerCase().includes(searchLower) ||
        report.description?.toLowerCase().includes(searchLower) ||
        report.profiles?.full_name?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }
    if (filters.status !== 'all' && report.status !== filters.status) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  return (
    <Layout role={role}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Reports Management</h2>
          <p className="text-muted-foreground">Review and manage submitted reports</p>
        </div>

        <SearchFilterExport
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={filters}
          onFiltersChange={setFilters}
          filterConfig={filterConfig}
          onRefresh={fetchReports}
          isLoading={loading}
        />

        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Reports</h3>
                <p className="text-sm text-muted-foreground">Showing {paginatedReports.length} of {filteredReports.length} reports</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reports found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto mb-4">
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
                      {paginatedReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{report.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{report.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{report.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell><span className="font-medium">₹{report.amount?.toLocaleString()}</span></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(report.status)}
                              {getStatusBadge(report.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{format(new Date(report.created_at), 'MMM dd, yyyy')}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {report.attachment_url && (
                                <Button variant="ghost" size="sm" onClick={() => downloadFile(report.attachment_url, `${report.title}.pdf`)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {report.status === 'pending' && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleReportAction(report.id, 'approved')} disabled={processingReports.has(report.id)}>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handleReportAction(report.id, 'rejected')} disabled={processingReports.has(report.id)}>
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
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}
