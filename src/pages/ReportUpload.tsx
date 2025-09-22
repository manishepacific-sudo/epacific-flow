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
import { DataPreview } from "@/components/ui/data-preview";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parseReport } from "@/utils/reportParser";
import { ParsedReportData } from "@/types";

export default function ReportUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [reportData, setReportData] = useState<ParsedReportData | null>(null);
  const [reportDate, setReportDate] = useState<Date | undefined>();
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setReportData(null);

    try {
      const parsedData = await parseReport(selectedFile);
      setReportData(parsedData);
      toast({
        title: "File parsed successfully",
        description: `Found total amount: ₹${parsedData.amount.toLocaleString()}`,
      });
    } catch (error) {
      toast({
        title: "Parsing failed",
        description: error instanceof Error ? error.message : "Failed to parse file",
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setParsing(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/html': ['.html', '.htm'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleSubmit = async () => {
    if (!file || !user || !reportDate || !reportData) {
      toast({
        title: "Missing information",
        description: "Please select a file, report date, and ensure file is parsed",
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

      // Create report record with parsed amount
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          attachment_url: fileName,
          amount: reportData.amount,
          status: 'pending_approval'
        })
        .select()
        .single();

      if (reportError) throw reportError;

      toast({
        title: "Report sent for approval",
        description: "Proceed to payment. Redirecting to payment page...",
      });
      
      // Store parsed amount in sessionStorage for payment page
      sessionStorage.setItem('reportAmount', reportData.amount.toString());
      
      // Redirect to payment page
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
                {parsing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full"
                  />
                ) : file ? (
                  <Check className="w-16 h-16 mx-auto mb-4 text-success" />
                ) : (
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                )}
              </motion.div>

              {parsing ? (
                <div>
                  <p className="text-lg font-medium mb-2">Parsing file...</p>
                  <p className="text-muted-foreground">Please wait while we analyze your report</p>
                </div>
              ) : file ? (
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
                    <Badge variant="secondary">CSV</Badge>
                    <Badge variant="secondary">HTML</Badge>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Report Details */}
        {reportData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8"
          >
            {/* Report Summary */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-success" />
                <h3 className="text-lg font-semibold">Report Summary</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 glass-button rounded-lg">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="text-2xl font-bold text-success">
                    ₹{reportData.amount.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 glass-button rounded-lg">
                  <span className="text-muted-foreground">Records Count</span>
                  <span className="font-medium">
                    {reportData.preview.length}+ entries
                  </span>
                </div>
                
                <div className="space-y-2">
                  <Label className="pl-3 text-lg">Report Date *</Label>
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
                        onSelect={(date) => {
                          setReportDate(date);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Button 
                  variant="hero" 
                  className="w-64 items-center gap-2 justify-center mx-auto" 
                  onClick={handleSubmit}
                  loading={uploading}
                  disabled={!file || !reportDate || !reportData}
                >
                  {uploading ? 'Submitting...' : 'Submit for Approval'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>

            {/* Data Preview */}
            <DataPreview 
              data={{
                headers: reportData.headers,
                preview: reportData.preview,
                total: reportData.preview.length
              }}
            />
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
                  <li>• CSV files (.csv)</li>
                  <li>• HTML files (.html, .htm)</li>
                  <li>• Maximum file size: 10MB</li>
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
