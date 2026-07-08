export type ActivitySlug =
  | 'gym'
  | 'running'
  | 'hiking'
  | 'hyrox'
  | 'cycling'
  | 'yoga'
  | 'swimming'
  | 'boxing'
  | 'basketball';

export const ACTIVITY_SLUGS: readonly ActivitySlug[] = [
  'gym',
  'running',
  'hiking',
  'hyrox',
  'cycling',
  'yoga',
  'swimming',
  'boxing',
  'basketball',
] as const;
