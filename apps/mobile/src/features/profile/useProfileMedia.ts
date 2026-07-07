import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

/**
 * Upload an image to a public bucket (owner folder) and persist its public
 * URL through the matching RPC — same flow as web's avatar/banner uploaders.
 */
function useUploadImage(bucket: 'avatars' | 'banners', rpc: string, keyPrefix: string) {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fileUri: string) => {
      const path = `${uid}/${keyPrefix}-${Date.now()}.jpg`;
      const res = await fetch(fileUri);
      const blob = await res.arrayBuffer();
      const { error: up } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
      if (up) throw up;
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);
      const { error } = await supabase.rpc(rpc, { p_url: publicUrl });
      if (error) throw error;
      return publicUrl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', uid] }),
  });
}

export function useSetAvatar() {
  return useUploadImage('avatars', 'set_my_photo_url', 'avatar');
}

export function useSetBanner() {
  return useUploadImage('banners', 'set_my_banner_url', 'banner');
}
