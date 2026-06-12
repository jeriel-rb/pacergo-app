import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_account');
      if (error) throw error;
      await supabase.auth.signOut();
    },
  });
}
