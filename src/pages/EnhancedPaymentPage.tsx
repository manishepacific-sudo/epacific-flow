<<<<<<< HEAD
import { useState, useEffect } from "react";
=======
import React, { useState, useEffect } from "react";
>>>>>>> feature/settings-management
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
  CalendarIcon,
  X
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
<<<<<<< HEAD
import { cn } from "@/lib/utils";

=======
import { usePaymentMethodsSettings, useBankDetails } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

// Bank details component
function BankDetails() {
  const bankDetails = useBankDetails();
  return (
    <div className="space-y-2">
      <div><strong>Account Name:</strong> {bankDetails.accountName}</div>
      <div><strong>Account Number:</strong> {bankDetails.accountNumber}</div>
      <div><strong>IFSC Code:</strong> {bankDetails.ifscCode}</div>
      <div><strong>Bank:</strong> {bankDetails.bankName}</div>
    </div>
  );
}

>>>>>>> feature/settings-management
export default function EnhancedPaymentPage() {
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
  const [razorpayPaymentId, setRazorpayPaymentId] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentStep, setPaymentStep] = useState<'method' | 'proof'>('method');

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
      if (!data) throw new Error('Report not found');

      setReport(data);
      setReportAmount(data.amount || 25000);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({
        title: "Error",
        description: "Report not found or access denied",
        variant: "destructive"
      });
      navigate('/dashboard/user');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setProofFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const handleRazorpaySuccess = (paymentId: string, orderId: string) => {
    setRazorpayPaymentId(paymentId);
    setPaymentStep('proof');
    toast({
      title: "Payment Completed",
      description: "Please upload your payment proof to complete the process",
    });
  };

  const handleRazorpayError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
    // Keep user on payment page so they can retry
  };

  const handlePaymentFailureOrExit = async () => {
    // This would be called when user leaves page or payment fails
    // The report amount will automatically appear in pending payments
    toast({
      title: "Payment Incomplete",
      description: "This amount has been added to your pending payments. You can complete it later.",
      variant: "default"
    });
    navigate('/payments');
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    if ((selectedMethod === 'offline' || selectedMethod === 'razorpay') && !proofFile) {
      toast({
        title: "Proof Required",
        description: "Please upload payment proof",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);

    try {
      let proofUrl = null;

      // Upload proof file to Supabase Storage
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user?.id}/${id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;
        proofUrl = uploadData.path;
      }

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user?.id,
          report_id: id,
          amount: reportAmount,
          method: selectedMethod,
          proof_url: proofUrl,
          status: 'pending',
          phonepe_transaction_id: selectedMethod === 'offline' ? transactionId : razorpayPaymentId
        });

      if (paymentError) throw paymentError;

      // Send notification to managers
      const { notifyPaymentSubmitted } = await import("@/utils/notifications");
      await notifyPaymentSubmitted(user?.id || '', reportAmount);

      toast({
        title: "Payment Submitted",
        description: "Your payment proof has been submitted for review",
      });

      navigate('/payments');
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Processing Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
      handlePaymentFailureOrExit();
    } finally {
      setProcessing(false);
    }
  };

<<<<<<< HEAD
  const paymentMethods = [
    {
      id: "razorpay",
      name: "Razorpay",
      description: "Pay online with credit/debit card",
      icon: CreditCard,
      available: true,
      color: "bg-blue-500"
    },
    {
      id: "offline",
      name: "Offline Payment",
      description: "Bank transfer with proof upload",
      icon: Upload,
      available: true,
      color: "bg-green-500"
    }
  ];
=======
  // Get payment methods from settings with built-in transformations
  const paymentMethods = usePaymentMethodsSettings();
  
  // Map method icons with fallback
  const methodIcons = {
    razorpay: CreditCard,
    offline: Upload,
    default: CreditCard
  } as const;
>>>>>>> feature/settings-management

  if (loading) {
    return (
      <Layout role="user">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading report details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout role="user">
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Report Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The report you're looking for doesn't exist or you don't have permission to access it.
          </p>
          <Button onClick={() => navigate('/dashboard/user')}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="user">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            Complete Payment 💳
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Complete payment for your approved report
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center space-x-2 ${paymentStep === 'method' ? 'text-primary' : 'text-success'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentStep === 'method' ? 'bg-primary text-white' : 'bg-success text-white'}`}>
                  {paymentStep === 'proof' ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span className="text-sm font-medium">Choose Payment</span>
              </div>
              
              <div className="h-px w-12 bg-border"></div>
              
              <div className={`flex items-center space-x-2 ${paymentStep === 'proof' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${paymentStep === 'proof' ? 'bg-primary text-white border-primary' : 'border-border'}`}>
                  2
                </div>
                <span className="text-sm font-medium">Upload Proof</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Payment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Payment Summary</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Report Title:</span>
                <span className="font-medium">{report.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="font-medium">{report.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submission Date:</span>
                <span className="font-medium">{new Date(report.created_at).toLocaleDateString()}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary">₹{reportAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Payment Date Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-6">
            <div className="space-y-4">
              <Label htmlFor="payment-date" className="text-base font-medium">Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
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
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </GlassCard>
        </motion.div>

        {/* Payment Method Selection or Proof Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {paymentStep === 'method' ? (
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">Select Payment Method</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMethod === method.id 
                        ? 'border-primary bg-primary/5' 
                        : method.available 
                          ? 'border-border hover:border-primary/50' 
                          : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => method.available && setSelectedMethod(method.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${method.color} text-white`}>
<<<<<<< HEAD
                        <method.icon className="h-5 w-5" />
=======
                        {(() => {
                          const Icon = methodIcons[method.id as keyof typeof methodIcons] ?? methodIcons.default;
                          return <Icon className="h-5 w-5" />;
                        })()}
>>>>>>> feature/settings-management
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{method.name}</h3>
                          {!method.available && (
                            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
                      </div>
                      {selectedMethod === method.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Method Specific Content */}
              {selectedMethod === 'razorpay' && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Razorpay Payment</h3>
                  <RazorpayPayment
                    amount={reportAmount}
                    onSuccess={handleRazorpaySuccess}
                    onError={handleRazorpayError}
                  />
                </div>
              )}

              {selectedMethod === 'offline' && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Bank Transfer Details</h3>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
<<<<<<< HEAD
                    <div><strong>Account Name:</strong> Epacific Services</div>
                    <div><strong>Account Number:</strong> 1234567890</div>
                    <div><strong>IFSC Code:</strong> SBI0001234</div>
                    <div><strong>Bank:</strong> State Bank of India</div>
=======
                    <BankDetails />
>>>>>>> feature/settings-management
                    <div><strong>Amount:</strong> ₹{reportAmount.toLocaleString()}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="transaction-id">Transaction ID / Reference Number</Label>
                    <Input
                      id="transaction-id"
                      placeholder="Enter transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => setPaymentStep('proof')}
                    disabled={!transactionId.trim()}
                  >
                    Proceed to Upload Proof
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Upload Payment Proof</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaymentStep('method')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>

              {/* File Upload Area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {proofFile ? (
                  <div>
                    <p className="font-medium text-success mb-2">File Selected:</p>
                    <p className="text-sm text-muted-foreground">{proofFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      {isDragActive ? 'Drop your file here' : 'Upload Payment Proof'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag & drop a file here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports: JPG, PNG, PDF (Max 5MB)
                    </p>
                  </div>
                )}
              </div>

              <Button
                className="w-full mt-6"
                onClick={handlePayment}
                disabled={processing || !proofFile}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Submit Payment
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
