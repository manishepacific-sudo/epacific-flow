import { useState, useEffect, useCallback } from "react";
import { CreditCard, CheckCircle2, XCircle, Clock, Eye, Download, Edit, User, Building, Calendar, RefreshCw, AlertCircle, ShieldAlert, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { downloadFileFromStorage } from "@/utils/fileDownload";
import * as XLSX from 'xlsx';

interface Payment {
  id: string;
  amount: number;
  method: string;
  proof_url: string;
  status: string;
  phonepe_transaction_id?: string;
  updated_at: string;
  created_at: string;
  user_id: string;
  rejection_message?: string;
  admin_notes?: string;
  profiles?: {
    full_name: string;
    email: string;
    mobile_number: string;
    center_address: string;
    registrar: string;
  } | null;
}

export default function PaymentsManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const role = profile?.role as 'admin' | 'manager';
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
    
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: payments, error } = await supabase
        .from('payments')
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

      if (error) throw error;

      setPayments(payments || []);
    } catch (error: unknown) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error loading payments",
        description: (error as Error).message || "Failed to load payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  const isMobile = useIsMobile();
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    registrar: 'all',
    status: 'all',
    approval: 'all',
    method: 'all',
    dateRange: { from: null as Date | null, to: null as Date | null },
    useReportDate: false
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
      },
      {
        key: 'method',
        label: 'Method',
        options: [
          { value: 'offline', label: 'Offline' },
          { value: 'razorpay', label: 'Razorpay' },
          { value: 'phonepe', label: 'PhonePe' }
        ]
      }
    ]
  };



  const handlePaymentAction = async (paymentId: string, action: 'approved' | 'rejected', notes?: string) => {
    if (processingPayments.has(paymentId)) return;

    setProcessingPayments(prev => new Set([...prev, paymentId]));

    try {
      type UpdateData = {
        status: string;
        rejection_message?: string | null;
      };

      const updateData: UpdateData = { status: action };
      if (action === 'rejected') {
        updateData.rejection_message = notes || null;
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: `Payment ${action}`,
        description: `Payment has been ${action} successfully.`,
        variant: action === 'approved' ? 'default' : 'destructive'
      });

      fetchPayments();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Payment action error:', error);
      toast({
        title: "Action failed",
        description: error.message || `Failed to ${action} payment`,
        variant: "destructive"
      });
    } finally {
      setProcessingPayments(prev => {
        const next = new Set(prev);
        next.delete(paymentId);
        return next;
      });
    }
  };

  const handleDownloadProof = async (proofPath: string, paymentId: string) => {
    try {
      await downloadFileFromStorage('payment-proofs', proofPath, `payment-proof-${paymentId}`);
      toast({
        title: "Success",
        description: "Payment proof downloaded successfully.",
      });
    } catch (err: any) {
      console.error('Download error:', err);
      toast({
        title: "Download failed",
        description: err.message || "Unable to download payment proof.",
        variant: "destructive"
      });
    }
  };

  const handleEditPayment = async (paymentId: string, currentNotes?: string) => {
    const notes = prompt("Edit admin notes:", currentNotes || "");
    if (notes === null) return;
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({ admin_notes: notes })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      toast({
        title: "Notes updated",
        description: "Payment notes have been updated successfully.",
      });
      
      fetchPayments();
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Edit error:', err);
      toast({
        title: "Update failed",
        description: err.message || "Failed to update payment notes.",
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

  // Generate unique avatar background color based on user name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500', 
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
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

  const getAmountBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getMethodPillClass = (method: string) => {
    switch (method) {
      case 'razorpay':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'phonepe':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'offline':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getAmountPillClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700';
      case 'rejected':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  };

  const viewProof = async (proofPath: string) => {
    try {
      // First try to create a signed URL directly
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(proofPath, 300); // 5 minutes

      if (error) {
        // If error is "not found", provide a specific message
        if (error.message?.includes('not found') || error.message?.includes('Object not found')) {
          toast({
            title: "File not found",
            description: "The payment proof file no longer exists or has been moved. Please contact support if this file is needed.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      // Open the file in a new tab
      window.open(data.signedUrl, '_blank');
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('View proof error:', err);
      toast({
        title: "View failed",
        description: "Unable to view the payment proof. Please try again or contact support if the issue persists.",
        variant: "destructive"
      });
    }
  };

  const filteredPayments = payments.filter(payment => {
    // Search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const amountStr = (payment.amount ?? 0).toLocaleString().toLowerCase();
      const dateStr = format(new Date(payment.created_at), 'MMM dd, yyyy').toLowerCase();
      const matchesSearch = (
        payment.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        payment.profiles?.email?.toLowerCase().includes(searchLower) ||
        payment.profiles?.mobile_number?.includes(searchValue) ||
        payment.profiles?.center_address?.toLowerCase().includes(searchLower) ||
        payment.profiles?.registrar?.toLowerCase().includes(searchLower) ||
        payment.method?.toLowerCase().includes(searchLower) ||
        payment.phonepe_transaction_id?.toLowerCase().includes(searchLower) ||
        amountStr.includes(searchLower) ||
        dateStr.includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status !== 'all' && payment.status !== filters.status) return false;
    if (filters.approval !== 'all' && payment.status !== filters.approval) return false;
    if (filters.method !== 'all' && payment.method !== filters.method) return false;

    // Registrar filter
    if (filters.registrar !== 'all' && payment.profiles?.registrar !== filters.registrar) return false;

    // Date range filter
    if (filters.dateRange.from) {
      const paymentDate = new Date(payment.created_at);
      if (paymentDate < filters.dateRange.from) return false;
      if (filters.dateRange.to && paymentDate > filters.dateRange.to) return false;
    }

    return true;
  });

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const exportToExcel = (type: 'all' | 'filtered' | 'active' | 'inactive' | 'date-range') => {
    let dataToExport: Payment[] = [];
    let filename = 'payments-export';

    switch (type) {
      case 'all':
        dataToExport = payments;
        filename = 'all-payments';
        break;
      case 'filtered':
        dataToExport = filteredPayments;
        filename = 'filtered-payments';
        break;
      case 'active':
        dataToExport = payments.filter(p => p.status === 'approved');
        filename = 'approved-payments';
        break;
      case 'inactive':
        dataToExport = payments.filter(p => p.status === 'rejected');
        filename = 'rejected-payments';
        break;
      case 'date-range':
        dataToExport = filteredPayments;
        filename = 'date-range-payments';
        break;
    }

    const excelData = dataToExport.map(payment => ({
      'User Name': payment.profiles?.full_name || 'N/A',
      'User Email': payment.profiles?.email || 'N/A',
      'Registrar': payment.profiles?.registrar || 'N/A',
      'Amount': payment.amount,
      'Method': payment.method,
      'Status': payment.status,
      'Transaction ID': payment.phonepe_transaction_id || 'N/A',
      'Admin Notes': payment.admin_notes || 'N/A',
      'Rejection Message': payment.rejection_message || 'N/A',
      'Created Date': format(new Date(payment.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Updated Date': format(new Date(payment.updated_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');

    const colWidths = [
      { wch: 20 }, // User Name
      { wch: 25 }, // User Email
      { wch: 15 }, // Registrar
      { wch: 12 }, // Amount
      { wch: 15 }, // Method
      { wch: 10 }, // Status
      { wch: 20 }, // Transaction ID
      { wch: 20 }, // Admin Notes
      { wch: 20 }, // Rejection Message
      { wch: 20 }, // Created Date
      { wch: 20 }  // Updated Date
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    toast({
      title: "Export completed",
      description: `Exported ${dataToExport.length} payments to ${filename}.xlsx`,
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

  // Filter pending payments
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'rejected');

  return (
    <Layout role={role as 'admin' | 'manager' | 'user'}>
      <div className={cn("space-y-6", isMobile && "pb-20")}>
        {/* Header removed per spec: top navbar already shows title */}

        {/* Pending Payments Section */}
        {pendingPayments.length > 0 && (
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <h3 className="text-xl font-bold">Pending Payments</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPayments}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingPayments.map((payment) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className={cn(
                        "relative cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2",
                        payment.status === 'pending' && "border-warning/30 hover:border-warning",
                        payment.status === 'rejected' && "border-destructive/30 hover:border-destructive"
                      )}
                      onClick={() => window.location.assign(`/payment-detail/${payment.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {payment.profiles?.full_name || 'Unknown User'}
                            </span>
                          </div>
                          {payment.status === 'pending' ? (
                            <Badge className="bg-warning/20 text-warning border-warning/30">
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Rejected
                            </Badge>
                          )}
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                          ₹{payment.amount?.toLocaleString()}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3 pt-0">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">File Name</p>
                          <p className="text-sm font-medium truncate">
                            {payment.proof_url?.split('/').pop() || 'No file attached'}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span className="capitalize">{payment.method}</span>
                          <span>{format(new Date(payment.created_at), 'MMM dd, yyyy')}</span>
                        </div>

                        {payment.rejection_message && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 mt-2">
                            <p className="text-xs text-destructive line-clamp-2">{payment.rejection_message}</p>
                          </div>
                        )}
                      </CardContent>

                      {/* Inline actions removed; whole card navigates to detail */}
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Search, Filter, Export */}
        <SearchFilterExport
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={filters}
          onFiltersChange={setFilters}
          filterConfig={filterConfig}
          onRefresh={fetchPayments}
          onExport={exportToExcel}
          exportOptions={{
            all: 'All Payments',
            filtered: 'Current Filter Results',
            active: 'Approved Payments',
            inactive: 'Rejected Payments',
            dateRange: 'Date Range Results'
          }}
          isLoading={loading}
        />

        {/* Payments Table */}
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Payments</h3>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredPayments.length} of {payments.length} payments
                </p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading payments...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {payments.length === 0 ? 'No payments found' : 'No payments match the current filters'}
                </p>
              </div>
            ) : isMobile ? (
              <motion.div
                className="grid grid-cols-1 gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.07
                    }
                  }
                }}
              >
                {filteredPayments.map((payment, index) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card variant="interactive" size="default" className="group relative overflow-hidden h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-4">
                          <Avatar className={cn("h-12 w-12", getAmountGradient(payment.status))}>
                            <AvatarFallback className="text-white text-lg font-bold">
                              {payment.profiles?.full_name ? getInitials(payment.profiles.full_name) : <User className="h-6 w-6 text-white" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-base font-semibold truncate">{payment.profiles?.full_name || 'Unknown User'}</p>
                            <p className="text-sm text-muted-foreground truncate">{payment.profiles?.email || `ID: ${payment.id.slice(0, 8)}...`}</p>
                            {payment.profiles?.mobile_number && (
                              <p className="text-xs text-muted-foreground truncate">{payment.profiles.mobile_number}</p>
                            )}
                          </div>
                          <div className="absolute top-4 right-4">
                            {getStatusBadge(payment.status)}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <div className={cn("rounded-xl p-4 text-center", getAmountGradient(payment.status))}>
                          <p className="text-[11px] text-white/80 font-medium tracking-wide">Amount</p>
                          <p className="text-xl sm:text-2xl font-bold text-white leading-tight">₹{payment.amount?.toLocaleString()}</p>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-[13px]">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Method:</span>
                            <Badge variant="outline" className="capitalize ml-auto">{payment.method}</Badge>
                          </div>
                          
                          {payment.phonepe_transaction_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Transaction ID:</span>
                              <span className="font-mono text-xs ml-auto">{payment.phonepe_transaction_id}</span>
                            </div>
                          )}
                          
                          {payment.profiles?.registrar && (
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Registrar:</span>
                              <span className="ml-auto">{payment.profiles.registrar}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-[13px]">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Submitted:</span>
                            <span className="ml-auto">{format(new Date(payment.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>

                        {payment.admin_notes && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Admin Notes:</p>
                            <p className="text-sm">{payment.admin_notes}</p>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="flex-wrap gap-2 pt-4 border-t">
                        {payment.proof_url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewProof(payment.proof_url)}
                            className="flex-1"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" disabled className="flex-1">
                            <Eye className="h-3 w-3 mr-1" />
                            No Proof
                          </Button>
                        )}
                        
                        {payment.proof_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadProof(payment.proof_url, payment.id)}
                            className="flex-1"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                        
                        {role === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPayment(payment.id, payment.admin_notes)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        
                        {payment.status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handlePaymentAction(payment.id, 'approved')}
                              disabled={processingPayments.has(payment.id)}
                              className="flex-1"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {processingPayments.has(payment.id) ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const notes = prompt("Rejection reason (optional):");
                                handlePaymentAction(payment.id, 'rejected', notes || undefined);
                              }}
                              disabled={processingPayments.has(payment.id)}
                              className="flex-1"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase text-[11px] tracking-wide text-muted-foreground">User</TableHead>
                      <TableHead className="uppercase text-[11px] tracking-wide text-muted-foreground">Amount</TableHead>
                      <TableHead className="uppercase text-[11px] tracking-wide text-muted-foreground">Method</TableHead>
                      <TableHead className="uppercase text-[11px] tracking-wide text-muted-foreground">Transaction ID</TableHead>
                      <TableHead className="uppercase text-[11px] tracking-wide text-muted-foreground">Registrar</TableHead>
                      <TableHead className="uppercase text-[11px] tracking-wide text-muted-foreground">Date</TableHead>
                      <TableHead className="uppercase text-[11px] tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="uppercase text-[11px] tracking-wide text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow 
                        key={payment.id} 
                        className="cursor-pointer hover:bg-muted/30 transition-colors border-b last:border-b-0"
                        onClick={() => window.location.assign(`/payment-detail/${payment.id}`)}
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className={cn("h-10 w-10", getAvatarColor(payment.profiles?.full_name || 'Unknown'))}>
                              <AvatarFallback className="text-white text-sm font-semibold">
                                {payment.profiles?.full_name ? getInitials(payment.profiles.full_name) : <User className="h-5 w-5 text-white" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {payment.profiles?.full_name || 'Unknown User'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {payment.profiles?.email || `ID: ${payment.id.slice(0, 8)}...`}
                              </p>
                              {payment.profiles?.mobile_number && (
                                <p className="text-xs text-muted-foreground truncate">
                                  +{payment.profiles.mobile_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-sm",
                            payment.status === 'approved' && 'bg-green-50 text-green-700',
                            payment.status === 'rejected' && 'bg-red-50 text-red-700',
                            payment.status === 'pending' && 'bg-gray-50 text-gray-700'
                          )}>
                            <CreditCard className="h-4 w-4" />
                            <span>${payment.amount?.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 capitalize text-xs font-medium text-gray-700">
                            {payment.method}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-mono text-xs text-foreground">
                            {payment.phonepe_transaction_id || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-sm text-foreground">
                          {payment.profiles?.registrar || '-'}
                        </TableCell>
                        <TableCell className="py-4 text-sm text-foreground">
                          {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={cn(
                            "inline-block px-3 py-1 rounded-md text-xs font-medium",
                            payment.status === 'approved' && 'bg-green-50 text-green-700',
                            payment.status === 'rejected' && 'bg-red-50 text-red-700',
                            payment.status === 'pending' && 'bg-gray-50 text-gray-700'
                          )}>
                            {payment.status === 'approved' ? 'Approved' : payment.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <button
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium inline-flex items-center gap-1"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              window.location.assign(`/payment-detail/${payment.id}`); 
                            }}
                          >
                            View details ›
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}