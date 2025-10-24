export interface APIReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  amount: number;
  attachment_url: string;
  manager_notes: string;
  rejection_message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface APIUser {
  id: string;
  email: string;
  full_name: string;
  role?: string; // Role is now fetched from user_roles table
  created_at: string;
}

export interface APIPayment {
  id: string;
  user_id: string;
  report_id: string;
  amount: number;
  method: string;
  proof_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}