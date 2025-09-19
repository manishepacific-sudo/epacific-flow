import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  Calendar as CalendarIcon,
  DollarSign,
  Eye,
  ArrowRight
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parseReport } from "@/utils/reportParser";
import { ParsedReportData } from "@/types";

export default function ReportUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [reportDate, setReportDate] = useState<Date>();
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    toast({
      title: "File uploaded successfully",
      description: `${selectedFile.name} is ready for submission`,
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const handleSubmit = async () => {
    if (!file || !user || !reportDate) {
      toast({
        title: "Missing information",
        description: "Please select a file and report date",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('report-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create report record with default title and description
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          attachment_url: fileName,
          status: 'pending'
        })
        .select()
        .single();

      if (reportError) throw reportError;

      toast({
        title: "Report submitted successfully",
        description: "Redirecting to payment page...",
      });
      
      // Redirect immediately to payment page
      navigate(`/payment/${report.id}`);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Submission failed",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout role="user">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            Upload Monthly Report
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Upload your monthly report file for submission
          </p>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : file 
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
                {file ? (
                  <Check className="w-16 h-16 mx-auto mb-4 text-success" />
                ) : (
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                )}
              </motion.div>

              {file ? (
                <div>
                  <p className="text-lg font-medium mb-2 text-success">
                    File uploaded successfully
                  </p>
                  <p className="text-muted-foreground">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop your report file'}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    Or click to browse files
                  </p>
                  <div className="flex justify-center gap-2">
                    <Badge variant="secondary">PDF</Badge>
                    <Badge variant="secondary">Excel</Badge>
                    <Badge variant="secondary">Image</Badge>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Report Details */}
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Report Details</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 glass-button rounded-lg">
                  <span className="text-muted-foreground">Selected File</span>
                  <span className="font-medium">
                    {file.name}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <Label>Report Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reportDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reportDate ? format(reportDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={reportDate}
                        onSelect={setReportDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Button 
                  variant="hero" 
                  className="w-full" 
                  onClick={handleSubmit}
                  loading={uploading}
                  disabled={!file || !reportDate}
                >
                  {uploading ? 'Submitting...' : 'Submit Report'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">File Requirements</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Supported Files</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• PDF documents</li>
                  <li>• Excel files (.xls, .xlsx)</li>
                  <li>• Image files (PNG, JPG, JPEG)</li>
                  <li>• Maximum file size: 20MB</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Submission Process</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Upload your monthly report file</li>
                  <li>• Select the report date</li>
                  <li>• Submit for approval and payment</li>
                  <li>• Complete payment after submission</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}