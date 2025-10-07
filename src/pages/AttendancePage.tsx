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
  Loader2
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface LocationState {
  loading: boolean;
  error: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  address: string | null;
}

export default function AttendancePage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [location, setLocation] = useState<LocationState>({
    loading: true,
    error: null,
    coordinates: null,
    address: null,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setPhoto(null);
    setUploading(false);
  };

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
        });

        // Optional: Reverse geocoding using OpenStreetMap Nominatim API
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
          );
          const data = await response.json();
          
          const address = data.address;
          const addressString = [
            address.city || address.town || address.village,
            address.state,
            address.country
          ].filter(Boolean).join(", ");

          setLocation(prev => ({
            ...prev,
            address: addressString || "Address not available",
          }));
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          // Keep the coordinates even if reverse geocoding fails
        }
      },
      (error) => {
        let errorMessage = "Unable to fetch location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        
        setLocation({
          loading: false,
          error: errorMessage,
          coordinates: null,
          address: null,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const handleSubmit = async () => {
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
        description: "Please upload your attendance photo",
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

    setUploading(true);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload photo to storage
      const fileName = `${user.id}/${Date.now()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, photo);
        
      if (uploadError) throw uploadError;

      // Insert attendance record
      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          photo_url: fileName,
          location_latitude: location.coordinates.latitude,
          location_longitude: location.coordinates.longitude,
          location_address: location.address,
          attendance_date: new Date().toISOString().split('T')[0]
        });
        
      if (insertError) {
        // Clean up uploaded photo if insert fails
        await supabase.storage.from('attendance-photos').remove([fileName]);
        
        if (insertError.code === '23505') {
          throw new Error('You have already submitted attendance for today');
        }
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Attendance recorded successfully",
      });
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to submit attendance',
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
      const coordsText = `${location.coordinates.latitude.toFixed(6)}, ${location.coordinates.longitude.toFixed(6)}`;
      return location.address || coordsText;
    }
    return "Location unavailable";
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
            Mark Attendance
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Upload your photo to mark today's attendance
          </p>
        </motion.div>

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
                  <p className={`font-medium text-xs ${location.error ? 'text-destructive' : ''}`}>
                    {getLocationDisplay()}
                  </p>
                  {location.coordinates && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Photo Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Upload Attendance Photo</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : photo 
                    ? 'border-success bg-success/5' 
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <input {...getInputProps()} />
              
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: isDragActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {photo ? (
                  <>
                    <Check className="w-16 h-16 mx-auto mb-4 text-success" />
                    <div className="mb-4">
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt="Attendance preview" 
                        className="w-32 h-32 mx-auto rounded-lg object-cover border-2 border-success"
                      />
                    </div>
                  </>
                ) : (
                  <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                )}
              </motion.div>

              {photo ? (
                <div>
                  <p className="text-lg font-medium mb-2 text-success">
                    Photo uploaded successfully
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to change photo
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? 'Drop your photo here' : 'Take or upload attendance photo'}
                  </p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Drag & drop or click to browse
                  </p>
                  <div className="flex justify-center gap-2">
                    <Badge variant="secondary">JPG</Badge>
                    <Badge variant="secondary">PNG</Badge>
                  </div>
                </div>
              )}
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

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button 
            variant="hero" 
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            loading={uploading}
            disabled={!photo}
          >
            {uploading ? 'Submitting...' : 'Submit Attendance'}
            <Upload className="ml-2 h-5 w-5" />
          </Button>
          
          <p className="text-center text-xs text-muted-foreground mt-3">
            Your attendance will be reviewed by a manager within 2 hours
          </p>
        </motion.div>   
      </div>
    </Layout>
  );
}