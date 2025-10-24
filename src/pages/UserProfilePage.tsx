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
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  mobile_number: string;
  station_id: string;
  center_address: string;
  is_demo: boolean;
  password_set: boolean;
  created_at: string;
  updated_at: string;
  registrar?: string;
}

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  // Redirect if not admin
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/dashboard/admin');
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
      navigate('/dashboard/admin');
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

      // Refresh the profile data
      await fetchUserProfile();
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

  if (loading) {
    return (
      <Layout role="admin">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!userProfile) {
    return (
      <Layout role="admin">
        <div className="min-h-screen flex items-center justify-center">
          <p>User not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">User Profile</h1>
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
              />
            </div>

            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="mobile_number">Mobile Number *</Label>
              <Input
                id="mobile_number"
                value={formData.mobile_number || ''}
                onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Role is now managed in user_roles table */}

            <div>
              <Label htmlFor="station_id">Station ID</Label>
              <Input
                id="station_id"
                value={formData.station_id || ''}
                onChange={(e) => handleInputChange('station_id', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="center_address">Center Address</Label>
              <Input
                id="center_address"
                value={formData.center_address || ''}
                onChange={(e) => handleInputChange('center_address', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_demo"
                checked={formData.is_demo || false}
                onChange={(e) => handleInputChange('is_demo', e.target.checked)}
                className="rounded border-gray-300"
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

            <div className="flex gap-3">
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
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}