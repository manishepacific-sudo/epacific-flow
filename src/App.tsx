import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InviteRedirectHandler } from "@/components/InviteRedirectHandler";
import { AuthRedirect } from "@/components/AuthRedirect";
import { withRoleGuard } from "@/components/withRoleGuard";
import Login from "./pages/Login";
import HandleInvite from "./pages/HandleInvite";
import SetPasswordPage from "./pages/SetPasswordPage";
import ResetPassword from "./pages/ResetPassword";

// Lazy load dashboard and secondary pages to reduce initial bundle size
const TokenTest = lazy(() => import("./pages/TokenTest"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const ReportsManagementPage = lazy(() => import("./pages/ReportsManagementPage"));
const PaymentsManagementPage = lazy(() => import("./pages/PaymentsManagementPage"));
const ReportUpload = lazy(() => import("./pages/ReportUpload"));
const EnhancedPaymentPage = lazy(() => import("./pages/EnhancedPaymentPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage").then(module => ({ default: module.UserProfilePage })));

// Create role-guarded components
const GuardedUserDashboard = withRoleGuard(UserDashboard, 'user');
const GuardedAdminDashboard = withRoleGuard(AdminDashboard, 'admin');
const GuardedManagerDashboard = withRoleGuard(ManagerDashboard, 'manager');
const GuardedUserManagement = withRoleGuard(UserManagementPage, ['admin', 'manager']);
const GuardedReportsManagement = withRoleGuard(ReportsManagementPage, ['admin', 'manager']);
const GuardedPaymentsManagement = withRoleGuard(PaymentsManagementPage, ['admin', 'manager']);
const GuardedReportUpload = withRoleGuard(ReportUpload, 'user');
const GuardedUserProfile = withRoleGuard(UserProfilePage, 'admin');

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }>
            <Routes>
              {/* Public routes - no authentication required */}
              <Route path="/login" element={<Login />} />
              <Route path="/set-password" element={<SetPasswordPage />} />
              <Route path="/token-test" element={<TokenTest />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/handle-invite" element={<HandleInvite />} />
              <Route path="/auth-bridge" element={<HandleInvite />} />
              
              {/* Protected routes - require authentication */}
              <Route path="/dashboard/*" element={
                <AuthProvider>
                  <InviteRedirectHandler />
                  <Routes>
                    <Route path="/user" element={<GuardedUserDashboard />} />
                    <Route path="/admin" element={<GuardedAdminDashboard />} />
                    <Route path="/manager" element={<GuardedManagerDashboard />} />
                  </Routes>
                </AuthProvider>
              } />
              
              <Route path="/user-management" element={
                <AuthProvider>
                  <GuardedUserManagement />
                </AuthProvider>
              } />
              
              <Route path="/reports-management" element={
                <AuthProvider>
                  <GuardedReportsManagement />
                </AuthProvider>
              } />
              
              <Route path="/payments-management" element={
                <AuthProvider>
                  <GuardedPaymentsManagement />
                </AuthProvider>
              } />
              
              <Route path="/upload/report" element={
                <AuthProvider>
                  <GuardedReportUpload />
                </AuthProvider>
              } />
              
              <Route path="/payment/:id" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <EnhancedPaymentPage />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              
              <Route path="/payments" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <PaymentsPage />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              
              <Route path="/attendance" element={
                <AuthProvider>
                  <ProtectedRoute>
                    <AttendancePage />
                  </ProtectedRoute>
                </AuthProvider>
              } />
              
              <Route path="/user-profile/:userId" element={
                <AuthProvider>
                  <GuardedUserProfile />
                </AuthProvider>
              } />
              
              {/* Root redirect and 404 */}
              <Route path="/" element={
                <AuthProvider>
                  <InviteRedirectHandler />
                  <AuthRedirect />
                </AuthProvider>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
