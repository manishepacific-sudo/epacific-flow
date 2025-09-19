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
import { ThemeToggle } from "@/components/ThemeToggle";
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
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={epacificLogo} alt="Epacific" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg dark:bg-white dark:p-1" />
              <div className="min-w-0">
                <h1 className="font-bold text-base sm:text-lg gradient-text truncate">Epacific</h1>
                <p className="text-xs text-muted-foreground capitalize truncate">{role} Panel</p>
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
          <nav className="space-y-2 mb-6 sm:mb-8 overflow-y-auto max-h-[calc(100vh-300px)]">
            {currentMenuItems.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant={isActive(item.path) ? "hero" : "ghost"}
                  className="w-full justify-start gap-2 sm:gap-3 h-10 sm:h-12 text-sm sm:text-base"
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Button>
              </motion.div>
            ))}
          </nav>

          {/* User Profile */}
          <div className="mt-auto pt-4 sm:pt-6 border-t border-border">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                  {mockCurrentUser.fullName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm truncate">{mockCurrentUser.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{mockCurrentUser.email}</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-9 sm:h-10 text-xs sm:text-sm"
              onClick={handleLogout}
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              Sign Out
            </Button>
          </div>
        </GlassCard>
      </motion.aside>

      {/* Main Content */}
      <div className="lg:ml-72 xl:ml-80 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-border backdrop-blur-md bg-background/80 transition-colors duration-300">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden h-8 w-8 sm:h-10 sm:w-10"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <h2 className="text-lg sm:text-xl font-semibold capitalize truncate">
                {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadNotifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          <div className="max-w-full overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}