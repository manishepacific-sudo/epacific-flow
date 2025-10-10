import { useState, useEffect, useCallback } from "react";
import { FileText, CheckCircle2, XCircle, Clock, Download, Edit, Trash2, User, Building, Calendar, RefreshCw, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SearchFilterExport, { FilterConfig } from "@/components/shared/SearchFilterExport";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { downloadFileFromStorage } from '@/utils/fileDownload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Profile {
  full_name: string;
  email: string;
  mobile_number: string;
  center_address: string;
  registrar: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  amount: number;
  attachment_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string;
  manager_notes?: string;
  rejection_message?: string;
  updated_at: string;
  profiles?: Profile | null;
}

interface Filters {
  role: string;
  registrar: string;
  status: string;
  approval: string;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
}

interface ReportData {
  amount: number;
  attachment_url: string;
  created_at: string;
  description: string;
  id: string;
  manager_notes: string;
  rejection_message: string;
  status: string;
  title: string;
  updated_at: string;
  user_id: string;
  profiles?: Profile | null;
}

export default function ReportsManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const role = profile?.role as 'admin' | 'manager';
  const isMobile = useIsMobile();
  
  // State management
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingReports, setProcessingReports] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState<Filters>({
    role: 'all',
    registrar: 'all',
    status: 'all',
    approval: 'all',
    dateRange: { from: null, to: null }
  });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const filterConfig: FilterConfig = {
    statuses: ['pending', 'approved', 'rejected'] as const,
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

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try edge function first
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('get-reports', {
        body: { admin_email: profile?.email }
      });

      let reportsData: Report[];
      if (edgeError) {
        // Fallback to direct query with profiles relationship
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

        if (fallbackError) {
          // If profiles relationship still fails, fetch reports only
          const { data: reportsOnly, error: reportsError } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (reportsError) throw reportsError;
          reportsData = (reportsOnly || []).map((r: ReportData) => ({
            ...r,
            status: r.status as 'pending' | 'approved' | 'rejected'
          }));
        } else {
          reportsData = (fallbackData || []).map((r: ReportData) => ({
            ...r,
            status: r.status as 'pending' | 'approved' | 'rejected'
          }));
        }
      } else {
        reportsData = (edgeData?.reports || []).map((r: ReportData) => ({
          ...r,
          status: r.status as 'pending' | 'approved' | 'rejected'
        }));
      }

      setReports(reportsData);
    } catch (error: unknown) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error loading reports",
        description: (error as Error).message || "Failed to load reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.email, toast]);

  const processReports = (reports: Report[]) => {
    return reports.filter(report => {
      // Search filter
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        const searchMatches = 
          report.title.toLowerCase().includes(searchLower) ||
          report.description.toLowerCase().includes(searchLower) ||
          report.profiles?.full_name?.toLowerCase().includes(searchLower) ||
          report.profiles?.email?.toLowerCase().includes(searchLower) ||
          report.profiles?.mobile_number?.includes(searchValue);
        
        if (!searchMatches) return false;
      }

      // Status filter
      if (filters.status !== 'all' && report.status !== filters.status) {
        return false;
      }

      // Registrar filter
      if (filters.registrar !== 'all' && report.profiles?.registrar !== filters.registrar) {
        return false;
      }

      // Approval filter
      if (filters.approval !== 'all') {
        if (filters.approval === 'pending' && report.status !== 'pending') return false;
        if (filters.approval === 'approved' && report.status !== 'approved') return false;
        if (filters.approval === 'rejected' && report.status !== 'rejected') return false;
      }

      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const reportDate = new Date(report.created_at);
        
        if (filters.dateRange.from && reportDate < filters.dateRange.from) {
          return false;
        }
        if (filters.dateRange.to) {
          const endDate = new Date(filters.dateRange.to);
          endDate.setHours(23, 59, 59, 999); // Include the entire day
          if (reportDate > endDate) return false;
        }
      }

      return true;
    });
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  // Approve report
  const handleApprove = async (reportId: string) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'approved',
          manager_notes: managerNotes,
          rejection_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({ title: 'Report Approved', description: 'The report has been approved successfully' });
      await fetchReports();
      setSelectedReport(null);
      setManagerNotes('');
    } catch (error: unknown) {
      console.error('Approve error:', error);
      toast({ title: 'Error', description: 'Failed to approve report', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Reject report
  const handleReject = async (reportId: string) => {
    if (!managerNotes.trim()) {
      toast({ title: 'Notes Required', description: 'Please provide notes for rejection', variant: 'destructive' });
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'rejected',
          rejection_message: managerNotes,
          manager_notes: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({ title: 'Report Rejected', description: 'The report has been rejected' });
      await fetchReports();
      setSelectedReport(null);
      setManagerNotes('');
    } catch (error: unknown) {
      console.error('Reject error:', error);
      toast({ title: 'Error', description: 'Failed to reject report', variant: 'destructive' });
    } finally {
      setActionLoading(false);
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

    // Create and style the worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');

    // Set column widths
    const colWidths = [
      { wch: 25 }, // Title
      { wch: 35 }, // Description
      { wch: 20 }, // User Name
      { wch: 25 }, // User Email
      { wch: 25 }, // Center Address
      { wch: 15 }, // Registrar
      { wch: 15 }, // Mobile Number
      { wch: 12 }, // Amount
      { wch: 10 }, // Status
      { wch: 25 }, // Manager Notes
      { wch: 25 }, // Rejection Message
      { wch: 20 }, // Created Date
      { wch: 20 }  // Updated Date
    ];
    ws['!cols'] = colWidths;
    
    // Add header styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'EFEFEF' } },
        alignment: { horizontal: 'center' }
      };
    }

    try {
      XLSX.writeFile(wb, `${filename}.xlsx`);
      
      toast({
        title: "Export completed",
        description: `Successfully exported ${dataToExport.length} reports to ${filename}.xlsx`,
        variant: "default"
      });
    } catch (error: unknown) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: (error as Error).message || "Failed to export reports to Excel",
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
        report.user_id?.toLowerCase().includes(searchLower) ||
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

  const handleDownloadReport = async (reportUrl: string, reportTitle: string) => {
    try {
      await downloadFileFromStorage('report-attachments', reportUrl, reportTitle || undefined);
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error: unknown) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: (error as Error).message || "Failed to download report.",
        variant: "destructive"
      });
    }
  };
 
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getThumbnailGradient = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-gradient-to-br from-green-500 to-emerald-600';
      case 'rejected':
        return 'bg-gradient-to-br from-red-500 to-rose-600';
      case 'pending':
        return 'bg-gradient-to-br from-yellow-500 to-amber-600';
      default:
        return 'bg-gradient-to-br from-blue-500 to-cyan-600';
    }
  };

  const getAmountGradient = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-gradient-to-br from-green-500 to-emerald-600';
      case 'rejected':
        return 'bg-gradient-to-br from-red-500 to-rose-600';
      case 'pending':
        return 'bg-gradient-to-br from-yellow-500 to-amber-600';
      default:
        return 'bg-gradient-to-br from-blue-500 to-cyan-600';
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

  return (
    <Layout role={role}>
      <div className={cn("container max-w-7xl mx-auto px-4 py-6 space-y-8", isMobile && "pb-20")}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Reports Management</h2>
              <p className="text-muted-foreground">
                Review and manage submitted reports
              </p>
            </div>
            <Button onClick={fetchReports} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <GlassCard className="p-6">
          <div className="space-y-6">
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
            

            <div className="text-sm text-muted-foreground">
              Showing {filteredReports.length} of {reports.length} reports
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center items-center min-h-[200px]"
                >
                  <RefreshCw className="h-8 w-8 animate-spin opacity-50" />
                </motion.div>
              ) : filteredReports.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center min-h-[200px] text-center"
                >
                  <FileText className="h-12 w-12 opacity-50 mb-4" />
                  <p className="text-muted-foreground">
                    {reports.length === 0 ? 'No reports found' : 'No reports match the current filters'}
                  </p>
                </motion.div>
              ) : isMobile ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredReports.map((report) => (
                      <Card key={report.id} className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center gap-2 pb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{report.profiles?.full_name?.[0] || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold line-clamp-1 break-words">{report.title}</CardTitle>
                            <div className="text-xs text-muted-foreground line-clamp-1">{report.profiles?.full_name || "Unknown"}</div>
                          </div>
                          {getStatusIcon(report.status)}
                        </CardHeader>
                        <CardContent className="flex-1 py-2 overflow-hidden">
                          <div className="text-sm line-clamp-2 mb-2 break-words overflow-hidden">{report.description}</div>
                          <div className="text-xs text-muted-foreground">Amount: ₹{report.amount?.toLocaleString()}</div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-2">
                          {report.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1 w-full sm:w-auto bg-success hover:bg-success/90"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setManagerNotes(report.manager_notes || '');
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1 w-full sm:w-auto"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setManagerNotes(report.rejection_message || '');
                                }}
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Status: {getStatusBadge(report.status)}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReport(report.attachment_url, report.title)}
                            disabled={!report.attachment_url}
                            className="w-full sm:w-auto"
                          >
                            <Download className="h-4 w-4 mr-1" /> Download
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Registrar</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 opacity-50" />
                                <span className="font-medium">{report.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{report.profiles?.full_name?.[0] || "U"}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium line-clamp-1">{report.profiles?.full_name || "Unknown"}</div>
                                  <div className="text-xs text-muted-foreground">{report.profiles?.registrar}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{report.profiles?.registrar || '-'}</TableCell>
                            <TableCell>₹{report.amount?.toLocaleString()}</TableCell>
                            <TableCell>{getStatusIcon(report.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(report.created_at), 'MMM dd, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {report.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-success hover:bg-success/90"
                                      onClick={() => {
                                        setSelectedReport(report);
                                        setManagerNotes(report.manager_notes || '');
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">Approve</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setSelectedReport(report);
                                        setManagerNotes(report.rejection_message || '');
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">Reject</span>
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadReport(report.attachment_url, report.title)}
                                  disabled={!report.attachment_url}
                                  title="Download Report"
                                  aria-label={`Download report ${report.title}`}
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-2">Download</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </div>
      {/* Approve/Reject Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="text-sm">{selectedReport?.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Amount</Label>
                <p className="text-sm">₹{selectedReport?.amount?.toLocaleString()}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm break-words whitespace-pre-wrap">{selectedReport?.description}</p>
            </div>
            <div>
              <Label htmlFor="manager-notes" className="text-sm font-medium">
                Manager Notes {selectedReport?.status === 'pending' && '(Required for rejection)'}
              </Label>
              <Textarea
                id="manager-notes"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Add notes for approval/rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReport(null);
                setManagerNotes('');
              }}
              disabled={actionLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            {selectedReport?.status === 'pending' && (
              <>
                <Button
                  onClick={() => selectedReport && handleApprove(selectedReport.id)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto bg-success hover:bg-success/90"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedReport && handleReject(selectedReport.id)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Rejecting...' : 'Reject'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
