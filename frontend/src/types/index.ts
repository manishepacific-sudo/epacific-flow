export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'user';
  createdAt: string;
}

export interface Report {
  id: string;
  userId: string;
  user?: User;
  fileUrl: string;
  filename: string;
  reportDate: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  user?: User;
  reportId: string;
  report?: Report;
  method: 'phonepe' | 'razorpay' | 'offline';
  amount: number;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  user?: User;
  photoUrl: string;
  attendanceDate: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ParsedReportData {
  amount: number;
  preview: Array<{ [key: string]: string }>;
  headers: string[];
}