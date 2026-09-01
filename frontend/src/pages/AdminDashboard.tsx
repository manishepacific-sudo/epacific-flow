import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  FileText, 
  CreditCard, 
  DollarSign,
  Clock,
  BarChart3,
  UserPlus,
  Download,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useDashboardStats, useDashboardUsers, useDashboardReports, useDashboardPayments } from "@/hooks/useDashboardData";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar
} from "recharts";

const ITEMS_PER_PAGE = 20;

const generateMonthlyData = (reports: any[], payments: any[]) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, index) => {
    const baseReports = Math.floor(reports.length / 6);
    const baseRevenue = Math.floor(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) / 6);
    
    return {
      month,
      reports: baseReports + index * 2,
      revenue: baseRevenue + index * 1000
    };
  });
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [usersPage, setUsersPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);

  const statsQuery = useDashboardStats();
  const usersQuery = useDashboardUsers({ 
    limit: ITEMS_PER_PAGE, 
    offset: (usersPage - 1) * ITEMS_PER_PAGE 
  });
  const reportsQuery = useDashboardReports({ 
    limit: ITEMS_PER_PAGE, 
    offset: (reportsPage - 1) * ITEMS_PER_PAGE 
  });
  const paymentsQuery = useDashboardPayments({ 
    limit: ITEMS_PER_PAGE, 
    offset: (paymentsPage - 1) * ITEMS_PER_PAGE 
  });

  const isLoading = statsQuery.isLoading || usersQuery.isLoading || reportsQuery.isLoading || paymentsQuery.isLoading;
  const stats = statsQuery.data || { totalUsers: 0, totalReports: 0, pendingApprovals: 0, totalRevenue: 0 };
  const users = usersQuery.data || [];
  const reports = reportsQuery.data || [];
  const payments = paymentsQuery.data || [];
  const analyticsData = useMemo(() => {
    return generateMonthlyData(reports, payments);
  }, [reports, payments]);

  const downloadFile = async (url: string, filename?: string) => {
    try {
      const { data, error } = await supabase.storage.from('report-attachments').download(url);
      if (error) throw error;
      
      let contentType = data.type;
      if (filename?.toLowerCase().endsWith('.html') || url.toLowerCase().includes('.html')) {
        contentType = 'application/octet-stream';
      }
      
      const blob = new Blob([data], { type: contentType });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      toast({ title: "File downloaded successfully" });
    } catch (error: any) {
      toast({ 
        title: "Download failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const dashboardCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      trend: "+12% from last month",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Reports",
      value: stats.totalReports,
      icon: FileText,
      trend: "+8% from last month",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Clock,
      trend: "Requires attention",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: "+15% from last month",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  if (isLoading) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Overview of system activity and user management</p>
            </div>
          </div>
        </motion.div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Reports</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="reports" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Revenue</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.trend}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Recent Users */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
                <Button variant="outline" size="sm">View All</Button>
              </div>
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No users found</div>
                ) : (
                  users.slice(0, 3).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{user.full_name?.charAt(0) || 'U'}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Recent Reports */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
                <Button variant="outline" size="sm">View All</Button>
              </div>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No reports found</div>
                ) : (
                  reports.slice(0, 3).map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{report.title}</p>
                          <p className="text-xs text-muted-foreground">₹{Number(report.amount || 0).toLocaleString()} • {new Date(report.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.attachment_url && (
                          <Button size="sm" variant="ghost" onClick={() => downloadFile(report.attachment_url, `report-${report.id}.pdf`)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        <Badge variant={report.status === 'approved' ? 'default' : 'secondary'} className="text-xs">{report.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start gap-2 h-12">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-12">
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-12">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
