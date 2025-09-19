import { motion } from "framer-motion";
import { 
  FileText, 
  CreditCard, 
  Camera,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { mockDashboardStats, mockReports, mockPayments, mockAttendance } from "@/utils/mockData";

export default function ManagerDashboard() {
  const stats = mockDashboardStats.manager;

  const dashboardCards = [
    {
      title: "Pending Reports",
      value: stats.pendingReports,
      icon: FileText,
      trend: "Awaiting review",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Payments",
      value: stats.pendingPayments,
      icon: CreditCard,
      trend: "Need approval",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pending Attendance",
      value: stats.pendingAttendance,
      icon: Camera,
      trend: "To be verified",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Team Members",
      value: stats.teamMembers,
      icon: Users,
      trend: "Active users",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const pendingReports = mockReports.filter(r => r.status === 'pending');
  const pendingPayments = mockPayments.filter(p => p.status === 'pending');
  const pendingAttendance = mockAttendance.filter(a => a.status === 'pending');

  const handleApprove = (type: string, id: string) => {
    console.log(`Approving ${type} with id: ${id}`);
    // In real app, this would call an API
  };

  const handleReject = (type: string, id: string) => {
    console.log(`Rejecting ${type} with id: ${id}`);
    // In real app, this would call an API
  };

  return (
    <Layout role="manager">
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Manager Dashboard 👨‍💼
          </h1>
          <p className="text-muted-foreground">
            Review and approve pending reports, payments, and attendance records.
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

        {/* Approval Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Reports */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Pending Reports</h3>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {pendingReports.length}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {pendingReports.map((report) => (
                  <div key={report.id} className="p-4 glass-button rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">{report.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          By {report.user?.fullName} • {new Date(report.reportDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-medium text-primary mt-1">
                          ₹{report.amount.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-warning/20 text-warning">
                        Pending
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="success" 
                        className="flex-1"
                        onClick={() => handleApprove('report', report.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => handleReject('report', report.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Pending Payments */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-warning" />
                  <h3 className="text-lg font-semibold">Pending Payments</h3>
                </div>
                <Badge variant="secondary" className="bg-warning/20 text-warning">
                  {pendingPayments.length}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="p-4 glass-button rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm capitalize">{payment.method} Payment</p>
                        <p className="text-xs text-muted-foreground">
                          By {payment.user?.fullName} • {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-medium text-warning mt-1">
                          ₹{payment.amount.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-warning/20 text-warning">
                        Pending
                      </Badge>
                    </div>
                    
                    {payment.proofUrl && (
                      <div className="mb-3">
                        <Button variant="outline" size="sm" className="text-xs">
                          View Proof
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="success" 
                        className="flex-1"
                        onClick={() => handleApprove('payment', payment.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => handleReject('payment', payment.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Pending Attendance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-semibold">Pending Attendance</h3>
              </div>
              <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                {pendingAttendance.length}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAttendance.map((attendance) => (
                <div key={attendance.id} className="p-4 glass-button rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm">{attendance.user?.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attendance.attendanceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-warning/20 text-warning">
                      Pending
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <Button variant="outline" size="sm" className="text-xs">
                      View Photo
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="success" 
                      className="flex-1"
                      onClick={() => handleApprove('attendance', attendance.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => handleReject('attendance', attendance.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Priority Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="text-lg font-semibold">Priority Alerts</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 glass-button rounded-lg border border-warning/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm">3 reports pending for more than 24 hours</span>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 glass-button rounded-lg border border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">All attendance records up to date</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}