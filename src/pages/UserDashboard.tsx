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
import { useNavigate } from "react-router-dom";
import { mockDashboardStats, mockReports, mockPayments, mockAttendance } from "@/utils/mockData";

export default function UserDashboard() {
  const navigate = useNavigate();
  const stats = mockDashboardStats.user;
  
  const userReports = mockReports.filter(r => r.userId === "1");
  const userPayments = mockPayments.filter(p => p.userId === "1");

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
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Good morning, John! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your account today.
          </p>
        </motion.div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="hover-glow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-2xl font-bold mb-1">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.trend}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-accent ${card.color}`}>
                    <card.icon className="h-5 w-5" />
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
          <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <GlassCard 
                  className="hover-glow cursor-pointer text-center p-6 transition-all duration-300"
                  onClick={action.action}
                >
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Reports</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {userReports.slice(0, 3).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{report.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.reportDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">₹{report.amount.toLocaleString()}</span>
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
            transition={{ delay: 0.7 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Payment Status</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/payments")}>
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {userPayments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-warning" />
                      <div>
                        <p className="font-medium text-sm capitalize">{payment.method} Payment</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">₹{payment.amount.toLocaleString()}</span>
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
          transition={{ delay: 0.8 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Monthly Attendance Progress</h3>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">
                  {stats.attendanceThisMonth}/20 days
                </span>
              </div>
            </div>
            <Progress 
              value={(stats.attendanceThisMonth / 20) * 100} 
              className="h-3 mb-2"
            />
            <p className="text-sm text-muted-foreground">
              {20 - stats.attendanceThisMonth} days remaining this month
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}