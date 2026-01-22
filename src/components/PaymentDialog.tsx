import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Download, PartyPopper } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

// KHQR Logo Component
const KHQRLogo = () => (
  <svg viewBox="0 0 100 28" className="h-7" fill="white">
    <text x="0" y="22" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" letterSpacing="1">
      KHQR
    </text>
  </svg>
);

// Riel Symbol Component for QR center
const RielSymbol = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
      <span className="text-white text-xl font-bold">៛</span>
    </div>
  </div>
);

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
  
  const priceNum = typeof price === 'string' ? parseFloat(price) : (price || 0);
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanned' | 'verifying' | 'success' | 'error'>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [md5, setMd5] = useState<string>('');
  const [amountKHR, setAmountKHR] = useState<number>(0);

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

  // Poll for payment verification
  useEffect(() => {
    if ((status === 'ready' || status === 'scanned') && orderId && md5) {
      const interval = setInterval(async () => {
        try {
          const result = await verifyPayment(orderId, md5);

          if (result.status === 'paid' || result.status === 'approved') {
            setStatus('success');
            clearInterval(interval);
            queryClient.invalidateQueries({ queryKey: ['purchased', appId] });
            toast.success(language === 'km' ? 'ការទូទorg org org org org!' : 'Payment successful!');
            onPaymentSuccess();
          } else if (result.status === 'scanned' && status !== 'scanned') {
            setStatus('scanned');
          }
        } catch (err) {
          console.error('Verification error:', err);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [status, orderId, md5, appId, language]);

  const initializePayment = async () => {
    try {
      setStatus('loading');
      
      const order = await createOrder.mutateAsync({
        appId,
        appName,
        amount: price,
      });

      setOrderId(order.id);

      const qrData = await generateKHQR(order.id, price);

      setMd5(qrData.md5);
      setAmountKHR(qrData.amount);

      const qrUrl = await QRCode.toDataURL(qrData.qr_string, {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      setQrDataUrl(qrUrl);
      setStatus('ready');
    } catch (err) {
      console.error('Payment init error:', err);
      setStatus('error');
      toast.error(language === 'km' ? 'មានបញ្ហorg org org org org QR' : 'Failed to generate QR code');
    }
  };

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

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden bg-transparent border-0 shadow-2xl">
        {status === 'loading' && (
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-red-500" />
            <p className="text-gray-600">
              {language === 'km' ? 'org org org org org QR Code...' : 'Generating QR Code...'}
            </p>
          </div>
        )}

        {status === 'ready' && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl">
            {/* Red Header with KHQR */}
            <div className="bg-[#E21A1A] px-6 py-4 flex justify-center items-center rounded-t-3xl">
              <KHQRLogo />
            </div>
            
            {/* White Content Area */}
            <div className="px-6 py-5">
              {/* Merchant Name */}
              <p className="text-gray-700 text-base font-medium">{appName}</p>
              
              {/* Amount */}
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold text-gray-900">
                  {formatAmount(amountKHR)}
                </span>
                <span className="text-gray-500 text-lg font-medium">KHR</span>
              </div>
            </div>

            {/* Dashed Divider */}
            <div className="px-4">
              <div className="border-t-2 border-dashed border-gray-300"></div>
            </div>

            {/* QR Code Section */}
            <div className="p-6 flex flex-col items-center">
              <div className="relative">
                {qrDataUrl && (
                  <img 
                    src={qrDataUrl} 
                    alt="KHQR Code" 
                    className="w-64 h-64"
                  />
                )}
                <RielSymbol />
              </div>

              {/* Instructions */}
              <p className="text-gray-500 text-sm text-center mt-4">
                {language === 'km' 
                  ? 'org org org QR Code org org org org org org org org Bakong'
                  : 'Scan with any Bakong-supported banking app'
                }
              </p>

              {/* Test button - for development */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleManualConfirm}
                className="mt-3 text-gray-400 hover:text-gray-600"
              >
                {language === 'km' ? 'org org org: org org org org org' : 'Test: Confirm'}
              </Button>
            </div>
          </div>
        )}

        {status === 'scanned' && (
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
            <p className="text-lg font-semibold text-blue-600">
              {language === 'km' ? 'QR org org org org org!' : 'QR Scanned!'}
            </p>
            <p className="text-sm text-gray-500 text-center">
              {language === 'km' 
                ? 'org org org org org org org org org org org org org org org org'
                : 'Please confirm the payment in your banking app'
              }
            </p>
          </div>
        )}

        {status === 'verifying' && (
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-red-500" />
            <p className="text-gray-600">
              {language === 'km' ? 'org org org org org org org org org org org...' : 'Verifying payment...'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <PartyPopper className="w-8 h-8 text-yellow-500 absolute -top-2 -right-2 animate-bounce" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-green-500">
                {language === 'km' ? 'ការorg org org org org org org org org!' : 'Payment Successful!'}
              </p>
              <p className="text-gray-500">
                {language === 'km' 
                  ? `org org org org org org org org ${appName}!`
                  : `Thank you for purchasing ${appName}!`
                }
              </p>
            </div>

            <div className="w-full space-y-3 pt-2">
              {downloadUrl && (
                <Button 
                  className="w-full gap-2 bg-[#E21A1A] hover:bg-[#C41515]" 
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
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4">
            <XCircle className="w-16 h-16 text-red-500" />
            <p className="text-lg font-semibold text-red-500">
              {language === 'km' ? 'org org org org org org org org org org' : 'Payment Failed'}
            </p>
            <Button onClick={initializePayment} className="bg-[#E21A1A] hover:bg-[#C41515]">
              {language === 'km' ? 'org org org org org org org' : 'Try Again'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
