import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Order {
  id: string;
  user_id: string;
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user,
  });
};

export const useHasPurchased = (appId: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['purchased', appId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .eq('app_id', appId)
        .eq('status', 'paid')
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!appId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ appId, appName, amount }: { appId: number; appName: string; amount: number }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          app_id: appId,
          app_name: appName,
          amount,
          currency: 'USD',
          status: 'pending',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
        })
        .select()
        .single();

      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
