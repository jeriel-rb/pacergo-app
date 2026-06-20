import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { ReportReason } from './reportSchema';

export function useReport() {
  const { session } = useSession();
  return useMutation({
    mutationFn: async ({
      reportedId,
      reason,
      details,
      bookingId,
    }: {
      reportedId: string;
      reason: ReportReason;
      details?: string;
      bookingId?: string | null;
    }) => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: session?.user.id,
        reported_id: reportedId,
        reason,
        details: details || null,
        booking_id: bookingId ?? null,
      });
      if (error) throw error;
    },
  });
}
