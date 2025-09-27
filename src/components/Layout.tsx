import { ReactNode, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import epacificLogo from "@/assets/epacific-logo.png";

interface LayoutProps {
  children: ReactNode;
  role: 'admin' | 'manager' | 'user';
}

export default function Layout({ children, role }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const menuItems = {
    admin: [
      { icon: Home, label: "Dashboard", path: "/dashboard/admin" },
      { icon: Users, label: "User Management", path: "/user-management" },
      { icon: FileText, label: "Reports Management", path: "/reports-management" },
      { icon: CreditCard, label: "Payments Management", path: "/payments-management" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
    manager: [
      { icon: Home, label: "Overview", path: "/dashboard/manager" },
      { icon: Users, label: "User Management", path: "/user-management" },
      { icon: FileText, label: "Reports Management", path: "/reports-management" },
      { icon: CreditCard, label: "Payments Management", path: "/payments-management" },
    ],
    user: [
      { icon: Home, label: "Dashboard", path: "/dashboard/user" },
      { icon: FileText, label: "Upload Report", path: "/upload/report" },
      { icon: CreditCard, label: "Payments", path: "/payments" },
      { icon: Camera, label: "Attendance", path: "/attendance" },
    ],
  };

  const currentMenuItems = menuItems[role];

  const isActive = (path: string) => {
    const currentPath = location.pathname + location.search;
    return currentPath === path;
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-background transition-colors duration-300 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed position on desktop */}
      <aside className={`
        fixed left-0 top-0 h-screen w-80 z-50
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:flex-shrink-0
      `}>
        <div className="h-full rounded-none lg:rounded-r-2xl p-6 flex flex-col bg-sidebar border-r border-sidebar-border backdrop-blur-md shadow-glass transition-colors duration-300">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src={epacificLogo} alt="Epacific" className="w-10 h-10 rounded-lg dark:bg-white dark:p-1" />
              <div className="min-w-0">
                <h1 className="font-bold text-lg text-sidebar-foreground truncate">Epacific</h1>
                <p className="text-xs text-sidebar-foreground/70 capitalize truncate">{role} Panel</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {currentMenuItems.map((item) => (
              <Button
                key={`${item.path}-${item.label}`}
                variant="ghost"
                className={`w-full justify-start gap-3 h-12 text-base transition-colors duration-200 ${
                  isActive(item.path) 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Sidebar button clicked:', item.path);
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Button>
            ))}
          </nav>

          {/* User Profile */}
          <div className="pt-6 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-sidebar-foreground truncate">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-sidebar-foreground/70 truncate">{profile?.email || ''}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-10 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-sidebar-border"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content - Flex container for proper alignment */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-border backdrop-blur-md bg-background/80 transition-colors duration-300">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden h-10 w-10"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold capitalize truncate">
                {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <NotificationDropdown />
            </div>
          </div>
        </header>

        {/* Page Content - Fixed overflow and scrolling */}
        <main className="flex-1 p-3 sm:p-6 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}