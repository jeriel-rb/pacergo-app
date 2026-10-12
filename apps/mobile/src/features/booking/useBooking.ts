import { useQuery } from '@tanstack/react-query';
import { ONBOARDING_OBSTACLES, type OnboardingObstacle } from '@pacergo/shared';
import { supabase } from '@/lib/supabase/client';
import type { Booking } from './types';

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Booking | null> => {
      const { data, error } = await supabase.rpc('booking_detail', { p_id: id });
      if (error) throw error;
      return (data ?? null) as Booking | null;
    },
  });
}

/** Obstacle the client named. Null unless the signed-in user is the trainer on this booking. */
export function useClientObstacle(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['booking-obstacle', id],
    enabled: Boolean(id) && enabled,
    queryFn: async (): Promise<OnboardingObstacle | null> => {
      const { data, error } = await supabase.rpc('booking_client_obstacle', { p_booking_id: id });
      if (error) throw error;
      return ONBOARDING_OBSTACLES.includes(data as OnboardingObstacle)
        ? (data as OnboardingObstacle)
        : null;
    },
  });
}
