import type { ExperienceLevel } from "../enums/experience";

/** The signed-in user. Field names mirror the `profiles` table / mobile app. */
export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  photo_url: string | null;
  experience_level: ExperienceLevel | null;
}
