import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
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

interface Payment {
  id: string;
  amount: number;
  method: string;
  proof_url: string;
  status: string;
  created_at: string;
  user_id: string;
  report_id: string;
  admin_notes?: string;
  rejection_message?: string;
  phonepe_transaction_id?: string;
  updated_at: string;
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
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Try edge function first
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('get-payments', {
        body: { admin_email: profile?.email }
      });

      let paymentsData;
      if (edgeError) {
        // Fallback to direct query with profiles relationship
        const { data: fallbackData, error: fallbackError } = await supabase
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

        if (fallbackError) {
          // If profiles relationship still fails, fetch payments only
          const { data: paymentsOnly, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (paymentsError) throw paymentsError;
          paymentsData = paymentsOnly || [];
        } else {
          paymentsData = fallbackData || [];
        }
      } else {
        paymentsData = edgeData?.payments || [];
      }

      setPayments(paymentsData);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error loading payments",
        description: error.message || "Failed to load payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (paymentId: string, action: 'approved' | 'rejected', notes?: string) => {
    setProcessingPayments(prev => new Set(prev).add(paymentId));
    
    try {
      const updateData: any = { status: action };
      if (notes && action === 'rejected') {
        updateData.admin_notes = notes;
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
    } catch (error: any) {
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

  const viewProof = async (proofPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(proofPath, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: "View failed",
        description: "Failed to view proof",
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
    <Layout role={role}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Payments Management</h2>
          <p className="text-muted-foreground">Review and approve payment submissions</p>
        </div>

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
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {payment.profiles?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {payment.profiles?.email || `User ID: ${payment.user_id.slice(0, 8)}...`}
                            </p>
                            {payment.profiles?.registrar && (
                              <p className="text-xs text-muted-foreground">Registrar: {payment.profiles.registrar}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">₹{payment.amount?.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {payment.method}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">
                            {payment.phonepe_transaction_id || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {payment.proof_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewProof(payment.proof_url)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {payment.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePaymentAction(payment.id, 'approved')}
                                  disabled={processingPayments.has(payment.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    const notes = prompt("Rejection reason (optional):");
                                    handlePaymentAction(payment.id, 'rejected', notes || undefined);
                                  }}
                                  disabled={processingPayments.has(payment.id)}
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