import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  UserPlus, 
  Mail, 
  User, 
  MapPin, 
  Building2, 
  Phone,
  RotateCcw,
  Trash2,
  Shield,
  ShieldCheck,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface UserFormData {
  full_name: string;
  email: string;
  mobile_number: string;
  station_id: string;
  center_address: string;
  role: string;
}

const roleIcons = {
  admin: Crown,
  manager: ShieldCheck,
  user: Shield
};

const roleColors = {
  admin: "text-purple-600 bg-purple-100",
  manager: "text-blue-600 bg-blue-100", 
  user: "text-green-600 bg-green-100"
};

export default function UserManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    full_name: "",
    email: "",
    mobile_number: "",
    station_id: "",
    center_address: "",
    role: "user"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error loading users",
        description: "Failed to load user list",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Create user directly in profiles table (simulating admin creation)
      const { data: userData, error: createError } = await supabase
        .from('profiles')
        .insert([{
          user_id: crypto.randomUUID(),
          full_name: formData.full_name,
          email: formData.email,
          mobile_number: formData.mobile_number,
          station_id: formData.station_id,
          center_address: formData.center_address,
          role: formData.role
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Send invitation email
      const inviteLink = `${window.location.origin}/set-password?token=${userData.id}`;
      
      const { error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          inviteLink
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the user creation if email fails
        toast({
          title: "User created",
          description: "User created successfully, but invitation email failed to send",
          variant: "default"
        });
      } else {
        toast({
          title: "User created successfully",
          description: `Invitation email sent to ${formData.email}`,
        });
      }

      // Reset form and close dialog
      setFormData({
        full_name: "",
        email: "",
        mobile_number: "",
        station_id: "",
        center_address: "",
        role: "user"
      });
      setIsDialogOpen(false);
      fetchUsers();

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Failed to create user",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const sendPasswordReset = async (user: any) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      // Also send via our custom email function
      const resetLink = `${window.location.origin}/reset-password`;
      
      const { error: emailError } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: user.email,
          full_name: user.full_name,
          resetLink
        }
      });

      if (emailError) {
        console.error('Custom email error:', emailError);
      }

      toast({
        title: "Password reset sent",
        description: `Reset instructions sent to ${user.email}`,
      });
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Failed to send reset",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Create and manage user accounts</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={createUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="mobile_number"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.mobile_number}
                    onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="station_id">Station ID</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="station_id"
                    type="text"
                    placeholder="STN001"
                    value={formData.station_id}
                    onChange={(e) => handleInputChange('station_id', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="center_address">Center Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="center_address"
                    type="text"
                    placeholder="123 Main St, City"
                    value={formData.center_address}
                    onChange={(e) => handleInputChange('center_address', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    {profile?.role === 'admin' && <SelectItem value="manager">Manager</SelectItem>}
                    {profile?.role === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="flex-1">
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Users ({users.length})</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No users found. Create your first user to get started.
            </div>
          ) : (
            users.map((user) => {
              const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || Shield;
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-white font-semibold">
                        {user.full_name?.charAt(0) || 'U'}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{user.full_name}</h4>
                          <Badge className={`gap-1 ${roleColors[user.role as keyof typeof roleColors]}`}>
                            <RoleIcon className="h-3 w-3" />
                            {user.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {user.station_id} • {user.mobile_number}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendPasswordReset(user)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset Password
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}