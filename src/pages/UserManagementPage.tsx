import Layout from "@/components/Layout";
import EnhancedUserManagement from "@/components/EnhancedUserManagement";
import { useAuth } from "@/components/AuthProvider";

export default function UserManagementPage() {
  const { profile } = useAuth();
  const role = profile?.role as 'admin' | 'manager';

  return (
    <Layout role={role}>
      <EnhancedUserManagement />
    </Layout>
  );
}