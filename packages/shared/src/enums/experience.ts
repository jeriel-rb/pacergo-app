/** Experience words for `users.experience_level` and plan answers. */
export const EXPERIENCE_LEVELS = ['beginner', 'basic', 'intermediate', 'advanced'] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
