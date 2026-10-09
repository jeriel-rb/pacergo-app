import type { ActivitySlug } from '../enums/activity';
import type { ExperienceLevel } from '../enums/experience';
import type { ProfileSetupState } from '../enums/profile-setup';
import type { OnboardingExperience } from '../onboarding/onboarding-types';
import type { TrainerSummary } from '../types/trainer';
import { cityKey } from './city';

/** Points per signal. Activity matters most, then being nearby, then level. */
export const MATCH_WEIGHTS = { activity: 3, city: 2, level: 1 } as const;

const ACTIVITY_RANK: Record<OnboardingExperience, number> = {
  no_experience: 0,
  basic: 1,
  intermediate: 2,
  advanced: 3,
};
const TRAINER_LEVEL_RANK: Record<ExperienceLevel, number> = {
  beginner: 0,
  basic: 1,
  intermediate: 2,
  advanced: 3,
};

/** "Other" has no matching activity, so it never scores. */
function slugFor(activity: ProfileSetupState['primaryActivity']): ActivitySlug | null {
  return activity && activity !== 'other' ? activity : null;
}

function sameArea(userCity: string, trainerArea: string): boolean {
  const ka = cityKey(userCity);
  const kb = cityKey(trainerArea);
  if (ka && kb) return ka === kb;
  const a = userCity.trim().toLowerCase();
  const b = trainerArea.trim().toLowerCase();
  return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
}

export function companionMatchScore(
  trainer: TrainerSummary,
  profile: Pick<ProfileSetupState, 'primaryActivity' | 'experience' | 'city'>,
): number {
  let score = 0;
  const slug = slugFor(profile.primaryActivity);
  if (slug && trainer.activities.includes(slug)) score += MATCH_WEIGHTS.activity;
  if (profile.city && sameArea(profile.city, trainer.home_area)) score += MATCH_WEIGHTS.city;
  // A companion at or one step above the user's level is a good fit.
  if (profile.experience && trainer.experience_level) {
    const gap = TRAINER_LEVEL_RANK[trainer.experience_level] - ACTIVITY_RANK[profile.experience];
    if (gap >= 0 && gap <= 1) score += MATCH_WEIGHTS.level;
  }
  return score;
}

/** Reorders by match score; ties keep the incoming (recommendation) order.
 *  With no profile, or nothing known, the list is returned unchanged. */
export function rankCompanions(
  trainers: TrainerSummary[],
  profile: ProfileSetupState | null | undefined,
): TrainerSummary[] {
  if (!profile) return trainers;
  return trainers
    .map((t, i) => ({ t, i, s: companionMatchScore(t, profile) }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => x.t);
}
