import Layout from "@/components/Layout";
import EnhancedUserManagement from "@/components/EnhancedUserManagement";
import { useAuth } from "@/components/AuthProvider";

export default function UserManagementPage() {
  const { profile } = useAuth();
  const role = profile?.role as 'admin' | 'manager';

  return (
    <Layout role={role}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold gradient-text">User Management</h1>
          <p className="text-muted-foreground">
            Add, manage, and organize system users
          </p>
        </div>
        <EnhancedUserManagement />
      </div>
    </Layout>
  );
}