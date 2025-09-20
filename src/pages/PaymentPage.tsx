import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Smartphone, 
  Upload, 
  Check, 
  AlertCircle,
  ArrowRight,
  FileText,
  DollarSign,
  CalendarIcon
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import RazorpayPayment from "@/components/RazorpayPayment";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportAmount, setReportAmount] = useState<number>(25000);
  const [razorpayPaymentId, setRazorpayPaymentId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (id && user) {
      fetchReport();
    }
  }, [id, user]);

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      if (!data) {
        toast({
          title: "Report not found",
          description: "The requested report could not be found",
          variant: "destructive"
        });
        navigate('/dashboard/user');
        return;
      }

      setReport(data);
      
      // Get amount from report database instead of sessionStorage
      const storedAmount = data.amount || 25000; // Fallback if amount not stored
      setReportAmount(storedAmount);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({
        title: "Error loading report",
        description: "Failed to load report details",
        variant: "destructive"
      });
      navigate('/dashboard/user');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: "phonepe",
      name: "PhonePe",
      icon: Smartphone,
      description: "Pay using PhonePe UPI",
      color: "bg-purple-500",
      available: false
    },
    {
      id: "razorpay",
      name: "Razorpay",
      icon: CreditCard,
      description: "Credit/Debit Card, UPI, Net Banking",
      color: "bg-blue-500",
      available: true
    },
    {
      id: "offline",
      name: "Offline Payment",
      icon: FileText,
      description: "Bank transfer with proof upload",
      color: "bg-secondary",
      available: true
    }
  ];

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setProofFile(file);
      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`,
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleRazorpaySuccess = async (paymentId: string, orderId: string) => {
    setRazorpayPaymentId(paymentId);
    setSelectedMethod("razorpay_completed");
    
    toast({
      title: "Payment successful",
      description: "Please upload payment proof to complete the process",
    });
  };

  const handleRazorpayError = (error: any) => {
    console.error('Razorpay payment failed:', error);
    toast({
      title: "Payment failed",
      description: error.description || "Payment could not be processed",
      variant: "destructive"
    });
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    if ((selectedMethod === "offline" || selectedMethod === "razorpay_completed") && !proofFile) {
      toast({
        title: "Payment proof required",
        description: "Please upload payment proof to complete the submission",
        variant: "destructive"
      });
      return;
    }

    if (!report || !user) return;

    setProcessing(true);
    
    try {
      let proofUrl = null;
      
      if (proofFile) {
        // Upload proof file to storage
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;
        proofUrl = fileName;
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          report_id: report.id,
          amount: reportAmount,
          method: selectedMethod === "razorpay_completed" ? "razorpay" : selectedMethod,
          proof_url: proofUrl,
          phonepe_transaction_id: selectedMethod === "razorpay_completed" ? razorpayPaymentId : (transactionId || null),
          status: 'pending_review'
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Payment sent to manager for review",
        description: "Your payment has been submitted and is pending approval",
      });
      
      navigate('/dashboard/user');
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({
        title: "Payment submission failed",
        description: "Failed to submit payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout role="user">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout role="user">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground">The requested report could not be found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const amount = reportAmount;

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
            Payment Gateway
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Complete your payment for the submitted report
          </p>
        </motion.div>

        {/* Payment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-6" glass>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Payment Summary</h2>
                <p className="text-sm text-muted-foreground">Review your payment details</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Report ID:</span>
                  <span className="font-medium font-mono text-sm">{report.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Report Title:</span>
                  <span className="font-medium">{report.title}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="default" className="bg-success hover:bg-success">{report.status}</Badge>
                </div>
              </div>
              
              <div className="bg-gradient-secondary/20 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Calculated Amount:</span>
                  <span className="font-medium">₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Processing Fee:</span>
                  <span className="font-medium text-success">₹0</span>
                </div>
                <div className="border-t border-border/30 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-2xl font-bold text-success">₹{amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Payment Date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard className="p-6" glass>
            <div className="flex items-center gap-3 mb-4">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Payment Date</h3>
            </div>
            
            <div className="max-w-sm">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Select payment date *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-card/50 border-border hover:bg-card/70 hover:border-primary/50 transition-all duration-300",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={setPaymentDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </GlassCard>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6" glass>
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Select Payment Method</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <motion.div
                  key={method.id}
                  whileHover={{ scale: method.available ? 1.02 : 1 }}
                  whileTap={{ scale: method.available ? 0.98 : 1 }}
                  className="h-full"
                >
                  <div
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 h-full flex flex-col",
                      selectedMethod === method.id
                        ? 'border-primary bg-primary/5 shadow-glow'
                        : method.available
                        ? 'border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg'
                        : 'border-border/50 bg-muted/20 opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => method.available && setSelectedMethod(method.id)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "p-3 rounded-lg transition-all duration-300",
                        method.color,
                        !method.available && 'grayscale'
                      )}>
                        <method.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{method.name}</h3>
                        {!method.available && (
                          <Badge variant="secondary" className="text-xs mt-1">Coming Soon</Badge>
                        )}
                      </div>
                      {selectedMethod === method.id && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{method.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Razorpay Payment */}
        {selectedMethod === "razorpay" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6" glass>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Razorpay Payment
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-400">
                      <p className="font-medium mb-1">Secure Online Payment</p>
                      <p className="leading-relaxed">Pay securely using Credit/Debit Cards, UPI, or Net Banking with industry-standard encryption</p>
                    </div>
                  </div>
                </div>
                
                <RazorpayPayment
                  amount={amount}
                  onSuccess={handleRazorpaySuccess}
                  onError={handleRazorpayError}
                />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {selectedMethod === "offline" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6" glass>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Offline Payment
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-secondary">
                      <p className="font-medium mb-1">Bank Transfer Details</p>
                      <ul className="leading-relaxed list-disc pl-5">
                        <li>Account Name: ePacific Solutions</li>
                        <li>Bank Name: HDFC Bank</li>
                        <li>Account Number: 1234567890</li>
                        <li>IFSC Code: HDFC0000123</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transactionId" className="text-sm font-medium">
                    Transaction ID *
                  </Label>
                  <Input
                    id="transactionId"
                    type="text"
                    placeholder="Enter transaction ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    required
                    className="bg-card/50 border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Upload Payment Proof *
                  </Label>
                  <div
                    {...getRootProps()}
                    className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 border-border hover:border-primary/50 hover:bg-primary/5"
                  >
                    <input {...getInputProps()} />
                    
                    <div className="space-y-2">
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-5 w-5 text-success" />
                          <p className="text-sm text-success">
                            {proofFile.name}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Drag & drop your proof file here, or click to browse
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Supported formats: JPG, PNG, PDF • Max size: 5MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {selectedMethod === "razorpay_completed" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6" glass>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Razorpay Payment Confirmation
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-400">
                      <p className="font-medium mb-1">Razorpay Payment Successful</p>
                      <p className="leading-relaxed">Please upload a screenshot of your payment confirmation from Razorpay to complete the process.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Upload Payment Proof *
                  </Label>
                  <div
                    {...getRootProps()}
                    className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 border-border hover:border-primary/50 hover:bg-primary/5"
                  >
                    <input {...getInputProps()} />
                    
                    <div className="space-y-2">
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-5 w-5 text-success" />
                          <p className="text-sm text-success">
                            {proofFile.name}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Drag & drop your proof file here, or click to browse
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Supported formats: JPG, PNG, PDF • Max size: 5MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Submit Button */}
        {selectedMethod && selectedMethod !== "razorpay" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end"
          >
            <Button
              onClick={handlePayment}
              disabled={processing || !paymentDate}
              loading={processing}
              className="bg-gradient-primary hover:shadow-glow min-w-[200px]"
              size="lg"
            >
              {processing ? 'Processing...' : 'Submit Payment'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
