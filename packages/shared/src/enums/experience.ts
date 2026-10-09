/** Public profile column. `beginner` is the Beginner pick; `basic` is the Basic pick. */
export type ExperienceLevel = 'beginner' | 'basic' | 'intermediate' | 'advanced';

/** Levels the original mobile plan composer offers. Basic is not one of them. */
export type ComposerExperienceLevel = Exclude<ExperienceLevel, 'basic'>;

export const EXPERIENCE_LEVELS: readonly ComposerExperienceLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
] as const;
