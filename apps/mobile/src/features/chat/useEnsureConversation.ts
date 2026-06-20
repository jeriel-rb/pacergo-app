import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import { useProfile } from '@/features/profile/useProfile';
import { orderPair } from './orderPair';

export type EnsureInput = {
  otherId: string;
  otherName: string | null;
  otherPhoto: string | null;
  bookingId?: string | null;
};

export function useEnsureConversation() {
  const { session } = useSession();
  const { data: me } = useProfile();
  const myId = session?.user.id;

  return useMutation({
    mutationFn: async (input: EnsureInput): Promise<string> => {
      if (!myId) throw new Error('no session');
      const [a, b] = orderPair(myId, input.otherId);
      const myName = me?.display_name ?? null;
      const myPhoto = me?.photo_url ?? null;
      const aIsMe = a === myId;

      const { data: existing, error: selErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_a', a)
        .eq('participant_b', b)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing?.id) return existing.id as string;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_a: a,
          participant_b: b,
          a_name: aIsMe ? myName : input.otherName,
          a_photo: aIsMe ? myPhoto : input.otherPhoto,
          b_name: aIsMe ? input.otherName : myName,
          b_photo: aIsMe ? input.otherPhoto : myPhoto,
          booking_id: input.bookingId ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
  });
}
