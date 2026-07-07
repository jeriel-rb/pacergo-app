import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

/**
 * Upload a verification document and register it via submit_verification.
 * Certifications and competition experience are per-activity; `id` docs are
 * account-wide (no activity).
 */
export function useSubmitVerification() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docType,
      activitySlug,
      label,
      fileUri,
    }: {
      docType: 'certification' | 'competition' | 'id';
      activitySlug: string | null;
      label?: string;
      fileUri: string;
    }) => {
      const path = `${uid}/${docType}-${Date.now()}.jpg`;
      const res = await fetch(fileUri);
      const blob = await res.arrayBuffer();
      const { error: up } = await supabase.storage
        .from('verification-docs')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (up) throw up;
      const { error } = await supabase.rpc('submit_verification', {
        p_doc_type: docType,
        p_document_path: path,
        p_label: label ?? null,
        p_activity_slug: activitySlug,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myListing', uid] }),
  });
}
