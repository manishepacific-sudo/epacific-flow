import { motion } from "framer-motion";
import { 
  Users, 
  FileText, 
  CreditCard, 
  Camera,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  UserPlus
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockDashboardStats, mockUsers, mockReports, mockPayments, mockAttendance } from "@/utils/mockData";

export default function AdminDashboard() {
  const stats = mockDashboardStats.admin;

  const dashboardCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      trend: "+3 this month",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Reports",
      value: stats.totalReports,
      icon: FileText,
      trend: "+12 this month",
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
      icon: TrendingUp,
      trend: "+25% from last month",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const recentUsers = mockUsers.slice(-3);
  const pendingReports = mockReports.filter(r => r.status === 'pending');
  const pendingPayments = mockPayments.filter(p => p.status === 'pending');
  const pendingAttendance = mockAttendance.filter(a => a.status === 'pending');

  return (
    <Layout role="admin">
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
                Admin Dashboard 🚀
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage your organization's reports, payments, and user activities.
              </p>
            </div>
            <Button variant="hero" className="gap-2 w-full sm:w-auto text-sm">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </div>
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
                  <div className={`p-2 sm:p-3 rounded-xl ${card.bgColor} flex-shrink-0`}>
                    <card.icon className={`h-4 w-4 sm:h-6 sm:w-6 ${card.color}`} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Pending Approvals Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
              <h2 className="text-lg sm:text-xl font-semibold">Pending Approvals</h2>
              <Badge variant="secondary" className="bg-warning/20 text-warning text-xs">
                {stats.pendingApprovals} items
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              <div className="text-center p-3 sm:p-4 glass-button rounded-xl">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
                <p className="text-lg sm:text-2xl font-bold">{pendingReports.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Reports</p>
              </div>
              <div className="text-center p-3 sm:p-4 glass-button rounded-xl">
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-warning mx-auto mb-2" />
                <p className="text-lg sm:text-2xl font-bold">{pendingPayments.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Payments</p>
              </div>
              <div className="text-center p-3 sm:p-4 glass-button rounded-xl">
                <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-secondary mx-auto mb-2" />
                <p className="text-lg sm:text-2xl font-bold">{pendingAttendance.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Attendance</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8">
          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold">Recent Users</h3>
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">
                          {user.fullName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={`text-xs flex-shrink-0 ${
                        user.role === 'admin' ? 'bg-primary/20 text-primary' :
                        user.role === 'manager' ? 'bg-secondary/20 text-secondary' :
                        'bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                <h3 className="text-base sm:text-lg font-semibold">System Health</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Server Status</span>
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Database Health</span>
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Storage Usage</span>
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Button variant="outline" className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Manage Users
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs sm:text-sm">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Review Reports
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs sm:text-sm">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                Process Payments
              </Button>
              <Button variant="outline" className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                View Analytics
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}