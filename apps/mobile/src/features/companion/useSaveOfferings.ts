import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { OfferingDraft } from './types';

/**
 * Persist offerings through the `add_offering` RPC (same path as web), so the
 * server enforces the platform rules: per-tier price floors, cert-gated tiers
 * (B/A need an approved certification, A also competition experience), and
 * one offering per activity (the RPC replaces any existing one).
 */
export function useSaveOfferings() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ offerings }: { offerings: OfferingDraft[] }) => {
      for (const o of offerings) {
        const { error } = await supabase.rpc('add_offering', {
          p_activity_slug: o.activity_slug,
          p_tier: o.tier,
          p_price_ntd: o.price_ntd,
          p_is_free: false,
          p_session_minutes: o.session_minutes,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myListing', uid] }),
  });
}
