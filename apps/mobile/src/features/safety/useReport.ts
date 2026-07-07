import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { ReportReason } from './reportSchema';

export function useReport() {
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
      const { error } = await supabase.rpc('report_user', {
        p_reported_id: reportedId,
        p_reason: reason,
        p_details: details || null,
        p_booking_id: bookingId ?? null,
      });
      if (error) throw error;
    },
  });
}
