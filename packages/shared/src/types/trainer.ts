import type { Tier } from '../enums/tier';
import type { ExperienceLevel } from '../enums/experience';
import type { ActivitySlug } from '../enums/activity';

/**
 * Compact trainer record for discovery cards. Field names mirror the DB /
 * `apps/mobile` shapes (`display_name`, `photo_url`, `price_ntd`, …) so the
 * native app can migrate onto these shared types without churn.
 */
export interface TrainerSummary {
  id: string;
  display_name: string;
  photo_url: string | null;
  tier: Tier;
  activities: ActivitySlug[];
  home_area: string;
  price_ntd: number;
  is_free: boolean;
  rating_avg: number;
  rating_count: number;
  experience_level: ExperienceLevel | null;
}

export interface Offering {
  activity: ActivitySlug;
  tier: Tier;
  price_ntd: number;
  is_free: boolean;
  session_minutes: number;
}

export interface AvailabilitySlot {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  start_minute: number;
  end_minute: number;
}

export interface GymMembership {
  name: string;
  branch: string | null;
}

export interface Review {
  id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface PlatformManager {
  name: string;
  region: string;
  note_zh: string;
  note_en: string;
}

/** Full trainer profile for the detail page. */
export interface TrainerProfile extends TrainerSummary {
  bio: string;
  certifications: string[];
  offerings: Offering[];
  gym_memberships: GymMembership[];
  availability: AvailabilitySlot[];
  reviews: Review[];
  manager: PlatformManager | null;
  is_bidding: boolean;
}
