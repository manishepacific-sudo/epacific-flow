import { useState, useEffect } from "react";
import { FileText, Eye, Download, Check, X } from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SearchFilterExport, { FilterConfig } from "@/components/shared/SearchFilterExport";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { downloadFileFromStorage } from '@/utils/fileDownload';
import { useNavigate } from "react-router-dom";

interface Report {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  attachment_url: string;
  manager_notes: string;
  rejection_message: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
    mobile_number: string;
    center_address: string;
    registrar: string;
  };
}

export default function ReportManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const role = profile?.role as 'admin' | 'manager';

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    registrar: 'all',
    status: 'all',
    approval: 'all',
    dateRange: { from: null as Date | null, to: null as Date | null }
  });

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');

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
      
      if (edgeError || !edgeData?.reports) {
        // Fallback to direct query
        const { data, error } = await supabase
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

        if (error) {
          // If reports table doesn't exist, return empty data
          if (error.message?.includes('does not exist') || 
              error.message?.includes('schema cache')) {
            console.warn('Reports table not found, returning empty reports data');
            reportsData = [];
          } else {
            throw error;
          }
        } else {
          reportsData = data;
        }
      } else {
        reportsData = edgeData.reports;
      }

      setReports(reportsData || []);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    // Search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = (
        report.title.toLowerCase().includes(searchLower) ||
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

  const handleApprove = async (reportId: string) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'approved',
          manager_notes: managerNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report Approved",
        description: "The report has been approved successfully"
      });

      fetchReports();
      setSelectedReport(null);
      setManagerNotes('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to approve report",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reportId: string) => {
    if (!managerNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide notes for rejection",
        variant: "destructive"
      });
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'rejected',
          rejection_message: managerNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report Rejected",
        description: "The report has been rejected"
      });

      fetchReports();
      setSelectedReport(null);
      setManagerNotes('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject report",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadReport = async (filePath: string, customName: string) => {
    try {
      await downloadFileFromStorage('report-attachments', filePath, customName);
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || 'Failed to download report',
        variant: "destructive"
      });
    }
  };

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
      'Report Title': report.title,
      'User Name': report.profiles?.full_name || 'N/A',
      'User Email': report.profiles?.email || 'N/A',
      'Registrar': report.profiles?.registrar || 'N/A',
      'Amount': report.amount,
      'Status': report.status,
      'Description': report.description,
      'Manager Notes': report.manager_notes || 'N/A',
      'Rejection Message': report.rejection_message || 'N/A',
      'Created Date': format(new Date(report.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Updated Date': format(new Date(report.updated_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');

    const colWidths = [
      { wch: 25 }, // Report Title
      { wch: 20 }, // User Name
      { wch: 25 }, // User Email
      { wch: 15 }, // Registrar
      { wch: 12 }, // Amount
      { wch: 10 }, // Status
      { wch: 30 }, // Description
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

  return (
    <Layout role={role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Report Management</h2>
          <p className="text-muted-foreground">Review and manage submitted reports</p>
        </div>

        {/* Search, Filter, Export */}
        <SearchFilterExport
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={{
            ...filters,
            useReportDate: false
          }}
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
                          <div>
                            <p className="font-medium">{report.title}</p>
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{report.profiles?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{report.profiles?.email}</p>
                            {report.profiles?.registrar && (
                              <p className="text-xs text-muted-foreground">Registrar: {report.profiles.registrar}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">₹{report.amount?.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(report.status)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(report.created_at), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setManagerNotes(report.manager_notes || '');
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Report Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Title</label>
                                      <p className="text-sm">{selectedReport?.title}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Amount</label>
                                      <p className="text-sm">₹{selectedReport?.amount?.toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Description</label>
                                    <p className="text-sm">{selectedReport?.description}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Manager Notes</label>
                                    <Textarea
                                      value={managerNotes}
                                      onChange={(e) => setManagerNotes(e.target.value)}
                                      placeholder="Add notes for approval/rejection..."
                                      rows={3}
                                    />
                                  </div>
                                  {selectedReport?.status === 'pending' && (
                                    <div className="flex gap-2 pt-4">
                                      <Button
                                        onClick={() => selectedReport && handleApprove(selectedReport.id)}
                                        disabled={actionLoading}
                                        className="flex-1"
                                      >
                                        <Check className="h-4 w-4 mr-2" />
                                        {actionLoading ? 'Approving...' : 'Approve'}
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => selectedReport && handleReject(selectedReport.id)}
                                        disabled={actionLoading}
                                        className="flex-1"
                                      >
                                        <X className="h-4 w-4 mr-2" />
                                        {actionLoading ? 'Rejecting...' : 'Reject'}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/report/${report.id}`)}
                              title="View Full Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {report.attachment_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadReport(report.attachment_url, report.title || `report-${report.id}`)}
                                title="Download Report"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
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