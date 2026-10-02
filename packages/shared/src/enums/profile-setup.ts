import type { OnboardingExperience } from '../onboarding/onboarding-types';

/** First-run Profile Setup (the dialog on Home). Every answer lands in the
 *  Shared Fitness Profile, so the fitness onboarding never asks it again:
 *  level -> training experience, main activity -> `primaryActivity`,
 *  city -> the account's existing `home_area`. */

/** What the user mainly trains. Stored in the fitness profile's `about_you`. */
export type PrimaryActivity = 'gym' | 'running' | 'hiking' | 'other';

export const PRIMARY_ACTIVITIES: readonly PrimaryActivity[] = [
  'gym',
  'running',
  'hiking',
  'other',
] as const;

/** `null` status = the setup has never been shown to this user. */
export type ProfileSetupStatus = 'completed' | 'skipped';

/** What the dialog starts from — read from the fitness profile + account. */
export interface ProfileSetupState {
  status: ProfileSetupStatus | null;
  primaryActivity: PrimaryActivity | null;
  /** Fitness-profile training experience (the "level" the dialog asks). */
  experience: OnboardingExperience | null;
  /** The existing `home_area` field. */
  city: string | null;
}
