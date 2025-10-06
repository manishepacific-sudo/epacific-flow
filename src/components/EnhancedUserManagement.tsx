<<<<<<< HEAD
import { useState, useEffect } from 'react';
=======
import { useState, useEffect, useCallback } from 'react';
>>>>>>> feature/settings-management
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Clock, 
<<<<<<< HEAD
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Trash2,
  MoreVertical,
  Eye,
  EyeOff,
=======
  XCircle, 
  RefreshCw,
  Trash2,
  Eye,
>>>>>>> feature/settings-management
  Search,
  Filter,
  Download,
  Calendar,
  UserCheck,
<<<<<<< HEAD
  Building
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
=======
  Building,
  MoreVertical
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
>>>>>>> feature/settings-management
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
<<<<<<< HEAD

=======
>>>>>>> feature/settings-management
interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user';
  mobile_number: string;
  station_id: string;
  center_address: string;
  registrar?: string;
  password_set: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}
<<<<<<< HEAD

=======
>>>>>>> feature/settings-management
export default function EnhancedUserManagement() {
  const { user: currentUser, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    full_name: '',
    mobile_number: '',
    station_id: '',
    center_address: '',
    registrar: ''
  });
<<<<<<< HEAD

=======
>>>>>>> feature/settings-management
  const [formErrors, setFormErrors] = useState({
    mobile_number: '',
    station_id: ''
  });
<<<<<<< HEAD

=======
>>>>>>> feature/settings-management
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    registrar: '',
    dateRange: { from: null as Date | null, to: null as Date | null }
  });
<<<<<<< HEAD

  const canManageUsers = currentProfile?.role === 'admin' || currentProfile?.role === 'manager';
  const canCreateManagers = currentProfile?.role === 'admin' || currentProfile?.role === 'manager';

=======
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState<string | null>(null);

  const canManageUsers = currentProfile?.role === 'admin' || currentProfile?.role === 'manager';
  const canCreateManagers = currentProfile?.role === 'admin' || currentProfile?.role === 'manager';
  const isMobile = useIsMobile();
>>>>>>> feature/settings-management
  const validateMobileNumber = (value: string) => {
    if (!value) return '';
    if (!/^\d+$/.test(value)) return 'Mobile number must contain only digits';
    if (value.length !== 10) return 'Mobile number must be exactly 10 digits';
    return '';
  };
<<<<<<< HEAD

=======
>>>>>>> feature/settings-management
  const validateStationId = (value: string) => {
    if (!value) return '';
    if (!/^\d+$/.test(value)) return 'Station ID must contain only digits';
    if (value.length !== 5) return 'Station ID must be exactly 5 digits';
    return '';
  };
<<<<<<< HEAD

=======
>>>>>>> feature/settings-management
  const handleInputChange = (field: string, value: string) => {
    setInviteForm({ ...inviteForm, [field]: value });
    
    // Real-time validation
    if (field === 'mobile_number') {
      setFormErrors(prev => ({ ...prev, mobile_number: validateMobileNumber(value) }));
    } else if (field === 'station_id') {
      setFormErrors(prev => ({ ...prev, station_id: validateStationId(value) }));
    }
  };
