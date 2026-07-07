import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export type PendingVerification = {
  id: string;
  user_id: string;
  display_name: string | null;
  photo_url: string | null;
  doc_type: 'certification' | 'competition' | 'id';
  activity: string | null;
  label: string | null;
  document_path: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export function usePendingVerifications() {
  return useQuery({
    queryKey: ['adminVerifications'],
    queryFn: async (): Promise<PendingVerification[]> => {
      const { data, error } = await supabase.rpc('list_pending_verifications');
      if (error) throw error;
      return (data ?? []) as PendingVerification[];
    },
  });
}

export function useReviewVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      notes?: string;
    }) => {
      const { error } = await supabase.rpc('review_verification', {
        p_id: id,
        p_status: status,
        p_notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminVerifications'] }),
  });
}

/** Signed URL so the admin can view the submitted document. */
export async function getVerificationDocUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('verification-docs').createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
