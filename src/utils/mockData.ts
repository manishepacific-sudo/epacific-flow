import { User, Report, Payment, Attendance, Notification } from "@/types";

// Mock current user
export const mockCurrentUser: User = {
  id: "1",
  email: "john.doe@epacific.com",
  fullName: "John Doe",
  role: "user",
  createdAt: "2024-01-15T10:00:00Z",
};

// Mock users
export const mockUsers: User[] = [
  {
    id: "1",
    email: "john.doe@epacific.com",
    fullName: "John Doe",
    role: "user",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    email: "jane.manager@epacific.com",
    fullName: "Jane Manager",
    role: "manager",
    createdAt: "2024-01-10T10:00:00Z",
  },
  {
    id: "3",
    email: "admin@epacific.com",
    fullName: "Admin User",
    role: "admin",
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "4",
    email: "alice.user@epacific.com",
    fullName: "Alice Cooper",
    role: "user",
    createdAt: "2024-01-20T10:00:00Z",
  },
];

// Mock reports
export const mockReports: Report[] = [
  {
    id: "r1",
    userId: "1",
    user: mockUsers[0],
    fileUrl: "/reports/report-jan-2024.csv",
    filename: "report-jan-2024.csv",
    reportDate: "2024-01-31",
    amount: 2500.00,
    status: "pending",
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "r2",
    userId: "4",
    user: mockUsers[3],
    fileUrl: "/reports/report-feb-2024.html",
    filename: "report-feb-2024.html",
    reportDate: "2024-02-28",
    amount: 3200.50,
    status: "approved",
    createdAt: "2024-03-01T10:00:00Z",
  },
];

// Mock payments
export const mockPayments: Payment[] = [
  {
    id: "p1",
    userId: "1",
    user: mockUsers[0],
    reportId: "r1",
    report: mockReports[0],
    method: "offline",
    amount: 2500.00,
    proofUrl: "/proofs/payment-proof-1.jpg",
    status: "pending",
    createdAt: "2024-02-01T12:00:00Z",
  },
  {
    id: "p2",
    userId: "4",
    user: mockUsers[3],
    reportId: "r2",
    method: "phonepe",
    amount: 3200.50,
    status: "approved",
    createdAt: "2024-03-01T12:00:00Z",
  },
];

// Mock attendance
export const mockAttendance: Attendance[] = [
  {
    id: "a1",
    userId: "1",
    user: mockUsers[0],
    photoUrl: "/attendance/selfie-1.jpg",
    attendanceDate: "2024-02-15",
    status: "approved",
    createdAt: "2024-02-15T09:00:00Z",
  },
  {
    id: "a2",
    userId: "1",
    user: mockUsers[0],
    photoUrl: "/attendance/selfie-2.jpg",
    attendanceDate: "2024-02-16",
    status: "pending",
    createdAt: "2024-02-16T09:00:00Z",
  },
];

// Mock notifications
export const mockNotifications: Notification[] = [
  {
    id: "n1",
    userId: "1",
    title: "Report Approved",
    message: "Your February report has been approved by the manager.",
    type: "success",
    read: false,
    createdAt: "2024-03-01T14:00:00Z",
  },
  {
    id: "n2",
    userId: "1",
    title: "Payment Pending",
    message: "Your payment proof is under review.",
    type: "info",
    read: false,
    createdAt: "2024-02-01T13:00:00Z",
  },
];

// Dashboard stats
export const mockDashboardStats = {
  admin: {
    totalUsers: mockUsers.length,
    totalReports: mockReports.length,
    pendingApprovals: mockReports.filter(r => r.status === 'pending').length + 
                     mockPayments.filter(p => p.status === 'pending').length + 
                     mockAttendance.filter(a => a.status === 'pending').length,
    totalRevenue: mockPayments.reduce((sum, p) => sum + p.amount, 0),
  },
  manager: {
    pendingReports: mockReports.filter(r => r.status === 'pending').length,
    pendingPayments: mockPayments.filter(p => p.status === 'pending').length,
    pendingAttendance: mockAttendance.filter(a => a.status === 'pending').length,
    teamMembers: mockUsers.filter(u => u.role === 'user').length,
  },
  user: {
    totalReports: mockReports.filter(r => r.userId === mockCurrentUser.id).length,
    pendingPayments: mockPayments.filter(p => p.userId === mockCurrentUser.id && p.status === 'pending').length,
    attendanceThisMonth: mockAttendance.filter(a => a.userId === mockCurrentUser.id && new Date(a.attendanceDate).getMonth() === new Date().getMonth()).length,
    totalEarnings: mockPayments.filter(p => p.userId === mockCurrentUser.id && p.status === 'approved').reduce((sum, p) => sum + p.amount, 0),
  },
};