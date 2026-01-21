import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateQRRequest {
  orderId: string;
  amount: number;
  currency: string;
}

interface VerifyPaymentRequest {
  orderId: string;
  md5: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bakongToken = Deno.env.get('BAKONG_API_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'generate-qr') {
      const { orderId, amount, currency }: GenerateQRRequest = await req.json();

      console.log(`Generating KHQR for order ${orderId}, amount: ${amount} ${currency}`);

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      // Convert USD to KHR if needed (1 USD ≈ 4100 KHR)
      const amountInKHR = currency === 'USD' ? Math.round(amount * 4100) : amount;

      // Generate KHQR using Bakong API
      // Note: You'll need to adjust this based on the actual Bakong API documentation
      const bakongResponse = await fetch('https://api-bakong.nbc.gov.kh/v1/generate_deeplink_by_qr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bakongToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bank_account: Deno.env.get('BAKONG_ACCOUNT_ID') || 'your_bakong_account',
          merchant_name: 'AppsTorrent',
          merchant_city: 'Phnom Penh',
          amount: amountInKHR,
          currency: 'KHR',
          store_label: `Order-${orderId.slice(0, 8)}`,
          terminal_label: 'APP',
          purpose_of_transaction: `Purchase: ${order.app_name}`,
        }),
      });

      if (!bakongResponse.ok) {
        console.error('Bakong API error:', await bakongResponse.text());
        
        // Fallback: Generate a simple QR data string for testing
        const qrData = {
          qr_string: `00020101021229380014your_bakong_id0108BAKONG15303840540${amountInKHR}5802KH5912AppsTorrent6010Phnom Penh62070503${orderId.slice(0, 8)}6304`,
          md5: crypto.randomUUID().replace(/-/g, '').slice(0, 32),
          amount: amountInKHR,
          currency: 'KHR',
        };

        // Update order with payment MD5
        await supabase
          .from('orders')
          .update({ payment_md5: qrData.md5 })
          .eq('id', orderId);

        return new Response(JSON.stringify(qrData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const bakongData = await bakongResponse.json();
      
      // Update order with payment MD5 for verification
      await supabase
        .from('orders')
        .update({ payment_md5: bakongData.md5 })
        .eq('id', orderId);

      return new Response(JSON.stringify({
        qr_string: bakongData.qr,
        deeplink: bakongData.deeplink,
        md5: bakongData.md5,
        amount: amountInKHR,
        currency: 'KHR',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'verify-payment') {
      const { orderId, md5 }: VerifyPaymentRequest = await req.json();

      console.log(`Verifying payment for order ${orderId}`);

      // Check payment status with Bakong API
      const bakongResponse = await fetch('https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bakongToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ md5 }),
      });

      if (!bakongResponse.ok) {
        console.error('Bakong verification error:', await bakongResponse.text());
        
        // For testing: simulate payment success after some time
        return new Response(JSON.stringify({ 
          status: 'pending',
          message: 'Payment verification pending' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const paymentStatus = await bakongResponse.json();

      if (paymentStatus.responseCode === 0 && paymentStatus.data?.hash) {
        // Payment successful - update order
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            bakong_transaction_id: paymentStatus.data.hash,
            paid_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        return new Response(JSON.stringify({ 
          status: 'paid',
          transaction_id: paymentStatus.data.hash 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        status: 'pending',
        message: 'Payment not yet received' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'confirm-payment') {
      // Manual confirmation endpoint (for testing or admin use)
      const { orderId } = await req.json();

      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
