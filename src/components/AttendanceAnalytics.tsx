import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  MapPin, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';

interface AttendanceAnalytics {
  date: string;
  total_attendance: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  valid_location_count: number;
  invalid_location_count: number;
  avg_distance_from_office: number | null;
}

interface AnalyticsSummary {
  totalUsers: number;
  totalAttendance: number;
  approvedAttendance: number;
  rejectedAttendance: number;
  pendingAttendance: number;
  averageDistance: number;
  validLocationPercentage: number;
}

export default function AttendanceAnalytics() {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if attendance table exists, if not return empty data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('attendance_date', dateRange.from)
        .lte('attendance_date', dateRange.to)
        .order('attendance_date', { ascending: false });

      if (attendanceError) {
        // If table doesn't exist, return empty analytics
        if (attendanceError.message?.includes('does not exist') || 
            attendanceError.message?.includes('schema cache')) {
          console.warn('Attendance table not found, returning empty analytics');
          setAnalytics([]);
          setSummary({
            totalUsers: 0,
            totalAttendance: 0,
            approvedAttendance: 0,
            rejectedAttendance: 0,
            pendingAttendance: 0,
            averageDistance: 0,
            validLocationPercentage: 0
          });
          return;
        }
        throw attendanceError;
      }

      // Group data by date and calculate analytics
      const groupedData = (attendanceData || []).reduce((acc, record) => {
        const date = record.attendance_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            total_attendance: 0,
            approved_count: 0,
            rejected_count: 0,
            pending_count: 0,
            valid_location_count: 0,
            invalid_location_count: 0,
            avg_distance_from_office: 0,
            total_distance: 0,
            distance_count: 0
          };
        }
        
        acc[date].total_attendance++;
        
        if (record.status === 'approved') acc[date].approved_count++;
        else if (record.status === 'rejected') acc[date].rejected_count++;
        else acc[date].pending_count++;
        
        if (record.geofence_valid) acc[date].valid_location_count++;
        else acc[date].invalid_location_count++;
        
        if (record.distance_from_office) {
          acc[date].total_distance += record.distance_from_office;
          acc[date].distance_count++;
        }
      }, {} as Record<string, any>);

      // Calculate averages and format data
      const analyticsData = Object.values(groupedData).map((day: any) => ({
        ...day,
        avg_distance_from_office: day.distance_count > 0 ? day.total_distance / day.distance_count : 0
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAnalytics(analyticsData);

      // Calculate summary statistics
      const totalAttendance = analyticsData?.reduce((sum, day) => sum + day.total_attendance, 0) || 0;
      const approvedAttendance = analyticsData?.reduce((sum, day) => sum + day.approved_count, 0) || 0;
      const rejectedAttendance = analyticsData?.reduce((sum, day) => sum + day.rejected_count, 0) || 0;
      const pendingAttendance = analyticsData?.reduce((sum, day) => sum + day.pending_count, 0) || 0;
      const validLocationCount = analyticsData?.reduce((sum, day) => sum + day.valid_location_count, 0) || 0;
      const totalLocationCount = validLocationCount + (analyticsData?.reduce((sum, day) => sum + day.invalid_location_count, 0) || 0);
      
      const avgDistance = analyticsData?.reduce((sum, day) => {
        return sum + (day.avg_distance_from_office || 0);
      }, 0) / (analyticsData?.length || 1);

      // Get total users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['user', 'manager']);

      setSummary({
        totalUsers: totalUsers || 0,
        totalAttendance,
        approvedAttendance,
        rejectedAttendance,
        pendingAttendance,
        averageDistance: Math.round(avgDistance),
        validLocationPercentage: totalLocationCount > 0 ? Math.round((validLocationCount / totalLocationCount) * 100) : 0
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportAnalytics = () => {
    try {
      const exportData = analytics.map(day => ({
        'Date': format(new Date(day.date), 'yyyy-MM-dd'),
        'Total Attendance': day.total_attendance,
        'Approved': day.approved_count,
        'Rejected': day.rejected_count,
        'Pending': day.pending_count,
        'Valid Locations': day.valid_location_count,
        'Invalid Locations': day.invalid_location_count,
        'Avg Distance (m)': Math.round(day.avg_distance_from_office || 0)
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Analytics');
      XLSX.writeFile(wb, `attendance_analytics_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({
        title: 'Success',
        description: 'Analytics data exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export analytics data',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Analytics</h2>
          <p className="text-muted-foreground">Comprehensive attendance insights and trends</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{summary.totalAttendance}</p>
                <p className="text-sm text-muted-foreground">Total Attendance</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{summary.approvedAttendance}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{summary.validLocationPercentage}%</p>
                <p className="text-sm text-muted-foreground">Valid Locations</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.slice(0, 7).map((day, index) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">
                      {format(new Date(day.date), 'MMM dd')}
                    </div>
                    <Badge variant="outline">
                      {day.total_attendance} total
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600">{day.approved_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-600">{day.rejected_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-yellow-600">{day.pending_count}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Approved</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{summary.approvedAttendance}</p>
                      <p className="text-xs text-muted-foreground">
                        {summary.totalAttendance > 0 ? Math.round((summary.approvedAttendance / summary.totalAttendance) * 100) : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Rejected</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{summary.rejectedAttendance}</p>
                      <p className="text-xs text-muted-foreground">
                        {summary.totalAttendance > 0 ? Math.round((summary.rejectedAttendance / summary.totalAttendance) * 100) : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Pending</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-600">{summary.pendingAttendance}</p>
                      <p className="text-xs text-muted-foreground">
                        {summary.totalAttendance > 0 ? Math.round((summary.pendingAttendance / summary.totalAttendance) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg border">
              <p className="text-2xl font-bold text-green-600">{summary?.validLocationPercentage}%</p>
              <p className="text-sm text-muted-foreground">Valid Locations</p>
            </div>
            <div className="text-center p-4 rounded-lg border">
              <p className="text-2xl font-bold text-blue-600">{summary?.averageDistance}m</p>
              <p className="text-sm text-muted-foreground">Avg Distance</p>
            </div>
            <div className="text-center p-4 rounded-lg border">
              <p className="text-2xl font-bold text-purple-600">
                {summary ? 100 - summary.validLocationPercentage : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Invalid Locations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.slice(0, 5).map((day, index) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{format(new Date(day.date), 'MMMM dd, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      {day.total_attendance} attendance records
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">{day.approved_count} approved</Badge>
                  <Badge variant="destructive">{day.rejected_count} rejected</Badge>
                  <Badge variant="secondary">{day.pending_count} pending</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

