import { useState, useEffect, useCallback } from 'react';
import { Camera, CheckCircle2, XCircle, Clock, Eye, Download, Edit, Trash2, User, MapPin, Calendar, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import SearchFilterExport from '@/components/shared/SearchFilterExport';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useIsMobile } from '@/hooks/use-mobile';

interface AttendanceRecord {
  id: string;
  user_id: string;
  photo_url: string;
  location_latitude: number;
  location_longitude: number;
  location_address: string;
  attendance_date: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'checked_in' | 'checked_out';
  manager_notes?: string;
  check_in_time?: string;
  check_out_time?: string;
  city?: string;
  remarks?: string;
  geofence_valid: boolean;
  distance_from_office?: number;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
    email: string;
    mobile_number: string;
    center_address: string;
    registrar: string;
  };
}

const filterConfig = {
  statuses: ['pending_approval', 'approved', 'rejected', 'checked_in', 'checked_out'],
  additionalFilters: [
    {
      key: 'approval',
      label: 'Approval Status',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Pending Approval', value: 'pending_approval' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Checked In', value: 'checked_in' },
        { label: 'Checked Out', value: 'checked_out' },
      ],
    },
    {
      key: 'geofence',
      label: 'Location Status',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Valid Location', value: 'valid' },
        { label: 'Invalid Location', value: 'invalid' },
      ],
    },
  ],
};