<<<<<<< HEAD

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  const fetchUsers = async () => {
=======
  const fetchUsers = useCallback(async () => {
>>>>>>> feature/settings-management
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
<<<<<<< HEAD

=======
>>>>>>> feature/settings-management
      if (error) throw error;
      setUsers((data || []) as UserProfile[]);
      setFilteredUsers((data || []) as UserProfile[]);
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
<<<<<<< HEAD
  };
=======
  }, [toast]);

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers, fetchUsers]);
>>>>>>> feature/settings-management

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.full_name || !inviteForm.role) {
      toast({
        title: "Missing required fields",
        description: "Please fill in email, full name, and role",
        variant: "destructive"
      });
      return;
    }

    // Validate mobile number if provided
    if (inviteForm.mobile_number && !/^\d{10}$/.test(inviteForm.mobile_number)) {
      toast({
        title: "Invalid mobile number",
        description: "Mobile number must be exactly 10 digits",
        variant: "destructive"
      });
      return;
    }

    // Validate station ID if provided
    if (inviteForm.station_id && !/^\d{5}$/.test(inviteForm.station_id)) {
      toast({
        title: "Invalid station ID",
        description: "Station ID must be exactly 5 digits",
        variant: "destructive"
      });
      return;
    }

    // Check role permissions - both admins and managers can now create managers
    if (inviteForm.role === 'manager' && !canCreateManagers) {
      toast({
        title: "Permission denied",
        description: "Only admins and managers can create manager accounts",
        variant: "destructive"
      });
      return;
    }

    setInviteLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('user-invite', {
        body: {
          ...inviteForm,
          admin_email: currentProfile?.email
        }
      });

      if (error) throw error;

      if (!data.success) {
        // Check if it's a duplicate user error
        if (data.userExists) {
          toast({
            title: "User Already Exists",
            description: data.error || "A user with this email already exists.",
            variant: "destructive"
          });
          return;
        }
        throw new Error(data.error);
      }

      // Show invite link if email failed or provide success message
      if (data.emailError) {
        toast({
          title: "⚠️ Email Sending Failed",
          description: (
            <div className="space-y-2">
              <p>User created successfully but email couldn't be sent.</p>
              <p className="text-sm text-muted-foreground">{data.emailError}</p>
              <p className="text-xs font-mono bg-muted p-2 rounded">
                {data.invite_link}
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(data.invite_link);
                  toast({ title: "Copied!", description: "Invite link copied to clipboard" });
                }}
              >
                Copy Link
              </Button>
            </div>
          ),
          variant: "destructive",
          duration: 10000, // Show for 10 seconds
        });
      } else {
        toast({
          title: "User invited successfully!",
          description: `Invitation email sent to ${inviteForm.email}. User will receive setup instructions.`,
        });
      }

      setInviteForm({
        email: '',
        role: 'user',
        full_name: '',
        mobile_number: '',
        station_id: '',
        center_address: '',
        registrar: ''
      });
      setFormErrors({
        mobile_number: '',
        station_id: ''
      });
      setInviteDialogOpen(false);
      fetchUsers();
