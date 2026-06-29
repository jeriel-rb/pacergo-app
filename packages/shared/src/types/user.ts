import type { ExperienceLevel } from "../enums/experience";
import type { Gender } from "../enums/gender";

/** The signed-in user. Field names mirror the `users` table / mobile app. */
export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  photo_url: string | null;
  /** Wide cover photo shown behind the avatar on the profile + trainer pages. */
  banner_url?: string | null;
  experience_level: ExperienceLevel | null;
  /** Optional richer profile fields (populated when read from the `users` table). */
  bio?: string | null;
  home_area?: string | null;
  gender?: Gender | null;
  /** Whether the user has a trainer listing (drives the "become a trainer" UI). */
  is_companion?: boolean;
  /** Platform admin (can review Tier A verification requests). */
  is_admin?: boolean;
}