export default function AttendanceManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAttendance, setProcessingAttendance] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    registrar: '',
    status: '',
    approval: '',
    geofence: '',
    dateRange: { from: null, to: null },
  });

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      
      try {
        // Try edge function first
        const response = await supabase.functions.invoke('get-attendance', {
          body: { admin_email: profile?.email },
        });
        data = response.data?.attendance;
      } catch (error) {
        // Fallback to direct query
        const { data: queryData, error: queryError } = await supabase
          .from('attendance')
          .select('*, profiles(full_name, email, mobile_number, center_address, registrar)')
          .order('created_at', { ascending: false });

        if (queryError) {
          // If attendance table doesn't exist, return empty data
          if (queryError.message?.includes('does not exist') || 
              queryError.message?.includes('schema cache')) {
            console.warn('Attendance table not found, returning empty attendance data');
            data = [];
          } else {
            throw queryError;
          }
        } else {
          data = queryData;
        }
      }

      setAttendance(data || []);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to fetch attendance records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.email, toast]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleAttendanceAction = async (
    attendanceId: string,
    action: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      setProcessingAttendance(prev => new Set(prev).add(attendanceId));
      const { error } = await supabase
        .from('attendance')
        .update({ status: action, manager_notes: notes })
        .eq('id', attendanceId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Attendance ${action} successfully`,
      });

      await fetchAttendance();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message || `Failed to ${action} attendance`,
        variant: 'destructive',
      });
    } finally {
      setProcessingAttendance(prev => {
        const next = new Set(prev);
        next.delete(attendanceId);
        return next;
      });
    }
  };

  const viewPhoto = async (photoPath: string) => {
    try {
      const { data: { signedUrl }, error } = await supabase
        .storage
        .from('attendance-photos')
        .createSignedUrl(photoPath, 300);

      if (error) throw error;
      window.open(signedUrl, '_blank');
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to view photo',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPhoto = async (photoPath: string, attendanceId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('attendance-photos')
        .createSignedUrl(photoPath, 300);
      
      if (error) throw error;
      
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = `attendance-photo-${attendanceId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Attendance photo is being downloaded.",
      });
    } catch (error: unknown) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: (error as Error).message || "Unable to download attendance photo.",
        variant: "destructive"
      });
    }
  };

  const handleEditAttendance = async (attendanceId: string, currentNotes?: string) => {
    // Return early if user is not admin or manager
    if (!profile?.role || !['admin', 'manager'].includes(profile.role)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to edit attendance records.',
        variant: 'destructive',
      });
      return;
    }

    const notes = prompt("Edit manager notes:", currentNotes || "");
    if (notes === null) return; // User cancelled
    
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ manager_notes: notes })
        .eq('id', attendanceId);
      
      if (error) throw error;
      
      toast({
        title: "Notes updated",
        description: "Attendance notes have been updated successfully.",
      });
      
      fetchAttendance();
    } catch (error: unknown) {
      console.error('Edit error:', error);
      toast({
        title: "Update failed",
        description: (error as Error).message || "Failed to update attendance notes.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAttendance = async (attendanceId: string, userName: string) => {
    const confirmed = confirm(`Are you sure you want to delete the attendance record for "${userName}"? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', attendanceId);
      
      if (error) throw error;
      
      toast({
        title: "Attendance deleted",
        description: "Attendance record has been deleted successfully.",
      });
      
      await fetchAttendance();
    } catch (error: unknown) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: (error as Error).message || "Failed to delete attendance record.",
        variant: "destructive"
      });
    }
  };

  const filteredAttendance = attendance.filter((record) => {
    const searchMatch =
      !searchValue ||
      record.profiles.full_name.toLowerCase().includes(searchValue.toLowerCase()) ||
      record.profiles.email.toLowerCase().includes(searchValue.toLowerCase()) ||
      record.location_address.toLowerCase().includes(searchValue.toLowerCase()) ||
      (record.city && record.city.toLowerCase().includes(searchValue.toLowerCase()));

    const statusMatch =
      !filters.status || record.status === filters.status;

    const approvalMatch =
      !filters.approval || filters.approval === 'all' || record.status === filters.approval;

    const geofenceMatch =
      !filters.geofence || 
      filters.geofence === 'all' || 
      (filters.geofence === 'valid' && record.geofence_valid) ||
      (filters.geofence === 'invalid' && !record.geofence_valid);

    const registrarMatch =
      !filters.registrar || record.profiles.registrar === filters.registrar;

    const dateMatch =
      (!filters.dateRange.from ||
        new Date(record.attendance_date) >= new Date(filters.dateRange.from)) &&
      (!filters.dateRange.to ||
        new Date(record.attendance_date) <= new Date(filters.dateRange.to));

    return searchMatch && statusMatch && approvalMatch && geofenceMatch && registrarMatch && dateMatch;
  });

  const exportToExcel = () => {
    try {
      const exportData = filteredAttendance.map((record) => ({
        'User Name': record.profiles.full_name,
        'Email': record.profiles.email,
        'Registrar': record.profiles.registrar,
        'Date': format(new Date(record.attendance_date), 'yyyy-MM-dd'),
        'Check-in Time': record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm:ss') : '',
        'Check-out Time': record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm:ss') : '',
        'Location': record.location_address,
        'City': record.city || '',
        'Status': record.status,
        'Geofence Valid': record.geofence_valid ? 'Yes' : 'No',
        'Distance from Office': record.distance_from_office ? `${Math.round(record.distance_from_office)}m` : '',
        'Manager Notes': record.manager_notes || '',
        'Created Date': format(new Date(record.created_at), 'yyyy-MM-dd HH:mm:ss'),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `attendance_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({
        title: 'Success',
        description: 'Attendance data exported successfully',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to export attendance data',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'checked_in':
        return <Badge variant="secondary">Checked In</Badge>;
      case 'checked_out':
        return <Badge variant="default">Complete</Badge>;
      case 'pending_approval':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checked_in':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'checked_out':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPhotoGradient = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-gradient-to-br from-green-500 to-emerald-600';
      case 'rejected':
        return 'bg-gradient-to-br from-red-500 to-rose-600';
      case 'pending':
        return 'bg-gradient-to-br from-yellow-500 to-amber-600';
      default:
        return 'bg-gradient-to-br from-blue-500 to-cyan-600';
    }
  };

  return (
    <Layout role={profile?.role}>
      <div className={cn("space-y-6", isMobile && "pb-20")}>
        <div>
          <h2 className="text-2xl font-bold">Attendance Management</h2>
          <p className="text-muted-foreground mt-2">
            Manage and review attendance submissions
          </p>
        </div>

        <SearchFilterExport
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={{
            ...filters,
            useReportDate: false
          }}
          onFiltersChange={setFilters}
          filterConfig={filterConfig}
          onExport={exportToExcel}
          onRefresh={fetchAttendance}
        />

        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Camera className="h-12 w-12 mb-4" />
                <p>No attendance records found</p>
              </div>
            ) : isMobile ? (
              <motion.div
                className="grid grid-cols-1 gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.07,
                      delayChildren: 0.2
                    }
                  }
                }}
              >
                {filteredAttendance.map((record) => (
                  <motion.div
                    key={record.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { 
                        opacity: 1, 
                        y: 0,
                        transition: {
                          duration: 0.3
                        }
                      }
                    }}
                    whileHover={{ y: -4 }}
                  >
                    <Card variant="interactive" size="default" className="group relative overflow-hidden h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-4">
                          <div className={cn("h-16 w-16 rounded-xl flex items-center justify-center shadow-lg cursor-pointer", getPhotoGradient(record.status))} onClick={() => viewPhoto(record.photo_url)}>
                            <Camera className="h-8 w-8 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-primary-glow">
                                <AvatarFallback className="text-white text-xs font-semibold">
                                  {record.profiles?.full_name ? getInitials(record.profiles.full_name) : <User className="h-4 w-4 text-white" />}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{record.profiles.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{record.profiles.email}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="absolute top-4 right-4 flex items-center gap-1">
                            {getStatusIcon(record.status)}
                            {getStatusBadge(record.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className={cn("rounded-xl p-4 text-center", getPhotoGradient(record.status))}>
                          <p className="text-xs text-white/80 font-medium">Attendance Date</p>
                          <p className="text-lg font-bold text-white">{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          {/* Check-in/Check-out Times */}
                          {(record.check_in_time || record.check_out_time) && (
                            <div className="space-y-1">
                              {record.check_in_time && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="text-muted-foreground">Check-in:</span>
                                  <span className="ml-auto">{format(new Date(record.check_in_time), 'HH:mm')}</span>
                                </div>
                              )}
                              {record.check_out_time && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-blue-500" />
                                  <span className="text-muted-foreground">Check-out:</span>
                                  <span className="ml-auto">{format(new Date(record.check_out_time), 'HH:mm')}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-muted-foreground text-xs mb-1">Location:</p>
                              {record.city && (
                                <p className="text-sm font-semibold text-primary mb-1">📍 {record.city}</p>
                              )}
                              <p className="text-sm truncate" title={record.location_address}>{record.location_address}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {record.location_latitude.toFixed(6)}, {record.location_longitude.toFixed(6)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Geofencing Status */}
                          <div className="flex items-center gap-2">
                            {record.geofence_valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-muted-foreground">Location:</span>
                            <span className="ml-auto text-xs">
                              {record.geofence_valid ? 'Valid' : 'Invalid'}
                              {record.distance_from_office && ` (${Math.round(record.distance_from_office)}m)`}
                            </span>
                          </div>
                          
                          {record.profiles?.registrar && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Registrar:</span>
                              <span className="ml-auto">{record.profiles.registrar}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Submitted:</span>
                            <span className="ml-auto">{format(new Date(record.created_at), 'MMM dd, HH:mm')}</span>
                          </div>
                        </div>
                        {record.manager_notes && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Manager Notes:</p>
                            <p className="text-sm">{record.manager_notes}</p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex-wrap gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewPhoto(record.photo_url)}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPhoto(record.photo_url, record.id)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        
                        {profile?.role && ['admin', 'manager'].includes(profile.role) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAttendance(record.id, record.manager_notes)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        
                        {record.status === 'pending_approval' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAttendanceAction(record.id, 'approved')}
                              disabled={processingAttendance.has(record.id)}
                              className="flex-1"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const notes = prompt("Rejection reason (optional):");
                                handleAttendanceAction(record.id, 'rejected', notes || undefined);
                              }}
                              disabled={processingAttendance.has(record.id)}
                              className="flex-1"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {profile?.role === 'admin' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAttendance(record.id, record.profiles.full_name)}
                            className="flex-1"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Photo</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Registrar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getInitials(record.profiles.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{record.profiles.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{record.profiles.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("p-0 h-8 w-8 rounded-full", getPhotoGradient(record.status))}
                            onClick={() => viewPhoto(record.photo_url)}
                          >
                            <Camera className="h-4 w-4 text-white" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(record.created_at), 'HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2 max-w-[200px]">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              {record.city && (
                                <p className="text-sm font-semibold text-primary mb-1">📍 {record.city}</p>
                              )}
                              <p className="truncate text-sm" title={record.location_address}>
                                {record.location_address}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {record.location_latitude.toFixed(6)}, {record.location_longitude.toFixed(6)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{record.profiles.registrar}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.status)}
                            {getStatusBadge(record.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewPhoto(record.photo_url)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPhoto(record.photo_url, record.id)}
                              className="h-8 w-8"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {profile?.role && ['admin', 'manager'].includes(profile.role) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditAttendance(record.id, record.manager_notes)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {record.status === 'pending_approval' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAttendanceAction(record.id, 'approved')}
                                  disabled={processingAttendance.has(record.id)}
                                  className="h-8 w-8 text-green-500 hover:text-green-600"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const notes = prompt("Rejection reason (optional):");
                                    handleAttendanceAction(record.id, 'rejected', notes || undefined);
                                  }}
                                  disabled={processingAttendance.has(record.id)}
                                  className="h-8 w-8 text-red-500 hover:text-red-600"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {profile?.role === 'admin' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteAttendance(record.id, record.profiles.full_name)}
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}