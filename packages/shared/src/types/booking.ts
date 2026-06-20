import type { Tier } from '../enums/tier';
import type { BookingStatus } from '../enums/booking';
import type { ActivitySlug } from '../enums/activity';

export interface Booking {
  id: string;
  trainer_id: string;
  activity: ActivitySlug | null;
  tier: Tier | null;
  status: BookingStatus;
  scheduled_start: string | null;
  duration_min: number;
  agreed_price: number;
  is_free: boolean;
  created_at: string;
}
