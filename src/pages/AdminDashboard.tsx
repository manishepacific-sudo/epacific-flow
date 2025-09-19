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
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                Admin Dashboard 🚀
              </h1>
              <p className="text-muted-foreground">
                Manage your organization's reports, payments, and user activities.
              </p>
            </div>
            <Button variant="hero" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </div>
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
              <GlassCard className="hover-glow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.trend}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
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
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Pending Approvals</h2>
              <Badge variant="secondary" className="bg-warning/20 text-warning">
                {stats.pendingApprovals} items
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 glass-button rounded-xl">
                <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{pendingReports.length}</p>
                <p className="text-sm text-muted-foreground">Reports</p>
              </div>
              <div className="text-center p-4 glass-button rounded-xl">
                <CreditCard className="h-8 w-8 text-warning mx-auto mb-2" />
                <p className="text-2xl font-bold">{pendingPayments.length}</p>
                <p className="text-sm text-muted-foreground">Payments</p>
              </div>
              <div className="text-center p-4 glass-button rounded-xl">
                <Camera className="h-8 w-8 text-secondary mx-auto mb-2" />
                <p className="text-2xl font-bold">{pendingAttendance.length}</p>
                <p className="text-sm text-muted-foreground">Attendance</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Users</h3>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 glass-button rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {user.fullName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={
                        user.role === 'admin' ? 'bg-primary/20 text-primary' :
                        user.role === 'manager' ? 'bg-secondary/20 text-secondary' :
                        'bg-muted/20 text-muted-foreground'
                      }
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
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-success" />
                <h3 className="text-lg font-semibold">System Health</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Server Status</span>
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Database Health</span>
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Storage Usage</span>
                    <AlertCircle className="h-4 w-4 text-warning" />
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
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Users className="h-5 w-5" />
                Manage Users
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <FileText className="h-5 w-5" />
                Review Reports
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <CreditCard className="h-5 w-5" />
                Process Payments
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <BarChart3 className="h-5 w-5" />
                View Analytics
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}