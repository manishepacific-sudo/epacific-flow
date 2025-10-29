import { useState } from "react";
import {
  Home,
  Users,
  CreditCard,
  FileText,
  Camera,
  Menu,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  role: "admin" | "manager" | "user";
}

const BottomNavigation = ({ role }: BottomNavigationProps) => {
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const getDashboardPath = (role: string) => {
    switch (role) {
      case "admin":
        return "/dashboard/admin";
      case "manager":
        return "/dashboard/manager";
      default:
        return "/dashboard/user";
    }
  };

  const getPaymentsPath = (role: string) => {
    switch (role) {
      case "admin":
      case "manager":
        return "/payments-management";
      default:
        return "/payments";
    }
  };

  const getReportsPath = (role: string) => {
    switch (role) {
      case "admin":
      case "manager":
        return "/reports-management";
      default:
        return "/upload/report";
    }
  };

  const bottomNavItems = [
    {
      label: "Overview",
      icon: Home,
      path: getDashboardPath(role),
    },
    ...(role !== "user"
      ? [
          {
            label: "Users",
            icon: Users,
            path: "/user-management",
          },
        ]
      : []),
    {
      label: "Payments",
      icon: CreditCard,
      path: getPaymentsPath(role),
      badge: unreadCount > 0,
    },
    {
      label: "Reports",
      icon: FileText,
      path: getReportsPath(role),
    },
    {
      label: "Attendance",
      icon: Camera,
      path: role === "user" ? "/attendance" : "/attendance-management",
    },
    {
      label: "Menu",
      icon: Menu,
      path: null, // Opens sheet instead
    },
  ];

  const menuSheetItems = [
    ...(role === "admin"
      ? [
          {
            label: "Settings",
            icon: Settings,
            path: "/settings",
          },
        ]
      : []),
    {
      label: "Profile",
      icon: User,
      path: `/user-profile/${profile?.id}`,
    },
  ];

  const isActive = (path: string | null) => {
    if (!path) return false;
    if (path === "/") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string | null) => {
    if (path) {
      navigate(path);
      setMenuSheetOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setMenuSheetOpen(false);
  };

  return (
    <>
      <motion.nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40",
          "backdrop-blur-md bg-background/80 dark:bg-background/90",
          "border-t border-border/50 shadow-elevated",
          "pb-safe transition-all duration-300"
        )}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <div className="grid grid-cols-6 gap-1">
          {bottomNavItems.map((item, index) =>
            item.label === "Menu" ? (
              <Sheet key={index} open={menuSheetOpen} onOpenChange={setMenuSheetOpen}>
                <SheetTrigger asChild>
                  <motion.button
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-1",
                      "hover:bg-accent/50 rounded-xl transition-colors duration-200"
                    )}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    aria-label="Open menu"
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">{item.label}</span>
                  </motion.button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl">
                  <SheetHeader className="pb-6">
                    <SheetTitle>
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {profile?.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold">{profile?.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {profile?.email}
                          </span>
                          <Badge variant="outline" className="mt-1 w-fit">
                            {role}
                          </Badge>
                        </div>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="grid gap-4">
                    {menuSheetItems.map((item, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        className="justify-start gap-2"
                        onClick={() => handleNavigation(item.path)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    ))}
                    <Button
                      variant="destructive"
                      className="justify-start gap-2 mt-4"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <motion.button
                key={index}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 relative",
                  isActive(item.path)
                    ? "bg-gradient-to-br from-primary/20 via-accent-purple/10 to-primary/20 rounded-xl shadow-glow-blue"
                    : "hover:bg-accent/50 rounded-xl transition-colors duration-200"
                )}
                onClick={() => handleNavigation(item.path)}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                aria-label={item.label}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    isActive(item.path)
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs mt-1",
                    isActive(item.path)
                      ? "text-primary font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
                {item.badge && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full text-[10px] flex items-center justify-center p-0"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </motion.button>
            )
          )}
        </div>
      </motion.nav>
    </>
  );
};

export default BottomNavigation;