<<<<<<< HEAD
    } catch (err: any) {
      console.error('Error inviting user:', err);
      toast({
        title: "Failed to invite user",
        description: err.message || "An unexpected error occurred",
=======
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error inviting user:', error);
      toast({
        title: "Failed to invite user",
        description: error.message || "An unexpected error occurred",
>>>>>>> feature/settings-management
        variant: "destructive"
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (userEmail: string) => {
    try {
      const user = users.find(u => u.email === userEmail);
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('user-invite', {
        body: {
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          mobile_number: user.mobile_number,
          station_id: user.station_id,
          center_address: user.center_address,
          registrar: user.registrar
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation resent",
        description: `New invitation sent to ${userEmail}`,
      });
      
      fetchUsers();
<<<<<<< HEAD
    } catch (err: any) {
      console.error('Error resending invite:', err);
      toast({
        title: "Failed to resend invitation",
        description: err.message || "An unexpected error occurred",
=======
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error resending invite:', error);
      toast({
        title: "Failed to resend invitation",
        description: error.message || "An unexpected error occurred",
>>>>>>> feature/settings-management
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: userId,
          admin_email: currentProfile?.email
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast({
        title: "User deleted",
        description: `User ${userEmail} has been deleted`,
      });
      
      fetchUsers();
<<<<<<< HEAD
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({
        title: "Failed to delete user",
        description: err.message || "An unexpected error occurred",
=======
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error deleting user:', error);
      toast({
        title: "Failed to delete user",
        description: error.message || "An unexpected error occurred",
>>>>>>> feature/settings-management
        variant: "destructive"
      });
    }
  };

  // Search and filter functionality
  useEffect(() => {
    let filtered = users;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.mobile_number.toLowerCase().includes(query) ||
        user.station_id.toLowerCase().includes(query) ||
        user.center_address.toLowerCase().includes(query) ||
        (user.registrar && user.registrar.toLowerCase().includes(query)) ||
        user.role.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(user => {
        const status = getUserStatus(user);
        return status.toLowerCase() === filters.status.toLowerCase();
      });
    }

    // Apply registrar filter
    if (filters.registrar) {
      filtered = filtered.filter(user => user.registrar === filters.registrar);
    }

    // Apply date range filter
    if (filters.dateRange.from) {
      filtered = filtered.filter(user => {
        const userDate = new Date(user.created_at);
        const fromDate = filters.dateRange.from!;
        const toDate = filters.dateRange.to || new Date();
        return userDate >= fromDate && userDate <= toDate;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, filters]);

  const clearFilters = () => {
    setFilters({
      role: '',
      status: '',
      registrar: '',
      dateRange: { from: null, to: null }
    });
    setSearchQuery('');
  };

  const exportToExcel = (exportType: string) => {
    let dataToExport = filteredUsers;
    let filename = 'users-export';

    // Filter data based on export type
    if (exportType === 'registrar') {
      // Group by role (treating role as registrar type)
      const selectedRole = filters.role || 'all';
      if (selectedRole !== 'all') {
        dataToExport = dataToExport.filter(user => user.role === selectedRole);
        filename = `users-${selectedRole}-export`;
      }
    } else if (exportType === 'active') {
      dataToExport = dataToExport.filter(user => getUserStatus(user) === 'Active');
      filename = 'users-active-export';
    } else if (exportType === 'inactive') {
      dataToExport = dataToExport.filter(user => getUserStatus(user) !== 'Active');
      filename = 'users-inactive-export';
    } else if (exportType === 'date-range' && filters.dateRange.from) {
      const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd');
      const toDate = filters.dateRange.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      filename = `users-${fromDate}-to-${toDate}-export`;
    }

    // Prepare data for Excel
    const excelData = dataToExport.map(user => ({
      'Full Name': user.full_name,
      'Email': user.email,
      'Role': user.role,
      'Registrar': user.registrar || 'N/A',
      'Mobile Number': user.mobile_number,
      'Station ID': user.station_id,
      'Center Address': user.center_address,
      'Status': getUserStatus(user),
      'Created Date': format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Is Demo': user.is_demo ? 'Yes' : 'No',
      'Password Set': user.password_set ? 'Yes' : 'No'
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Full Name
      { wch: 25 }, // Email
      { wch: 10 }, // Role
      { wch: 15 }, // Registrar
      { wch: 15 }, // Mobile Number
      { wch: 12 }, // Station ID
      { wch: 30 }, // Center Address
      { wch: 10 }, // Status
      { wch: 20 }, // Created Date
      { wch: 8 },  // Is Demo
      { wch: 12 }  // Password Set
    ];
    ws['!cols'] = colWidths;

    // Save file
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    toast({
      title: "Export completed",
      description: `Exported ${dataToExport.length} users to ${filename}.xlsx`,
    });

    setExportOpen(false);
  };

  const getUserStatus = (user: UserProfile) => {
    if (user.is_demo) return 'Demo';
    if (!user.password_set) return 'Pending';
    return 'Active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-warning/20 text-warning">Pending</Badge>;
      case 'Demo':
        return <Badge variant="outline">Demo</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!canManageUsers) {
    return (
      <GlassCard className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
        <p className="text-muted-foreground">You don't have permission to manage users.</p>
      </GlassCard>
    );
  }

<<<<<<< HEAD
  return (
    <div className="space-y-6">
=======
  // Helper: Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper: Get avatar gradient color by role
  const getAvatarColor = (role: string) => {
    if (role === 'admin') return 'bg-gradient-to-br from-purple-500 to-indigo-600';
    if (role === 'manager') return 'bg-gradient-to-br from-blue-500 to-cyan-600';
    return 'bg-gradient-to-br from-green-500 to-teal-600';
  };

  return (
    <div className={cn('space-y-6', isMobile && 'pb-20')}>
>>>>>>> feature/settings-management
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            <p className="text-muted-foreground">Add and manage system users</p>
          </div>
          
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value: 'admin' | 'manager' | 'user') => 
                        setInviteForm({ ...inviteForm, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="user">User</SelectItem>
                         {canCreateManagers && (
                           <SelectItem value="manager">Manager</SelectItem>
                         )}
                         {currentProfile?.role === 'admin' && (
                           <SelectItem value="admin">Admin</SelectItem>
                         )}
                       </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile_number">Mobile Number</Label>
                    <Input
                      id="mobile_number"
                      value={inviteForm.mobile_number}
                      onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                      placeholder="1234567890"
                      className={formErrors.mobile_number ? 'border-destructive' : ''}
                    />
                    {formErrors.mobile_number && (
                      <p className="text-sm text-destructive">{formErrors.mobile_number}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="station_id">Station ID</Label>
                    <Input
                      id="station_id"
                      value={inviteForm.station_id}
                      onChange={(e) => handleInputChange('station_id', e.target.value)}
                      placeholder="12345"
                      className={formErrors.station_id ? 'border-destructive' : ''}
                    />
                    {formErrors.station_id && (
                      <p className="text-sm text-destructive">{formErrors.station_id}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="center_address">Center Address</Label>
                  <Input
                    id="center_address"
                    value={inviteForm.center_address}
                    onChange={(e) => setInviteForm({ ...inviteForm, center_address: e.target.value })}
                    placeholder="123 Main St, City, State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrar">Registrar</Label>
                  <Input
                    id="registrar"
                    value={inviteForm.registrar}
                    onChange={(e) => setInviteForm({ ...inviteForm, registrar: e.target.value })}
                    placeholder="Registrar Name"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteLoading} className="flex-1">
                    {inviteLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </div>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Add User
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex gap-2 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, mobile, station..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {(filters.role || filters.status || filters.registrar || filters.dateRange.from) && (
                    <Badge variant="secondary" className="ml-1">
                      {[filters.role, filters.status, filters.registrar, filters.dateRange.from && 'date'].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={filters.role}
                      onValueChange={(value) => 
                        setFilters(prev => ({ ...prev, role: value === 'all' ? '' : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Registrar</Label>
                    <Select
                      value={filters.registrar}
                      onValueChange={(value) => 
                        setFilters(prev => ({ ...prev, registrar: value === 'all' ? '' : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select registrar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Registrars</SelectItem>
                        {Array.from(new Set(users.filter(u => u.registrar).map(u => u.registrar))).map(registrar => (
                          <SelectItem key={registrar} value={registrar!}>{registrar}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => 
                        setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {filters.dateRange.from ? (
                            filters.dateRange.to ? (
                              <>
                                {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                                {format(filters.dateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(filters.dateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={filters.dateRange.from}
                          selected={{
                            from: filters.dateRange.from,
                            to: filters.dateRange.to
                          }}
                          onSelect={(range) => 
                            setFilters(prev => ({
                              ...prev,
                              dateRange: { from: range?.from || null, to: range?.to || null }
                            }))
                          }
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={clearFilters}
                      className="flex-1"
                    >
                      Clear
                    </Button>
                    <Button 
                      onClick={() => setFilterOpen(false)}
                      className="flex-1"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Export Button */}
          <Popover open={exportOpen} onOpenChange={setExportOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="font-medium">Export Options</div>
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => exportToExcel('all')}
                  >
                    All Users
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => exportToExcel('registrar')}
                  >
                    Current Filter Results
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => exportToExcel('active')}
                  >
                    Active Users Only
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => exportToExcel('inactive')}
                  >
                    Inactive Users Only
                  </Button>
                  {filters.dateRange.from && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => exportToExcel('date-range')}
                    >
                      Date Range Results
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Users Table */}
      <GlassCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">System Users</h3>
              <p className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {users.length === 0 ? 'No users found' : 'No users match the current filters'}
              </p>
              {users.length > 0 && (
                <Button variant="outline" onClick={clearFilters} className="mt-2">
                  Clear Filters
                </Button>
              )}
            </div>
<<<<<<< HEAD
          ) : (
            <div className="overflow-x-auto">
=======
          ) : isMobile ? (
            <motion.div
              className="grid grid-cols-1 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.07
                  }
                }
              }}
            >
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ y: -4 }}
                >
                  <Card variant="interactive" size="default" className="group relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-4">
                        <Avatar className={cn('h-16 w-16', getAvatarColor(user.role))}>
                          <AvatarFallback className="text-white text-lg font-bold">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-lg font-semibold truncate">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          {user.mobile_number && (
                            <p className="text-xs text-muted-foreground truncate">{user.mobile_number}</p>
                          )}
                        </div>
                        <div className="absolute top-4 right-4">
                          {getStatusBadge(getUserStatus(user))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      </div>
                      {user.station_id && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.station_id}</span>
                          {user.center_address && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{user.center_address}</span>
                          )}
                        </div>
                      )}
                      {user.registrar && (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{user.registrar}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex-wrap gap-2 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => window.location.href = `/user-profile/${user.id}`} className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = `/user-profile/${user.id}`} className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />Edit
                      </Button>
                      {!user.password_set && !user.is_demo && (
                        <Button variant="default" size="sm" onClick={() => handleResendInvite(user.email)} className="flex-1">
                          <Mail className="h-3 w-3 mr-1" />Resend
                        </Button>
                      )}
                      {user.user_id !== currentUser?.id && (
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.user_id, user.email)} className="flex-1">
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
>>>>>>> feature/settings-management
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
<<<<<<< HEAD
                    <TableHead>Registrar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Station</TableHead>
=======
                    <TableHead>Station</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registrar</TableHead>
>>>>>>> feature/settings-management
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
<<<<<<< HEAD
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.mobile_number && (
                            <p className="text-xs text-muted-foreground">{user.mobile_number}</p>
                          )}
=======
                        <div className="flex items-center gap-3">
                          <Avatar className={cn('h-8 w-8', getAvatarColor(user.role))}>
                            <AvatarFallback className="text-white text-sm font-bold">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            {user.mobile_number && (
                              <p className="text-xs text-muted-foreground truncate">{user.mobile_number}</p>
                            )}
                          </div>
>>>>>>> feature/settings-management
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
<<<<<<< HEAD
                        <span className="text-sm">
                          {user.registrar || 'N/A'}
                        </span>
=======
                        {user.station_id ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{user.station_id}</p>
                            {user.center_address && (
                              <p className="text-xs text-muted-foreground truncate">{user.center_address}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
>>>>>>> feature/settings-management
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(getUserStatus(user))}
                      </TableCell>
                      <TableCell>
<<<<<<< HEAD
                        <div className="text-sm">
                          <p>{user.station_id || 'N/A'}</p>
                          {user.center_address && (
                            <p className="text-muted-foreground text-xs truncate max-w-32">
                              {user.center_address}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.href = `/user-profile/${user.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View/Edit Profile
                            </DropdownMenuItem>
                            {!user.password_set && !user.is_demo && (
                              <DropdownMenuItem onClick={() => handleResendInvite(user.email)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            {user.user_id !== currentUser?.id && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user.user_id, user.email)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
=======
                        {user.registrar || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{format(new Date(user.created_at), 'MMM dd, yyyy')}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.location.href = `/user-profile/${user.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.location.href = `/user-profile/${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!user.password_set && !user.is_demo && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResendInvite(user.email)}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.user_id !== currentUser?.id && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(user.user_id, user.email)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
>>>>>>> feature/settings-management
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
<<<<<<< HEAD
            </div>
=======
            </motion.div>
>>>>>>> feature/settings-management
          )}
        </div>
      </GlassCard>
    </div>
  );
}