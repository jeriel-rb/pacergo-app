import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExperienceLevel, Gender } from '@pacergo/shared';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/useSession';

export type Profile = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  banner_url: string | null;
  bio: string | null;
  experience_level: ExperienceLevel | null;
  home_area: string | null;
  gender: Gender | null;
  is_companion: boolean;
  onboarding_completed: boolean;
  weekly_target: number;
  is_admin: boolean;
};

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.rpc('get_my_profile');
      if (error) throw error;
      if (!data) return null;
      const row = data as Omit<Profile, 'id'>;
      return { id: userId as string, ...row };
    },
  });
}

/** Editable profile basics via the update_my_profile RPC. */
export function useUpdateProfile() {
  const { session } = useSession();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      display_name?: string | null;
      bio?: string | null;
      experience_level?: ExperienceLevel | null;
      home_area?: string | null;
      gender?: Gender | null;
    }) => {
      const { error } = await supabase.rpc('update_my_profile', {
        p_display_name: patch.display_name ?? null,
        p_bio: patch.bio ?? null,
        p_experience_level: patch.experience_level ?? null,
        p_home_area: patch.home_area ?? null,
        p_gender: patch.gender ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

/** Onboarding: profile basics + chosen activities in one server call. */
export function useCompleteOnboarding() {
  const { session } = useSession();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      displayName: string;
      experienceLevel: ExperienceLevel;
      homeArea: string | null;
      activityIds: string[];
    }) => {
      const { error } = await supabase.rpc('complete_onboarding', {
        p_display_name: input.displayName,
        p_experience_level: input.experienceLevel,
        p_home_area: input.homeArea,
        p_activity_ids: input.activityIds,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}
