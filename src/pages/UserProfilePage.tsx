import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import Layout from '@/components/Layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Mail, Trash2, Edit, Eye } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  mobile_number: string;
  role: string;
  station_id: string;
  center_address: string;
  registrar?: string;
  is_demo: boolean;
  password_set: boolean;
  created_at: string;
  updated_at: string;
}

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  // Get the role for Layout component
  const role = profile?.role as 'admin' | 'manager';

  // Redirect if not admin or manager
  useEffect(() => {
    if (profile && profile.role !== 'admin' && profile.role !== 'manager') {
      navigate('/');
      return;
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setUserProfile(data);
      setFormData(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch user profile",
        variant: "destructive",
      });
      navigate('/user-management');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.full_name || !formData.mobile_number) {
      toast({
        title: "Validation Error",
        description: "Email, full name, and mobile number are required",
        variant: "destructive",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      // Only update non-empty fields
      const updateData: any = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key as keyof UserProfile];
        if (value !== undefined && value !== null && value !== '') {
          updateData[key] = value;
        }
      });

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User profile updated successfully",
      });

      // Refresh the profile data and exit edit mode
      await fetchUserProfile();
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async () => {
    if (!userProfile) return;
    
    try {
      setResendingInvite(true);
      const { data, error } = await supabase.functions.invoke('user-invite', {
        body: {
          email: userProfile.email,
          role: userProfile.role,
          full_name: userProfile.full_name,
          mobile_number: userProfile.mobile_number,
          station_id: userProfile.station_id,
          center_address: userProfile.center_address,
          registrar: userProfile.registrar || ''
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation resent",
        description: `New invitation sent to ${userProfile.email}`,
      });
    } catch (error: any) {
      console.error('Error resending invite:', error);
      toast({
        title: "Failed to resend invitation",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setResendingInvite(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userProfile) return;

    try {
      setDeleting(true);
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: userProfile.user_id,
          admin_email: profile?.email
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast({
        title: "User deleted",
        description: `User ${userProfile.email} has been deleted`,
      });
      
      // Navigate back to user management
      navigate('/user-management');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Failed to delete user",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout role={role}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!userProfile) {
    return (
      <Layout role={role}>
        <div className="min-h-screen flex items-center justify-center">
          <p>User not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role={role}>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/user-management')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">User Profile</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData(userProfile || {});
                }}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Mode
              </Button>
            )}
            
            {!userProfile?.password_set && !userProfile?.is_demo && (
              <Button
                variant="default"
                onClick={handleResendInvite}
                disabled={resendingInvite}
                className="flex items-center gap-2"
              >
                {resendingInvite ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Resend Invite
              </Button>
            )}
            
            {userProfile?.user_id !== profile?.user_id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex items-center gap-2"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete User
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Are you sure you want to permanently delete <strong>{userProfile?.full_name}</strong> ({userProfile?.email})?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This action will also delete:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
                        <li>All reports submitted by this user</li>
                        <li>All payment records associated with this user</li>
                        <li>The user's profile and authentication data</li>
                      </ul>
                      <p className="text-sm font-medium text-destructive">
                        This action cannot be undone.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteUser}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Yes, Delete User
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="mt-1"
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="mt-1"
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="mobile_number">Mobile Number *</Label>
              <Input
                id="mobile_number"
                value={formData.mobile_number || ''}
                onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                className="mt-1"
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role || ''}
                onValueChange={(value) => handleInputChange('role', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="station_id">Station ID</Label>
              <Input
                id="station_id"
                value={formData.station_id || ''}
                onChange={(e) => handleInputChange('station_id', e.target.value)}
                className="mt-1"
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="center_address">Center Address</Label>
              <Input
                id="center_address"
                value={formData.center_address || ''}
                onChange={(e) => handleInputChange('center_address', e.target.value)}
                className="mt-1"
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="registrar">Registrar</Label>
              <Input
                id="registrar"
                value={formData.registrar || ''}
                onChange={(e) => handleInputChange('registrar', e.target.value)}
                className="mt-1"
                disabled={!isEditing}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_demo"
                checked={formData.is_demo || false}
                onChange={(e) => handleInputChange('is_demo', e.target.checked)}
                className="rounded border-gray-300"
                disabled={!isEditing}
              />
              <Label htmlFor="is_demo">Demo User</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="password_set"
                checked={formData.password_set || false}
                onChange={(e) => handleInputChange('password_set', e.target.checked)}
                className="rounded border-gray-300"
                disabled={!isEditing}
              />
              <Label htmlFor="password_set">Password Set</Label>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="text-sm text-muted-foreground mb-4">
              <p><strong>Created:</strong> {new Date(userProfile.created_at).toLocaleString()}</p>
              <p><strong>Updated:</strong> {new Date(userProfile.updated_at).toLocaleString()}</p>
              <p><strong>User ID:</strong> {userProfile.user_id}</p>
            </div>

            {isEditing && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(userProfile || {});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}
 