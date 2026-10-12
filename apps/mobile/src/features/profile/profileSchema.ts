import { z } from 'zod';
import { EXPERIENCE_LEVELS, type ExperienceLevel } from '@pacergo/shared';

export function isAdult(birthdate: Date, now: Date = new Date()): boolean {
  const eighteenth = new Date(birthdate);
  eighteenth.setFullYear(eighteenth.getFullYear() + 18);
  return eighteenth.getTime() <= now.getTime();
}

/** Public profile and plan chips share beginner / basic / intermediate / advanced. */
export const experienceLevels = EXPERIENCE_LEVELS;
export type { ExperienceLevel };

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  birthdate: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date')
    .refine((s) => isAdult(new Date(s)), 'must be 18+'),
  experienceLevel: z.enum(experienceLevels),
  activityIds: z.array(z.string().min(1)).min(1),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
