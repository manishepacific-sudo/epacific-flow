import { useState, useEffect, useCallback } from "react";
import { CreditCard, CheckCircle2, XCircle, Clock, Eye, Download, Edit, User, Building, Calendar, RefreshCw } from "lucide-react";
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
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(proofPath, 300);
      
      if (error) throw error;
      
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = `payment-proof-${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Payment proof is being downloaded.",
      });
    } catch (error: unknown) {
      const err = error as Error;
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
      const matchesSearch = (
        payment.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        payment.profiles?.email?.toLowerCase().includes(searchLower) ||
        payment.profiles?.mobile_number?.includes(searchValue) ||
        payment.profiles?.center_address?.toLowerCase().includes(searchLower) ||
        payment.profiles?.registrar?.toLowerCase().includes(searchLower) ||
        payment.method?.toLowerCase().includes(searchLower) ||
        payment.phonepe_transaction_id?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status !== 'all' && payment.status !== filters.status) return false;
    if (filters.approval !== 'all' && payment.status !== filters.approval) return false;

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

  return (
    <Layout role={role as 'admin' | 'manager' | 'user'}>
      <div className={cn("space-y-6", isMobile && "pb-20")}>
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Payments Management</h2>
          <p className="text-muted-foreground">Review and approve payment submissions</p>
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
                          <p className="text-xs text-white/80 font-medium">Amount</p>
                          <p className="text-2xl font-bold text-white">₹{payment.amount?.toLocaleString()}</p>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
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
                          
                          <div className="flex items-center gap-2">
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
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Registrar</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className={cn("h-8 w-8", getAmountGradient(payment.status))}>
                              <AvatarFallback className="text-white text-sm font-bold">
                                {payment.profiles?.full_name ? getInitials(payment.profiles.full_name) : <User className="h-4 w-4 text-white" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{payment.profiles?.full_name || 'Unknown User'}</p>
                              <p className="text-sm text-muted-foreground truncate">{payment.profiles?.email || `ID: ${payment.id.slice(0, 8)}...`}</p>
                              {payment.profiles?.mobile_number && (
                                <p className="text-xs text-muted-foreground truncate">{payment.profiles.mobile_number}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={cn("px-3 py-1.5 rounded-lg inline-flex items-center gap-2", getAmountGradient(payment.status))}>
                            <CreditCard className="h-4 w-4 text-white" />
                            <span className="font-medium text-white">₹{payment.amount?.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{payment.method}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{payment.phonepe_transaction_id || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {payment.profiles?.registrar || '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {payment.proof_url ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => viewProof(payment.proof_url)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadProof(payment.proof_url, payment.id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button variant="ghost" size="icon" disabled>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {role === 'admin' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPayment(payment.id, payment.admin_notes)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {payment.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePaymentAction(payment.id, 'approved')}
                                  disabled={processingPayments.has(payment.id)}
                                  className="text-success"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const notes = prompt("Rejection reason (optional):");
                                    handlePaymentAction(payment.id, 'rejected', notes || undefined);
                                  }}
                                  disabled={processingPayments.has(payment.id)}
                                  className="text-destructive"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
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