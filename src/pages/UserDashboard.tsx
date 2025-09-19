import { motion } from "framer-motion";
import { 
  FileText, 
  CreditCard, 
  Camera, 
  TrendingUp,
  Clock,
  CheckCircle,
  Upload,
  Calendar
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ReportFlow } from "@/components/ReportFlow";
import { useNavigate } from "react-router-dom";
import { mockDashboardStats, mockReports, mockPayments, mockAttendance } from "@/utils/mockData";

export default function UserDashboard() {
  const navigate = useNavigate();
  const stats = mockDashboardStats.user;
  
  const userReports = mockReports.filter(r => r.userId === "1");
  const userPayments = mockPayments.filter(p => p.userId === "1");
  const userAttendance = mockAttendance.filter(a => a.userId === "1");

  const quickActions = [
    {
      icon: Upload,
      title: "Upload Report",
      description: "Submit your monthly report",
      action: () => navigate("/upload/report"),
      color: "bg-primary",
    },
    {
      icon: Camera,
      title: "Mark Attendance",
      description: "Upload today's attendance photo",
      action: () => navigate("/attendance"),
      color: "bg-secondary",
    },
    {
      icon: CreditCard,
      title: "View Payments",
      description: "Check payment status",
      action: () => navigate("/payments"),
      color: "bg-warning",
    },
  ];

  const dashboardCards = [
    {
      title: "Total Reports",
      value: stats.totalReports,
      icon: FileText,
      trend: "+2 this month",
      color: "text-primary",
    },
    {
      title: "Pending Payments",
      value: stats.pendingPayments,
      icon: Clock,
      trend: "Awaiting approval",
      color: "text-warning",
    },
    {
      title: "Monthly Attendance",
      value: stats.attendanceThisMonth,
      icon: Calendar,
      trend: `${Math.round((stats.attendanceThisMonth / 20) * 100)}% this month`,
      color: "text-secondary",
    },
    {
      title: "Total Earnings",
      value: `₹${stats.totalEarnings.toLocaleString()}`,
      icon: TrendingUp,
      trend: "+15% from last month",
      color: "text-success",
    },
  ];

  return (
    <Layout role="user">
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            Good morning, John! 👋
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Here's what's happening with your account today.
          </p>
        </motion.div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="hover-glow p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{card.title}</p>
                    <p className="text-lg sm:text-2xl font-bold truncate">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{card.trend}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-accent ${card.color} flex-shrink-0`}>
                    <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <GlassCard 
                  className="hover-glow cursor-pointer text-center p-4 sm:p-6"
                  onClick={action.action}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4`}>
                    <action.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">{action.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{action.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Report Upload and Processing Flow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Report Management</h2>
          <ReportFlow />
        </motion.div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8">
          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold">Recent Reports</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/reports")} className="text-xs sm:text-sm">
                  View All
                </Button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {userReports.slice(0, 3).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate">{report.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.reportDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium">₹{report.amount.toLocaleString()}</span>
                      <Badge 
                        variant={report.status === 'approved' ? 'default' : 'secondary'}
                        className={`text-xs ${report.status === 'approved' ? 'bg-success' : ''}`}
                      >
                        {report.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent Payments */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
          >
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold">Payment Status</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/payments")} className="text-xs sm:text-sm">
                  View All
                </Button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {userPayments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <CreditCard className="h-4 w-4 text-warning flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm capitalize truncate">{payment.method} Payment</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium">₹{payment.amount.toLocaleString()}</span>
                      <Badge 
                        variant={payment.status === 'approved' ? 'default' : 'secondary'}
                        className={`text-xs ${payment.status === 'approved' ? 'bg-success' : ''}`}
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Attendance Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <h3 className="text-base sm:text-lg font-semibold">Monthly Attendance Progress</h3>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {stats.attendanceThisMonth}/20 days
                </span>
              </div>
            </div>
            <Progress 
              value={(stats.attendanceThisMonth / 20) * 100} 
              className="h-3 mb-2"
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              {20 - stats.attendanceThisMonth} days remaining this month
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}