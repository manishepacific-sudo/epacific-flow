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
  const [reportData, setReportData] = useState<ParsedReportData | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
    if (!file || !user || !title.trim() || !description.trim() || !reportDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields including report date",
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

      // Create report record
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          attachment_url: fileName,
          status: 'pending_review'
        })
        .select()
        .single();

      if (reportError) throw reportError;

      toast({
        title: "Report submitted successfully",
        description: "Redirecting to payment page...",
      });
      
      // Redirect immediately to payment page
      navigate(`/payments?reportId=${report.id}`);
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
            Upload your CSV or HTML report file to calculate the total amount
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
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Report Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter report title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your report..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={3}
                    />
                  </div>
                </div>
                
                <Button 
                  variant="hero" 
                  className="w-full" 
                  onClick={handleSubmit}
                  loading={uploading}
                  disabled={!file || !title.trim() || !description.trim() || !reportDate}
                >
                  {uploading ? 'Submitting...' : 'Submit for Approval'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </GlassCard>

            {/* Data Preview */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Data Preview</h3>
              </div>
              
              <div className="space-y-3">
                {reportData ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      First {reportData.preview.length} rows from your file:
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {reportData.preview.map((row, index) => (
                        <div key={index} className="p-3 glass-button rounded-lg text-xs">
                          <div className="grid gap-1">
                            {Object.entries(row).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground truncate max-w-24">
                                  {key}:
                                </span>
                                <span className="font-medium truncate">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                      <span className="text-xs text-blue-400">
                        Showing preview of parsed data
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Upload a file to see preview
                  </div>
                )}
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
                <h4 className="font-medium mb-2">CSV Files</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Must contain a column with "TOTAL_AMOUNT_CHARGED"</li>
                  <li>• Or any column containing "amount"</li>
                  <li>• Numeric values only (commas and currency symbols are OK)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">HTML Files</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Must contain a table with amount column</li>
                  <li>• Table header should include "Total amount charged"</li>
                  <li>• Or any header containing "amount"</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}