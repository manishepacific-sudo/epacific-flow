import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Home,
  FileText,
  CreditCard,
  Camera,
  Users,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/custom-button";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { mockCurrentUser, mockNotifications } from "@/utils/mockData";
import epacificLogo from "@/assets/epacific-logo.png";

interface LayoutProps {
  children: ReactNode;
  role: 'admin' | 'manager' | 'user';
}

export default function Layout({ children, role }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const unreadNotifications = mockNotifications.filter(n => !n.read).length;

  const menuItems = {
    admin: [
      { icon: Home, label: "Dashboard", path: "/dashboard/admin" },
      { icon: Users, label: "Users", path: "/users" },
      { icon: FileText, label: "Reports", path: "/reports" },
      { icon: CreditCard, label: "Payments", path: "/payments" },
      { icon: Camera, label: "Attendance", path: "/attendance" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
    manager: [
      { icon: Home, label: "Dashboard", path: "/dashboard/manager" },
      { icon: FileText, label: "Approve Reports", path: "/approve/reports" },
      { icon: CreditCard, label: "Approve Payments", path: "/approve/payments" },
      { icon: Camera, label: "Approve Attendance", path: "/approve/attendance" },
    ],
    user: [
      { icon: Home, label: "Dashboard", path: "/dashboard/user" },
      { icon: FileText, label: "Upload Report", path: "/upload/report" },
      { icon: CreditCard, label: "Payments", path: "/payments" },
      { icon: Camera, label: "Attendance", path: "/attendance" },
    ],
  };

  const currentMenuItems = menuItems[role];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-full w-80 z-50 lg:translate-x-0 lg:static lg:z-auto"
      >
        <GlassCard hover={false} className="h-full rounded-none lg:rounded-r-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src={epacificLogo} alt="Epacific" className="w-10 h-10 rounded-lg" />
              <div>
                <h1 className="font-bold text-lg gradient-text">Epacific</h1>
                <p className="text-xs text-muted-foreground capitalize">{role} Panel</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 mb-8">
            {currentMenuItems.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant={isActive(item.path) ? "hero" : "ghost"}
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </motion.div>
            ))}
          </nav>

          {/* User Profile */}
          <div className="mt-auto pt-6 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {mockCurrentUser.fullName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{mockCurrentUser.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{mockCurrentUser.email}</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </GlassCard>
      </motion.aside>

      {/* Main Content */}
      <div className="lg:ml-80 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-border backdrop-blur-md bg-background/80">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold capitalize">
                {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}