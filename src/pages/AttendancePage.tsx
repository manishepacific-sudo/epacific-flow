import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { 
  Camera, 
  Upload, 
  Check, 
  Calendar,
  Clock,
  MapPin,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  LogOut
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import CameraCapture from "@/components/CameraCapture";
import { reverseGeocode, formatCoordinates, validateCoordinates } from "@/utils/reverseGeocoding";
import { getOfficeLocation, getGeofenceConfig, validateGeofence, formatDistance } from "@/utils/geofencing";

interface LocationState {
  loading: boolean;
  error: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  address: string | null;
  city: string | null;
  accuracy: number | null;
}

interface AttendanceState {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string | null;
}

interface GeofenceState {
  valid: boolean;
  distance: number | null;
  officeLocation: any;
  config: any;
}

export default function AttendancePage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState<LocationState>({
    loading: true,
    error: null,
    coordinates: null,
    address: null,
    city: null,
    accuracy: null,
  });
  const [attendance, setAttendance] = useState<AttendanceState>({
    hasCheckedIn: false,
    hasCheckedOut: false,
    checkInTime: null,
    checkOutTime: null,
    status: null,
  });
  const [geofence, setGeofence] = useState<GeofenceState>({
    valid: false,
    distance: null,
    officeLocation: null,
    config: null,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setPhoto(null);
    setUploading(false);
  };

  // Check today's attendance status
  const checkTodayAttendance = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('attendance_date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        // If attendance table doesn't exist, treat as no attendance records
        if (error.message?.includes('does not exist') || 
            error.message?.includes('schema cache')) {
          console.warn('Attendance table not found, treating as no attendance records');
          return;
        }
        throw error;
      }

      if (data) {
        setAttendance({
          hasCheckedIn: !!data.check_in_time,
          hasCheckedOut: !!data.check_out_time,
          checkInTime: data.check_in_time,
          checkOutTime: data.check_out_time,
          status: data.status,
        });
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  }, [user]);

  // Load geofencing configuration
  const loadGeofenceConfig = useCallback(async () => {
    try {
      const [officeLocation, config] = await Promise.all([
        getOfficeLocation(supabase),
        getGeofenceConfig(supabase)
      ]);

      setGeofence(prev => ({
        ...prev,
        officeLocation,
        config
      }));
    } catch (error) {
      console.error('Error loading geofence config:', error);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setPhoto(selectedFile);
      toast({
        title: "Photo selected",
        description: "Attendance photo ready for submission",
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  // Fetch user's location on component mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        loading: false,
        error: "Geolocation is not supported by your browser",
        coordinates: null,
        address: null,
        city: null,
        accuracy: null,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        setLocation({
          loading: false,
          error: null,
          coordinates: coords,
          address: null,
          city: null,
          accuracy: position.coords.accuracy,
        });

        // Validate coordinates
        if (!validateCoordinates(coords.latitude, coords.longitude)) {
          setLocation(prev => ({
            ...prev,
            error: "Invalid coordinates received",
          }));
          return;
        }

        // Reverse geocoding to get address and city
        try {
          const geocodingResult = await reverseGeocode(coords.latitude, coords.longitude);
          
          if (geocodingResult) {
            setLocation(prev => ({
              ...prev,
              address: geocodingResult.formatted_address,
              city: geocodingResult.city,
            }));
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          setLocation(prev => ({
            ...prev,
            address: "Address not available",
            city: "Unknown Location",
          }));
        }

        // Validate geofencing if office location is available
        if (geofence.officeLocation) {
          const geofenceResult = validateGeofence(
            coords.latitude,
            coords.longitude,
            geofence.officeLocation
          );
          
          setGeofence(prev => ({
            ...prev,
            valid: geofenceResult.valid,
            distance: geofenceResult.distance,
          }));
        }
      },
      (error) => {
        let errorMessage = "Unable to fetch location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permission denied - Please allow location access";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable - Please check your GPS";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out - Please try again";
            break;
        }
        
        setLocation({
          loading: false,
          error: errorMessage,
          coordinates: null,
          address: null,
          city: null,
          accuracy: null,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000, // Cache for 30 seconds
      }
    );
  }, [geofence.officeLocation]);

  // Initialize component
  useEffect(() => {
    loadGeofenceConfig();
    checkTodayAttendance();
  }, [loadGeofenceConfig, checkTodayAttendance]);

  const handleSubmit = async (action: 'checkin' | 'checkout' = 'checkin') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit attendance",
        variant: "destructive"
      });
      return;
    }

    if (!photo) {
      toast({
        title: "Photo required",
        description: "Please take your attendance photo",
        variant: "destructive"
      });
      return;
    }

    if (!location.coordinates) {
      toast({
        title: "Location required",
        description: "Please allow location access to submit attendance",
        variant: "destructive"
      });
      return;
    }

    // Check geofencing if enabled
    if (geofence.config?.enabled && !geofence.valid) {
      toast({
        title: "Location not allowed",
        description: `You must be within ${formatDistance(geofence.config.radius_meters)} of the office to mark attendance`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      // Upload photo to storage
      const fileName = `${user.id}/${new Date().toISOString().split('T')[0]}-${action}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, photo);
        
      if (uploadError) throw uploadError;

      const now = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];

      if (action === 'checkin') {
        // Insert new attendance record for check-in
        const { error: insertError } = await supabase
          .from('attendance')
          .insert({
            user_id: user.id,
            photo_url: fileName,
            location_latitude: location.coordinates.latitude,
            location_longitude: location.coordinates.longitude,
            location_address: location.address,
            city: location.city,
            attendance_date: today,
            check_in_time: now,
            status: 'checked_in'
          });

        if (insertError) {
          // If attendance table doesn't exist, show error
          if (insertError.message?.includes('does not exist') || 
              insertError.message?.includes('schema cache')) {
            throw new Error('Attendance system is not available. Please contact your administrator.');
          }
          
          // Clean up uploaded photo if insert fails
          await supabase.storage.from('attendance-photos').remove([fileName]);
          
          if (insertError.code === '23505') {
            throw new Error('You have already checked in for today');
          }
          throw insertError;
        }

        toast({
          title: "Check-in Successful",
          description: "You have successfully checked in for today",
        });
      } else {
        // Update existing record for check-out
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: now,
            status: 'checked_out'
          })
          .eq('user_id', user.id)
          .eq('attendance_date', today);

        if (updateError) {
          // If attendance table doesn't exist, show error
          if (updateError.message?.includes('does not exist') || 
              updateError.message?.includes('schema cache')) {
            throw new Error('Attendance system is not available. Please contact your administrator.');
          }
          
          // Clean up uploaded photo if update fails
          await supabase.storage.from('attendance-photos').remove([fileName]);
          throw updateError;
        }

        toast({
          title: "Check-out Successful",
          description: "You have successfully checked out for today",
        });
      }

      resetForm();
      await checkTodayAttendance(); // Refresh attendance status
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action}`,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
    };
  };

  const { date, time } = getCurrentDateTime();

  const getLocationDisplay = () => {
    if (location.loading) {
      return "Fetching precise location...";
    }
    if (location.error) {
      return `Unable to fetch location: ${location.error}`;
    }
    if (location.coordinates) {
      // Prioritize showing full address, then coordinates as fallback
      return location.address || formatCoordinates(location.coordinates.latitude, location.coordinates.longitude);
    }
    return "Location unavailable";
  };

  const handleCameraCapture = (file: File) => {
    setPhoto(file);
    setShowCamera(false);
    toast({
      title: "Photo Captured",
      description: "Attendance photo ready for submission",
    });
  };

  const getGeofenceStatus = () => {
    if (!geofence.config?.enabled) return null;
    
    if (geofence.valid) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: `Within office area (${formatDistance(geofence.distance || 0)} away)`,
        color: "text-green-600"
      };
    } else {
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        text: `Outside office area (${formatDistance(geofence.distance || 0)} away)`,
        color: "text-red-600"
      };
    }
  };

  return (
    <Layout role="user">
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            Daily Attendance
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Mark your check-in and check-out for today
          </p>
        </motion.div>

        {/* Today's Status */}
        {attendance.status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <GlassCard className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">Today's Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 glass-button rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Check-in</p>
                    <p className="font-medium">
                      {attendance.checkInTime 
                        ? new Date(attendance.checkInTime).toLocaleTimeString()
                        : 'Not checked in'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 glass-button rounded-lg">
                  <LogOut className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Check-out</p>
                    <p className="font-medium">
                      {attendance.checkOutTime 
                        ? new Date(attendance.checkOutTime).toLocaleTimeString()
                        : 'Not checked out'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Current Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Current Session</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 glass-button rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 glass-button rounded-lg">
                <Clock className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium">{time}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 glass-button rounded-lg">
                {location.loading ? (
                  <Loader2 className="h-5 w-5 text-warning animate-spin" />
                ) : (
                  <MapPin className={`h-5 w-5 ${location.error ? 'text-destructive' : 'text-warning'}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Location</p>
                  {location.city && (
                    <p className={`font-semibold text-sm ${location.error ? 'text-destructive' : 'text-primary'}`}>
                      📍 {location.city}
                    </p>
                  )}
                  <p className={`font-medium text-xs ${location.error ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {getLocationDisplay()}
                  </p>
                  {location.coordinates && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatCoordinates(location.coordinates.latitude, location.coordinates.longitude)}
                    </p>
                  )}
                  {location.accuracy && (
                    <p className="text-[10px] text-muted-foreground">
                      Accuracy: ±{Math.round(location.accuracy)}m
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Geofencing Status */}
            {getGeofenceStatus() && (
              <div className="mt-4 p-3 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  {getGeofenceStatus()?.icon}
                  <p className={`text-sm font-medium ${getGeofenceStatus()?.color}`}>
                    {getGeofenceStatus()?.text}
                  </p>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Photo Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Attendance Photo</h2>
            
            <div className="space-y-4">
              {/* Camera Button */}
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => setShowCamera(true)}
              >
                <Camera className="h-5 w-5 mr-2" />
                Take Selfie Photo
              </Button>
              
              {/* Or Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              {/* File Upload */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : photo 
                      ? 'border-success bg-success/5' 
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <input {...getInputProps()} />
                
                {photo ? (
                  <div>
                    <Check className="w-12 h-12 mx-auto mb-3 text-success" />
                    <img 
                      src={URL.createObjectURL(photo)} 
                      alt="Attendance preview" 
                      className="w-24 h-24 mx-auto rounded-lg object-cover border-2 border-success mb-3"
                    />
                    <p className="text-sm font-medium text-success mb-1">
                      Photo ready
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">
                      {isDragActive ? 'Drop your photo here' : 'Upload from device'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop or click to browse
                    </p>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Guidelines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Attendance Guidelines</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Ensure your face is clearly visible in the photo</span>
              </div>
              <div className="flex items-start gap-2">
                <Camera className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <span>Photo should be taken in good lighting conditions</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <span>Submit attendance within working hours (9 AM - 6 PM)</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>Attendance should be marked from designated location</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="space-y-3">
            {/* Check-in Button */}
            {!attendance.hasCheckedIn && (
              <Button 
                variant="hero" 
                className="w-full h-12 text-base"
                onClick={() => handleSubmit('checkin')}
                loading={uploading}
                disabled={!photo || !location.coordinates}
              >
                {uploading ? 'Checking in...' : 'Check In'}
                <CheckCircle className="ml-2 h-5 w-5" />
              </Button>
            )}
            
            {/* Check-out Button */}
            {attendance.hasCheckedIn && !attendance.hasCheckedOut && (
              <Button 
                variant="outline" 
                className="w-full h-12 text-base border-blue-500 text-blue-600 hover:bg-blue-50"
                onClick={() => handleSubmit('checkout')}
                loading={uploading}
                disabled={!photo || !location.coordinates}
              >
                {uploading ? 'Checking out...' : 'Check Out'}
                <LogOut className="ml-2 h-5 w-5" />
              </Button>
            )}
            
            {/* Status Messages */}
            {attendance.hasCheckedIn && attendance.hasCheckedOut && (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-medium">Attendance Complete</p>
                <p className="text-green-600 text-sm">You have completed your attendance for today</p>
              </div>
            )}
            
            {attendance.hasCheckedIn && !attendance.hasCheckedOut && (
              <p className="text-center text-xs text-muted-foreground">
                You can check out anytime during working hours
              </p>
            )}
            
            {!attendance.hasCheckedIn && (
              <p className="text-center text-xs text-muted-foreground">
                Take a photo and check in to start your day
              </p>
            )}
          </div>
        </motion.div>
        
        {/* Camera Modal */}
        <CameraCapture
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />   
      </div>
    </Layout>
  );
}