import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';
import type { Verification } from './types';

export function useMyVerification() {
  const { session } = useSession();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['verification', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<Verification | null> => {
      const { data, error } = await supabase
        .from('verifications')
        .select('id, doc_type, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Verification | null;
    },
  });
}

export function useSubmitVerification() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docType,
      fileUri,
    }: {
      docType: 'certification' | 'id';
      fileUri: string;
    }) => {
      const path = `${uid}/${Date.now()}.jpg`;
      const res = await fetch(fileUri);
      const blob = await res.arrayBuffer();
      const { error: up } = await supabase.storage
        .from('verification-docs')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (up) throw up;
      const { error } = await supabase
        .from('verifications')
        .insert({ user_id: uid, doc_type: docType, document_path: path, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification', uid] }),
  });
}
