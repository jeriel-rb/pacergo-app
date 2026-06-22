import type { ExperienceLevel } from "../enums/experience";

/** The signed-in user. Field names mirror the `users` table / mobile app. */
export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  photo_url: string | null;
  experience_level: ExperienceLevel | null;
  /** Optional richer profile fields (populated when read from the `users` table). */
  bio?: string | null;
  home_area?: string | null;
}
