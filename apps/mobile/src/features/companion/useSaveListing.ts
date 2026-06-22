import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export type ListingPatch = {
  headline: string | null;
  bio_long: string | null;
  served_area: string | null;
  status: 'draft' | 'active' | 'paused';
};

export function useSaveListing() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ListingPatch): Promise<string> => {
      const { data, error } = await supabase
        .from('companion_listings')
        .upsert({ profile_id: uid, ...patch }, { onConflict: 'profile_id' })
        .select()
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase
        .from('users')
        .update({ is_companion: true })
        .eq('id', uid);
      if (e2) throw e2;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myListing', uid] });
      qc.invalidateQueries({ queryKey: ['profile', uid] });
    },
  });
}
