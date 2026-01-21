import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, getAuthHeader } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

export interface Order {
  id: string;
  user_id: number;
  app_id: number;
  app_name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  bakong_transaction_id?: string;
  payment_md5?: string;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
}

export const useOrders = () => {
  const { user, token } = useAuth();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/orders.php`, {
        headers: getAuthHeader(),
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch orders');
      }
      
      return data.orders as Order[];
    },
    enabled: !!user && !!token,
  });
};

export const useHasPurchased = (appId: number) => {
  const { user, token } = useAuth();

  return useQuery({
    queryKey: ['purchased', appId, user?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/orders.php?app_id=${appId}`, {
        headers: getAuthHeader(),
      });
      
      const data = await response.json();
      if (!response.ok) {
        return false;
      }
      
      return data.purchased === true;
    },
    enabled: !!user && !!token && !!appId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ appId, appName, amount }: { appId: number; appName: string; amount: number }) => {
      if (!user) throw new Error('User not authenticated');

      const response = await fetch(`${API_BASE_URL}/orders.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: 'create',
          app_id: appId,
          app_name: appName,
          amount,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create order');
      }

      return data.order as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// Generate KHQR code
export const generateKHQR = async (orderId: string, amount: number) => {
  const response = await fetch(`${API_BASE_URL}/payment.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      action: 'generate-qr',
      order_id: orderId,
      amount,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || 'Failed to generate QR code');
  }

  return data;
};

// Verify payment
export const verifyPayment = async (orderId: string, md5: string) => {
  const response = await fetch(`${API_BASE_URL}/payment.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      action: 'verify',
      order_id: orderId,
      md5,
    }),
  });

  const data = await response.json();
  return data;
};

// Manual confirm for testing
export const confirmPaymentManual = async (orderId: string) => {
  const response = await fetch(`${API_BASE_URL}/payment.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      action: 'confirm-manual',
      order_id: orderId,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || 'Failed to confirm payment');
  }

  return data;
};
