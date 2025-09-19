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
  DollarSign
} from "lucide-react";
import Layout from "@/components/Layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/custom-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      available: false
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

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    if (selectedMethod === "offline" && !proofFile) {
      toast({
        title: "Payment proof required",
        description: "Please upload payment proof for offline payments",
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
          amount: 25000, // Fixed amount for now
          method: selectedMethod,
          proof_url: proofUrl,
          phonepe_transaction_id: transactionId || null,
          status: 'pending_review'
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Payment submitted successfully",
        description: "Your payment has been sent for manager approval",
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

  const amount = 25000; // Fixed amount for now

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
          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="h-5 w-5 text-success" />
              <h2 className="text-lg sm:text-xl font-semibold">Payment Summary</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report ID:</span>
                  <span className="font-medium">{report.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report Title:</span>
                  <span className="font-medium">{report.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="default" className="bg-success">{report.status}</Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calculated Amount:</span>
                  <span className="font-medium">₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Fee:</span>
                  <span className="font-medium">₹0</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-success">₹{amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Select Payment Method</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <motion.div
                  key={method.id}
                  whileHover={{ scale: method.available ? 1.02 : 1 }}
                  whileTap={{ scale: method.available ? 0.98 : 1 }}
                >
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      selectedMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : method.available
                        ? 'border-border hover:border-primary/50 hover:bg-primary/5'
                        : 'border-border bg-muted/20 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => method.available && setSelectedMethod(method.id)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${method.color} ${!method.available ? 'grayscale' : ''}`}>
                        <method.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{method.name}</h3>
                        {!method.available && (
                          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                        )}
                      </div>
                      {selectedMethod === method.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Offline Payment Details */}
        {selectedMethod === "offline" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Bank Details</TabsTrigger>
                <TabsTrigger value="proof">Upload Proof</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <GlassCard className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Bank Transfer Details</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Account Name</Label>
                        <div className="font-medium">Epacific Technologies Pvt. Ltd.</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Account Number</Label>
                        <div className="font-medium font-mono">1234567890123456</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Bank Name</Label>
                        <div className="font-medium">State Bank of India</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">IFSC Code</Label>
                        <div className="font-medium font-mono">SBIN0001234</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Branch</Label>
                        <div className="font-medium">Mumbai Central</div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Amount to Transfer</Label>
                        <div className="font-bold text-success text-lg">₹{amount.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-400">
                        <p className="font-medium">Important:</p>
                        <p>Please mention your User ID as reference while making the transfer.</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </TabsContent>
              
              <TabsContent value="proof">
                <GlassCard className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Upload Payment Proof</h3>
                  
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-300 cursor-pointer ${
                      isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : proofFile 
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
                      {proofFile ? (
                        <Check className="w-12 h-12 mx-auto mb-3 text-success" />
                      ) : (
                        <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      )}
                    </motion.div>

                    {proofFile ? (
                      <div>
                        <p className="text-base font-medium mb-2 text-success">
                          File uploaded successfully
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-base font-medium mb-2">
                          {isDragActive ? 'Drop your file here' : 'Upload payment proof'}
                        </p>
                        <p className="text-muted-foreground text-sm mb-3">
                          Drag & drop or click to browse
                        </p>
                        <div className="flex justify-center gap-2">
                          <Badge variant="secondary">JPG</Badge>
                          <Badge variant="secondary">PNG</Badge>
                          <Badge variant="secondary">PDF</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                    <Input
                      id="transactionId"
                      placeholder="Enter transaction reference number"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </GlassCard>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-4 sm:p-6">
            <Button 
              variant="hero" 
              className="w-full h-12 text-base"
              onClick={handlePayment}
              loading={processing}
              disabled={!selectedMethod || (selectedMethod === "offline" && !proofFile)}
            >
              {processing ? 'Processing...' : `Pay ₹${amount.toLocaleString()}`}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-center text-xs text-muted-foreground mt-3">
              Your payment will be reviewed by a manager and processed within 24 hours
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </Layout>
  );
}