import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export type Activity = {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  icon: string | null;
};

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
      return (data ?? []) as Activity[];
    },
  });
}
