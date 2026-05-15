import { useState } from "react";
import { Button } from "@/components/ui/custom-button";
import { useToast } from "@/hooks/use-toast";
import { CreditCard } from "lucide-react";

interface RazorpayPaymentProps {
  amount: number;
  onSuccess: (paymentId: string, orderId: string) => void;
  onError: (error: any) => void;
  disabled?: boolean;
}

// Declare Razorpay on window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayPayment({ amount, onSuccess, onError, disabled }: RazorpayPaymentProps) {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order ID (in a real app, this would come from your backend)
      const orderId = `order_${Date.now()}`;
      
      const options = {
        key: 'rzp_test_9WdGpsDhkgSLdF', // Demo key - replace with your actual key
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        name: 'Epacific Technologies',
        description: 'Monthly Report Payment',
        order_id: orderId,
        handler: function (response: any) {
          onSuccess(response.razorpay_payment_id, response.razorpay_order_id);
        },
        prefill: {
          name: 'User',
          email: 'user@example.com',
        },
        notes: {
          address: 'Corporate Office',
        },
        theme: {
          color: 'hsl(var(--primary))',
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        onError(response.error);
        setProcessing(false);
      });

      razorpay.open();
    } catch (error) {
      console.error('Razorpay payment error:', error);
      onError(error);
      setProcessing(false);
    }
  };

  return (
    <Button
      variant="hero"
      className="w-full"
      onClick={handleRazorpayPayment}
      disabled={disabled || processing}
      loading={processing}
    >
      <CreditCard className="mr-2 h-4 w-4" />
      {processing ? 'Processing...' : `Pay ₹${amount.toLocaleString()} with Razorpay`}
    </Button>
  );
}