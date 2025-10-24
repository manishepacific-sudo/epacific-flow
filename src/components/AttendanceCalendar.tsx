import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isFuture } from 'date-fns';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  location_address: string | null;
  city: string | null;
  geofence_valid: boolean;
  distance_from_office: number | null;
  manager_notes: string | null;
}

interface CalendarDay {
  date: Date;
  attendance: AttendanceRecord | null;
  isToday: boolean;
  isFuture: boolean;
}

export default function AttendanceCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAttendanceRecords = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('attendance_date', startDate.toISOString().split('T')[0])
        .lte('attendance_date', endDate.toISOString().split('T')[0])
        .order('attendance_date', { ascending: false });

      if (error) {
        // If attendance table doesn't exist, return empty data
        if (error.message?.includes('does not exist') || 
            error.message?.includes('schema cache')) {
          console.warn('Attendance table not found, returning empty calendar data');
          setAttendanceData([]);
          return;
        }
        throw error;
      }

      setAttendanceRecords(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch attendance records',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth, toast]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  const getAttendanceForDate = (date: Date): AttendanceRecord | null => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceRecords.find(record => record.attendance_date === dateStr) || null;
  };

  const getCalendarDays = (): CalendarDay[] => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    return days.map(date => ({
      date,
      attendance: getAttendanceForDate(date),
      isToday: isToday(date),
      isFuture: isFuture(date)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checked_in':
      case 'checked_out':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'pending_approval':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" className="text-xs">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
      case 'checked_in':
        return <Badge variant="secondary" className="text-xs">Checked In</Badge>;
      case 'checked_out':
        return <Badge variant="default" className="text-xs">Complete</Badge>;
      case 'pending_approval':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const viewPhoto = async (photoPath: string) => {
    try {
      const { data: { signedUrl }, error } = await supabase
        .storage
        .from('attendance-photos')
        .createSignedUrl(photoPath, 300);

      if (error) throw error;
      window.open(signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to view photo',
        variant: 'destructive'
      });
    }
  };

  const calendarDays = getCalendarDays();
  const monthStats = {
    total: attendanceRecords.length,
    approved: attendanceRecords.filter(r => r.status === 'approved').length,
    rejected: attendanceRecords.filter(r => r.status === 'rejected').length,
    pending: attendanceRecords.filter(r => r.status === 'pending_approval').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Calendar</h2>
          <p className="text-muted-foreground">View your attendance history</p>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month Stats */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{monthStats.total}</p>
            <p className="text-xs text-muted-foreground">Total Days</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{monthStats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{monthStats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{monthStats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
      </GlassCard>

      {/* Calendar Grid */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const hasAttendance = !!day.attendance;
            const isCurrentMonth = day.date.getMonth() === currentMonth.getMonth();
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                className={`
                  aspect-square p-1 cursor-pointer rounded-lg transition-all duration-200
                  ${!isCurrentMonth ? 'opacity-30' : ''}
                  ${day.isToday ? 'ring-2 ring-primary' : ''}
                  ${hasAttendance ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50'}
                  ${day.isFuture ? 'opacity-50' : ''}
                `}
                onClick={() => hasAttendance && setSelectedRecord(day.attendance)}
              >
                <div className="h-full flex flex-col items-center justify-center text-xs">
                  <span className={`font-medium ${day.isToday ? 'text-primary' : ''}`}>
                    {day.date.getDate()}
                  </span>
                  {hasAttendance && (
                    <div className="mt-1">
                      {getStatusIcon(day.attendance!.status)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* Attendance Details Modal */}
      {selectedRecord && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  {format(new Date(selectedRecord.attendance_date), 'MMMM dd, yyyy')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedRecord(null)}
                >
                  ×
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedRecord.status)}
                  {getStatusBadge(selectedRecord.status)}
                </div>

                {/* Times */}
                <div className="space-y-2">
                  {selectedRecord.check_in_time && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        Check-in: {format(new Date(selectedRecord.check_in_time), 'HH:mm')}
                      </span>
                    </div>
                  )}
                  {selectedRecord.check_out_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">
                        Check-out: {format(new Date(selectedRecord.check_out_time), 'HH:mm')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Location */}
                {selectedRecord.location_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Location:</p>
                      <p className="text-muted-foreground">{selectedRecord.location_address}</p>
                      {selectedRecord.city && (
                        <p className="text-muted-foreground">{selectedRecord.city}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Geofencing */}
                <div className="flex items-center gap-2">
                  {selectedRecord.geofence_valid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {selectedRecord.geofence_valid ? 'Valid location' : 'Outside office area'}
                  </span>
                  {selectedRecord.distance_from_office && (
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(selectedRecord.distance_from_office)}m away)
                    </span>
                  )}
                </div>

                {/* Manager Notes */}
                {selectedRecord.manager_notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Manager Notes:</p>
                    <p className="text-sm">{selectedRecord.manager_notes}</p>
                  </div>
                )}

                {/* View Photo Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => viewPhoto(selectedRecord.photo_url)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Attendance Photo
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

