import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { 
  Camera, 
  Upload, 
  Check, 
  Calendar,
  Clock,
  MapPin,
  User
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function AttendancePage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

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

  const handleSubmit = async () => {
    if (!photo) {
      toast({
        title: "Photo required",
        description: "Please upload your attendance photo",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      toast({
        title: "Attendance submitted",
        description: "Your attendance has been sent for manager approval",
      });
      setUploading(false);
      setPhoto(null);
    }, 2000);
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      location: "Mumbai, Maharashtra" // Mock location
    };
  };

  const { date, time, location } = getCurrentDateTime();

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
                <MapPin className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium text-xs">{location}</p>
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