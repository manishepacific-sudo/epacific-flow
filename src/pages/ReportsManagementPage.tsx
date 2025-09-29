import { useState, useEffect } from "react";
import { FileText, CheckCircle2, XCircle, Clock, Eye, Download } from "lucide-react";
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
  const [filters, setFilters] = useState({
    role: 'all',
    registrar: 'all',
    status: 'all',
    approval: 'all',
    dateRange: { from: null as Date | null, to: null as Date | null }
  });

  const filterConfig: FilterConfig = {
    statuses: ['pending', 'approved', 'rejected'],
    additionalFilters: [
      {
        key: 'approval',
        label: 'Approval Status',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }
        ]
      }
    ]
  };

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
            profiles (
              full_name,
              email,
              mobile_number,
              center_address,
              registrar
            )
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

  const filteredReports = reports.filter(report => {
    // Search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = (
        report.title?.toLowerCase().includes(searchLower) ||
        report.description?.toLowerCase().includes(searchLower) ||
        report.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        report.profiles?.email?.toLowerCase().includes(searchLower) ||
        report.profiles?.mobile_number?.includes(searchValue) ||
        report.profiles?.center_address?.toLowerCase().includes(searchLower) ||
        report.profiles?.registrar?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status !== 'all' && report.status !== filters.status) return false;
    if (filters.approval !== 'all' && report.status !== filters.approval) return false;

    // Registrar filter
    if (filters.registrar !== 'all' && report.profiles?.registrar !== filters.registrar) return false;

    // Date range filter
    if (filters.dateRange.from) {
      const reportDate = new Date(report.created_at);
      if (reportDate < filters.dateRange.from) return false;
      if (filters.dateRange.to && reportDate > filters.dateRange.to) return false;
    }

    return true;
  });

  const exportToExcel = (type: 'all' | 'filtered' | 'active' | 'inactive' | 'date-range') => {
    let dataToExport: Report[] = [];
    let filename = 'reports-export';

    switch (type) {
      case 'all':
        dataToExport = reports;
        filename = 'all-reports';
        break;
      case 'filtered':
        dataToExport = filteredReports;
        filename = 'filtered-reports';
        break;
      case 'active':
        dataToExport = reports.filter(r => r.status === 'approved');
        filename = 'approved-reports';
        break;
      case 'inactive':
        dataToExport = reports.filter(r => r.status === 'rejected');
        filename = 'rejected-reports';
        break;
      case 'date-range':
        dataToExport = filteredReports;
        filename = 'date-range-reports';
        break;
    }

    const excelData = dataToExport.map(report => ({
      'Title': report.title,
      'Description': report.description,
      'User Name': report.profiles?.full_name || 'N/A',
      'User Email': report.profiles?.email || 'N/A',
      'Registrar': report.profiles?.registrar || 'N/A',
      'Amount': report.amount || 'N/A',
      'Status': report.status,
      'Manager Notes': report.manager_notes || 'N/A',
      'Rejection Message': report.rejection_message || 'N/A',
      'Created Date': format(new Date(report.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Updated Date': format(new Date(report.updated_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');

    const colWidths = [
      { wch: 25 }, // Title
      { wch: 35 }, // Description
      { wch: 20 }, // User Name
      { wch: 25 }, // User Email
      { wch: 15 }, // Registrar
      { wch: 12 }, // Amount
      { wch: 10 }, // Status
      { wch: 20 }, // Manager Notes
      { wch: 20 }, // Rejection Message
      { wch: 20 }, // Created Date
      { wch: 20 }  // Updated Date
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    toast({
      title: "Export completed",
      description: `Exported ${dataToExport.length} reports to ${filename}.xlsx`,
    });
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

  return (
    <Layout role={role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Reports Management</h2>
          <p className="text-muted-foreground">Review and manage submitted reports</p>
        </div>

        {/* Search, Filter, Export */}
        <SearchFilterExport
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={filters}
          onFiltersChange={setFilters}
          filterConfig={filterConfig}
          onRefresh={fetchReports}
          onExport={exportToExcel}
          exportOptions={{
            all: 'All Reports',
            filtered: 'Current Filter Results',
            active: 'Approved Reports',
            inactive: 'Rejected Reports',
            dateRange: 'Date Range Results'
          }}
          isLoading={loading}
        />

        {/* Reports Table */}
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredReports.length} of {reports.length} reports
                </p>
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
                <p className="text-muted-foreground">
                  {reports.length === 0 ? 'No reports found' : 'No reports match the current filters'}
                </p>
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
                    {filteredReports.map((report) => (
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
                            {report.profiles?.registrar && (
                              <p className="text-xs text-muted-foreground">Registrar: {report.profiles.registrar}</p>
                            )}
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