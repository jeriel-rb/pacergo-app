import { z } from 'zod';

export function isAdult(birthdate: Date, now: Date = new Date()): boolean {
  const eighteenth = new Date(birthdate);
  eighteenth.setFullYear(eighteenth.getFullYear() + 18);
  return eighteenth.getTime() <= now.getTime();
}

export const experienceLevels = ['beginner', 'intermediate', 'advanced'] as const;
export type ExperienceLevel = (typeof experienceLevels)[number];

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
