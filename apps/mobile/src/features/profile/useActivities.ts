import { useQuery } from '@tanstack/react-query';
import { ACTIVITY_SLUGS, type ActivitySlug } from '@pacergo/shared';
import { supabase } from '@/lib/supabase/client';

export type Activity = {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  icon: string | null;
};

function catalogOrder(slug: string): number {
  const index = ACTIVITY_SLUGS.indexOf(slug as ActivitySlug);
  return index === -1 ? ACTIVITY_SLUGS.length : index;
}

export function useActivities() {
  return useQuery({
    queryKey: ['activities', 'active'],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, slug, name_en, name_zh, icon')
        .eq('is_active', true)
        .order('slug');
      if (error) throw error;
      return ((data ?? []) as Activity[]).sort(
        (a, b) => catalogOrder(a.slug) - catalogOrder(b.slug),
      );
    },
  });
}
