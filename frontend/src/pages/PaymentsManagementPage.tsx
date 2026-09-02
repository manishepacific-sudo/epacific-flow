import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, XCircle, Clock, Eye, ChevronLeft, ChevronRight } from "lucide-react";
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
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('payments')
        .select(`*,
          profiles (full_name, email, mobile_number, center_address, registrar)
        `)
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      setPayments(fallbackData || []);
    } catch (error: any) {
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
      const { error } = await supabase.from('payments').update(updateData).eq('id', paymentId);
      if (error) throw error;
      toast({
        title: `Payment ${action}`,
        description: `Payment has been ${action} successfully.`,
        variant: action === 'approved' ? 'default' : 'destructive'
      });
      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Action failed",
        description: error.message,
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
      const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(proofPath, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({ title: "View failed", variant: "destructive" });
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = (
        payment.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        payment.profiles?.email?.toLowerCase().includes(searchLower) ||
        payment.method?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }
    if (filters.status !== 'all' && payment.status !== filters.status) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
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
          <h2 className="text-2xl font-bold">Payments Management</h2>
          <p className="text-muted-foreground">Review and approve payment submissions</p>
        </div>

        <SearchFilterExport
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={filters}
          onFiltersChange={setFilters}
          filterConfig={filterConfig}
          onRefresh={fetchPayments}
          isLoading={loading}
        />

        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Payments</h3>
                <p className="text-sm text-muted-foreground">Showing {paginatedPayments.length} of {filteredPayments.length} payments</p>
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
                <p className="text-muted-foreground">No payments found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto mb-4">
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
                      {paginatedPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{payment.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell><span className="font-medium">₹{payment.amount?.toLocaleString()}</span></TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{payment.method}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell><span className="text-sm font-mono">{payment.phonepe_transaction_id || 'N/A'}</span></TableCell>
                          <TableCell><span className="text-sm">{format(new Date(payment.created_at), 'MMM dd, yyyy')}</span></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {payment.proof_url ? (
                                <Button variant="ghost" size="sm" onClick={() => viewProof(payment.proof_url)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">No proof</span>
                              )}
                              {payment.status === 'pending' && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handlePaymentAction(payment.id, 'approved')} disabled={processingPayments.has(payment.id)}>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handlePaymentAction(payment.id, 'rejected')} disabled={processingPayments.has(payment.id)}>
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
