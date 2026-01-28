import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUpload } from './FileUpload';
import { Send, CreditCard, CheckCircle, AlertCircle, Mail, DollarSign, Calendar, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

interface ParsedData {
  total: number;
  preview: any[];
  headers: string[];
  filename: string;
}

interface PaymentData {
  transactionId: string;
  amount: number;
  method: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
}

type FlowStep = 'upload' | 'review' | 'send-report' | 'payment' | 'confirmation';

export function ReportFlow() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [emailData, setEmailData] = useState({
    to: 'manager@epacific.com',
    subject: '',
    message: ''
  });

  const [fakePaymentForm, setFakePaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
    amount: 0
  });

  const handleFileParsed = (data: ParsedData) => {
    setParsedData(data);
    setCurrentStep('review');
    setEmailData(prev => ({
      ...prev,
      subject: `Report Submission - ${data.filename}`,
      message: `Dear Manager,\n\nI am submitting my report "${data.filename}" for your review.\n\nReport Summary:\n- Total Amount: ₹${data.total.toLocaleString()}\n- Records: ${data.preview.length}\n\nPlease review and approve at your earliest convenience.\n\nBest regards,\nJohn Doe`
    }));
    setFakePaymentForm(prev => ({ ...prev, amount: data.total }));
  };

  const handleSendReport = async () => {
    setIsLoading(true);
    try {
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setReportSent(true);
      setCurrentStep('payment');
      
      toast({
        title: "Report Sent Successfully",
        description: "Your report has been sent to the manager for review.",
      });
    } catch (error) {
      toast({
        title: "Failed to Send Report",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const payment: PaymentData = {
        transactionId: `TXN${Date.now()}`,
        amount: fakePaymentForm.amount,
        method: 'Credit Card',
        date: new Date().toISOString(),
        status: 'completed'
      };
      
      setPaymentData(payment);
      setCurrentStep('confirmation');
      
      // Simulate sending payment proof to manager
      toast({
        title: "Payment Successful",
        description: "Payment proof has been sent to the manager for approval.",
      });
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Please check your payment details and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('upload');
    setParsedData(null);
    setReportSent(false);
    setPaymentData(null);
    setEmailData({
      to: 'manager@epacific.com',
      subject: '',
      message: ''
    });
    setFakePaymentForm({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardHolder: '',
      amount: 0
    });
  };

  const stepTitles = {
    upload: 'Upload Report File',
    review: 'Review Parsed Data',
    'send-report': 'Send Report to Manager',
    payment: 'Process Payment',
    confirmation: 'Completion Confirmation'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Indicator */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Report Submission Flow</h2>
          <Badge variant="secondary">
            Step {Object.keys(stepTitles).indexOf(currentStep) + 1} of {Object.keys(stepTitles).length}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {Object.keys(stepTitles).map((step, index) => {
            const isActive = step === currentStep;
            const isCompleted = Object.keys(stepTitles).indexOf(step) < Object.keys(stepTitles).indexOf(currentStep);
            
            return (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isActive ? 'bg-primary text-primary-foreground' : 
                    isCompleted ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}
                `}>
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>
                {index < Object.keys(stepTitles).length - 1 && (
                  <div className={`w-8 h-px ${isCompleted ? 'bg-success' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {stepTitles[currentStep]}
        </p>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <FileUpload onFileParsed={handleFileParsed} />
          </motion.div>
        )}

        {currentStep === 'review' && parsedData && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Review Report Data</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-accent/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">File Name</p>
                  <p className="font-medium">{parsedData.filename}</p>
                </div>
                <div className="p-4 bg-accent/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold text-primary">₹{parsedData.total.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-accent/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Records</p>
                  <p className="text-lg font-bold">{parsedData.preview.length}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setCurrentStep('send-report')} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Proceed to Send Report
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                  Upload Different File
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {currentStep === 'send-report' && (
          <motion.div
            key="send-report"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Send Report to Manager</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email-to">To</Label>
                  <Input
                    id="email-to"
                    value={emailData.to}
                    onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    value={emailData.subject}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email-message">Message</Label>
                  <Textarea
                    id="email-message"
                    value={emailData.message}
                    onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                    rows={8}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={handleSendReport} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Report
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep('review')}>
                  Back to Review
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {currentStep === 'payment' && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Report sent successfully! Please proceed with payment to complete the process.
              </AlertDescription>
            </Alert>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="card-holder">Card Holder Name</Label>
                    <Input
                      id="card-holder"
                      value={fakePaymentForm.cardHolder}
                      onChange={(e) => setFakePaymentForm(prev => ({ ...prev, cardHolder: e.target.value }))}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input
                      id="card-number"
                      value={fakePaymentForm.cardNumber}
                      onChange={(e) => setFakePaymentForm(prev => ({ ...prev, cardNumber: e.target.value }))}
                      placeholder="1234 5678 9012 3456"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        value={fakePaymentForm.expiryDate}
                        onChange={(e) => setFakePaymentForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                        placeholder="MM/YY"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        value={fakePaymentForm.cvv}
                        onChange={(e) => setFakePaymentForm(prev => ({ ...prev, cvv: e.target.value }))}
                        placeholder="123"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent/50 rounded-lg">
                  <h4 className="font-medium mb-3">Payment Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Report Amount:</span>
                      <span>₹{fakePaymentForm.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing Fee:</span>
                      <span>₹0</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-primary">₹{fakePaymentForm.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={handlePayment} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay ₹{fakePaymentForm.amount.toLocaleString()}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {currentStep === 'confirmation' && paymentData && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              
              <h3 className="text-xl font-semibold mb-2">Process Completed Successfully!</h3>
              <p className="text-muted-foreground mb-6">
                Your report has been submitted and payment has been processed. The payment proof has been automatically sent to the manager for approval.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span className="font-medium">Payment Details</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Transaction ID: {paymentData.transactionId}</p>
                  <p className="text-sm text-muted-foreground">Amount: ₹{paymentData.amount.toLocaleString()}</p>
                  <Badge variant="secondary" className="bg-success text-success-foreground mt-2">
                    {paymentData.status}
                  </Badge>
                </div>
                
                <div className="p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">Timestamp</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(paymentData.date).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Status: Awaiting manager approval</p>
                </div>
              </div>

              <Button onClick={resetFlow} className="w-full">
                Submit Another Report
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}