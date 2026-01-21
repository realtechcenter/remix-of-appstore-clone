import { useState, useEffect } from 'react';
import { QrCode, Loader2, CheckCircle, XCircle, Clock, Download, PartyPopper } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder, generateKHQR, verifyPayment, confirmPaymentManual } from '@/hooks/useOrders';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { useQueryClient } from '@tanstack/react-query';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId: number;
  appName: string;
  price: number;
  downloadUrl?: string;
  onPaymentSuccess: () => void;
}

export const PaymentDialog = ({
  open,
  onOpenChange,
  appId,
  appName,
  price,
  downloadUrl,
  onPaymentSuccess,
}: PaymentDialogProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  
  // Convert price to number (API may return string)
  const priceNum = typeof price === 'string' ? parseFloat(price) : (price || 0);
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanned' | 'verifying' | 'success' | 'error'>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [md5, setMd5] = useState<string>('');
  const [amountKHR, setAmountKHR] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes

  useEffect(() => {
    if (open && user) {
      initializePayment();
    }
    return () => {
      setStatus('loading');
      setQrDataUrl('');
      setOrderId('');
      setMd5('');
    };
  }, [open, user]);

  // Countdown timer
  useEffect(() => {
    if (status === 'ready' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setStatus('error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, timeLeft]);

  // Poll for payment verification
  useEffect(() => {
    if ((status === 'ready' || status === 'scanned') && orderId && md5) {
      const interval = setInterval(async () => {
        try {
          const result = await verifyPayment(orderId, md5);

          // Handle both 'paid' and 'approved' status from API
          if (result.status === 'paid' || result.status === 'approved') {
            setStatus('success');
            clearInterval(interval);
            queryClient.invalidateQueries({ queryKey: ['purchased', appId] });
            toast.success(language === 'km' ? 'ការទូទorg org org org org!' : 'Payment successful!');
            onPaymentSuccess();
            // Don't auto-close - let user see success and download
          } else if (result.status === 'scanned' && status !== 'scanned') {
            setStatus('scanned');
          }
        } catch (err) {
          console.error('Verification error:', err);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [status, orderId, md5, appId, language]);

  const initializePayment = async () => {
    try {
      setStatus('loading');
      
      // Create order
      const order = await createOrder.mutateAsync({
        appId,
        appName,
        amount: price,
      });

      setOrderId(order.id);

      // Generate QR code
      const qrData = await generateKHQR(order.id, price);

      setMd5(qrData.md5);
      setAmountKHR(qrData.amount);

      // Generate QR code image
      const qrUrl = await QRCode.toDataURL(qrData.qr_string, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      setQrDataUrl(qrUrl);
      setStatus('ready');
      setTimeLeft(900);
    } catch (err) {
      console.error('Payment init error:', err);
      setStatus('error');
      toast.error(language === 'km' ? 'មានបញ្ហorg org org org org QR' : 'Failed to generate QR code');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // For testing: Manual confirm button
  const handleManualConfirm = async () => {
    try {
      setStatus('verifying');
      await confirmPaymentManual(orderId);

      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ['purchased', appId] });
      toast.success(language === 'km' ? 'ការorg org org org org org org org org org!' : 'Payment successful!');
      onPaymentSuccess();
    } catch (err) {
      console.error('Manual confirm error:', err);
      setStatus('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            {language === 'km' ? 'org org org org org KHQR' : 'Pay with KHQR'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {language === 'km' ? 'org org org org org QR Code...' : 'Generating QR Code...'}
              </p>
            </div>
          )}

          {status === 'ready' && (
            <>
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="KHQR Code" className="w-64 h-64" />
                )}
              </div>

              {/* Amount */}
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-primary">
                  ${priceNum.toFixed(2)} USD
                </p>
                <p className="text-muted-foreground">
                  ≈ {amountKHR.toLocaleString()} KHR
                </p>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2 text-amber-500 mb-4">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>

              {/* Instructions */}
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>
                  {language === 'km' 
                    ? 'org org org QR Code org org org org org org org org Bakong org org org org org'
                    : 'Scan this QR code with your Bakong app'
                  }
                </p>
                <p className="text-xs">
                  {language === 'km'
                    ? 'org org org org org org org org org org org org org org org org org org'
                    : 'Payment will be verified automatically'
                  }
                </p>
              </div>

              {/* Test button - for development only */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManualConfirm}
                className="mt-4"
              >
                {language === 'km' ? 'org org org org: org org org org org org org' : 'Test: Confirm Payment'}
              </Button>
            </>
          )}

          {status === 'scanned' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              </div>
              <p className="text-lg font-semibold text-blue-500">
                {language === 'km' ? 'QR org org org org org!' : 'QR Scanned!'}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                {language === 'km' 
                  ? 'org org org org org org org org org org org org org org org org org org'
                  : 'Please confirm the payment in your banking app'
                }
              </p>
            </div>
          )}

          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {language === 'km' ? 'org org org org org org org org org org org...' : 'Verifying payment...'}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <PartyPopper className="w-8 h-8 text-yellow-500 absolute -top-2 -right-2 animate-bounce" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-green-500">
                  {language === 'km' ? 'ការorg org org org org org org org org!' : 'Payment Successful!'}
                </p>
                <p className="text-muted-foreground">
                  {language === 'km' 
                    ? `org org org org org org org org ${appName}!`
                    : `Thank you for purchasing ${appName}!`
                  }
                </p>
              </div>

              <div className="w-full space-y-3 pt-2">
                {downloadUrl && (
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => window.open(downloadUrl, '_blank')}
                  >
                    <Download className="w-5 h-5" />
                    {language === 'km' ? 'org org org org org org org' : 'Download Now'}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  {language === 'km' ? 'org org' : 'Close'}
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <XCircle className="w-16 h-16 text-destructive" />
              <p className="text-lg font-semibold text-destructive">
                {language === 'km' ? 'org org org org org org org org org org' : 'Payment Failed'}
              </p>
              <Button onClick={initializePayment} variant="outline">
                {language === 'km' ? 'org org org org org org org' : 'Try Again'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
