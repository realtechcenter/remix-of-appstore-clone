import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, XCircle, Download, PartyPopper, Save, Tag, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder, generateKHQR, verifyPayment, confirmPaymentManual } from '@/hooks/useOrders';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { useQueryClient } from '@tanstack/react-query';
import { couponsApi, type ApplicableCoupon } from '@/lib/api';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId: number;
  appName: string;
  price: number;
  downloadUrl?: string;
  coupon?: ApplicableCoupon | null;
  onPaymentSuccess: () => void;
}

// KHQR Logo Component
const KHQRLogo = () => (
  <img src="https://macsofy.com/images/khqr-icon.svg" alt="KHQR" className="h-5" />
);

// Dollar Symbol Component for QR center
const DollarSymbol = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
      <span className="text-white text-sm font-bold">$</span>
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
  coupon,
  onPaymentSuccess,
}: PaymentDialogProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const qrRef = useRef<HTMLDivElement>(null);
  
  const priceNum = typeof price === 'string' ? parseFloat(price) : (price || 0);
  const discountAmount = coupon?.discount_amount || 0;
  const finalPrice = Math.max(0, priceNum - discountAmount);
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanned' | 'verifying' | 'success' | 'error'>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [md5, setMd5] = useState<string>('');
  // Raw KHQR string returned by the backend (used for deep-linking to mobile apps)
  const [qrString, setQrString] = useState<string>('');

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
            toast.success(language === 'km' ? 'ការបង់ប្រាក់បានជោគជ័យ!' : 'Payment successful!');
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
        amount: finalPrice, // Use discounted price
      });

      setOrderId(order.id);
          
      // Apply coupon to order if selected
      if (coupon) {
        try {
          await couponsApi.apply(coupon.id, order.id, priceNum);
        } catch (err) {
          console.error('Failed to apply coupon:', err);
          // Continue anyway - the coupon might already be applied or have an issue
        }
      }

      const qrData = await generateKHQR(order.id, finalPrice);

      setMd5(qrData.md5);
      // keep the raw string for deep-linking to mobile banking apps
      setQrString(qrData.qr_string);

      const qrUrl = await QRCode.toDataURL(qrData.qr_string, {
        width: 180,
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
      toast.error(language === 'km' ? 'មានបញ្ហាក្នុងការបង្កើត QR Code' : 'Failed to generate QR code');
    }
  };

  // If QR string is present and we're on a mobile device, attempt to open ABA Mobile via custom scheme.
  useEffect(() => {
    if (!qrString || status !== 'ready') return;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const abaUrl = `abamobilebank://ababank.com?type=payway&qrcode=${encodeURIComponent(qrString)}`;

    // Only auto-redirect on mobile to avoid desktop errors; still render a manual fallback button below.
    if (isMobile) {
      // small delay so the QR is visible briefly and UI settles
      const t = setTimeout(() => {
        try {
          toast.message(language === 'km' ? 'កំពុងផ្ដល់ទៅ ABA Mobile...' : 'Opening ABA Mobile...');
          window.location.href = abaUrl;
        } catch (err) {
          // ignore in test environments
        }
      }, 400);

      return () => clearTimeout(t);
    }
  }, [qrString, status, language]);

  const handleManualConfirm = async () => {
    try {
      setStatus('verifying');
      await confirmPaymentManual(orderId);

      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ['purchased', appId] });
      toast.success(language === 'km' ? 'ការបង់ប្រាក់បានជោគជ័យ!' : 'Payment successful!');
      onPaymentSuccess();
    } catch (err) {
      console.error('Manual confirm error:', err);
      setStatus('error');
    }
  }; 

  const handleSaveQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `KHQR-${appName}-${finalPrice.toFixed(2)}USD.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success(language === 'km' ? 'QR Code បានរក្សាទុក!' : 'QR Code saved!');
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-0 overflow-hidden gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{language === 'km' ? 'ការ​បង់​ប្រាក់' : 'Payment'}</DialogTitle>
        </DialogHeader>
        
        {status === 'loading' && (
          <div className="p-6 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm text-muted-foreground">
              {language === 'km' ? 'កំពុង​បង្កើត QR Code...' : 'Generating QR Code...'}
            </p>
          </div>
        )}

        {status === 'ready' && (
          <div className="flex flex-col">
            {/* KHQR Card */}
            <div ref={qrRef} className="bg-white rounded-xl overflow-hidden shadow-sm mx-4 mt-4 border border-gray-200">
              {/* Red Header with KHQR */}
              <div className="bg-[#E21A1A] px-4 py-2 flex justify-center items-center">
                <KHQRLogo />
              </div>
              
              {/* White Content Area */}
              <div className="px-4 py-3">
                {/* Merchant Name */}
                <p className="text-gray-700 text-sm font-medium truncate">{appName}</p>
                
                {/* Amount in USD */}
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  {coupon && discountAmount > 0 ? (
                    <>
                      <span className="text-lg text-gray-400 line-through">
                        {formatAmount(priceNum)}
                      </span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatAmount(finalPrice)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-gray-900">
                      {formatAmount(finalPrice)}
                    </span>
                  )}
                  <span className="text-gray-500 text-sm font-medium">USD</span>
                </div>
                
                {/* Coupon Applied Badge */}
                {coupon && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                    <Tag className="w-3 h-3" />
                    <span>{coupon.coupon.code} (-${discountAmount.toFixed(2)})</span>
                  </div>
                )}
              </div>

              {/* Dashed Divider */}
              <div className="px-3">
                <div className="border-t border-dashed border-gray-300"></div>
              </div>

              {/* QR Code Section */}
              <div className="p-4 flex flex-col items-center gap-3">
                <div className="relative">
                  {qrDataUrl && (
                    <img 
                      src={qrDataUrl} 
                      alt="KHQR Code" 
                      className="w-44 h-44"
                    />
                  )}
                  <DollarSymbol />
                </div>
                <img
                  src="https://macsofy.com/images/payment_icons.png"
                  alt="Payment icons"
                  className="w-full object-contain"
                />
              </div>
            </div>

            {/* Instructions */}
            <p className="text-muted-foreground text-xs text-center mt-3 px-4">
              {language === 'km' 
                ? 'ស្កេនជាមួយកម្មវិធីធនាគារដែលគាំទ្របាគង'
                : 'Scan with any Bakong-supported banking app'
              }
            </p>

            {/* Action Buttons */}
            <div className="p-4 space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveQR}
                className="w-full gap-2"
              >
                <Save className="w-4 h-4" />
                {language === 'km' ? 'រក្សាទុក QR Code' : 'Save QR Code'}
              </Button>

              {/* Fallback: open ABA Mobile using custom scheme (works on mobile) */}
              <Button
                size="sm"
                className="w-full gap-2 text-white"
                style={{ backgroundColor: '#CC0001' }}
                onClick={() => {
                  if (!qrString) {
                    toast.error(language === 'km' ? 'QR Code មិនទាន់មាន' : 'QR not ready');
                    return;
                  }
                  const abaUrl = `abamobilebank://ababank.com?type=payway&qrcode=${encodeURIComponent(qrString)}`;
                  try {
                    window.location.href = abaUrl;
                  } catch (err) {
                    // ignore in test envs
                  }
                }}
              >
                <Smartphone className="w-4 h-4" />
                {language === 'km' ? 'បើកក្នុង ABA Mobile' : 'Open in ABA Mobile'}
              </Button>

            </div>
          </div>
        )}

        {status === 'scanned' && (
          <div className="p-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-blue-600">
              {language === 'km' ? 'QR បានស្កេន!' : 'ABA Bank QR Scanned!'}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {language === 'km' 
                ? 'សូមបញ្ជាក់ការទូទាត់នៅក្នុងកម្មវិធីធនាគាររបស់អ្នក'
                : 'Please confirm the payment in your banking app'
              }
            </p>
          </div>
        )}

        {status === 'verifying' && (
          <div className="p-6 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm text-muted-foreground">
              {language === 'km' ? 'ការ​ផ្ទៀងផ្ទាត់​ការ​បង់ប្រាក់...' : 'Verifying payment...'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <PartyPopper className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
            </div>
            
            <div className="text-center space-y-1">
              <p className="text-base font-bold text-green-500">
                {language === 'km' ? 'ការបង់ប្រាក់បានជោគជ័យ!' : 'Payment Successful!'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'km' 
                  ? `អរគុណសម្រាប់ការទិញ ${appName}!`
                  : `Thank you for purchasing ${appName}!`
                }
              </p>
            </div>

            <div className="w-full space-y-2">
              {downloadUrl && (
                <Button 
                  className="w-full gap-2 bg-[#E21A1A] hover:bg-[#C41515]" 
                  size="sm"
                  onClick={() => window.open(downloadUrl, '_blank')}
                >
                  <Download className="w-4 h-4" />
                  {language === 'km' ? 'ទាញយកឥឡូវ' : 'Download Now'}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                {language === 'km' ? 'បិទ' : 'Close'}
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-6 flex flex-col items-center gap-3">
            <XCircle className="w-12 h-12 text-red-500" />
            <p className="text-sm font-semibold text-red-500">
              {language === 'km' ? 'ការ​បង់​ប្រាក់​បាន​បរាជ័យ!' : 'Payment Failed'}
            </p>
            <Button onClick={initializePayment} size="sm" className="bg-[#E21A1A] hover:bg-[#C41515]">
              {language === 'km' ? 'ព្យាយាម​ម្តង​ទៀត' : 'Try Again'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
