// @pacergo/shared — enums, types, helpers, constants, schemas.
// Shared across apps/web (Next.js) and apps/mobile (React Native).

export * from './enums/tier';
export * from './enums/activity';
export * from './enums/booking';
export * from './enums/experience';
export * from './enums/gender';
export * from './enums/training';
export * from './enums/profile-setup';

export * from './constants/tier-labels';
export * from './constants/tier-pricing';
export * from './constants/activity-meta';
export * from './constants/support';

export * from './plan/plan-types';
export * from './plan/plan-composer';
export * from './plan/generated-plan-types';
export * from './plan/generate-plan';
export * from './plan/split-recommendation';
export * from './plan/exercise-fit';
export * from './plan/progression';
export * from './plan/plan-inputs';
export * from './plan/exercise-qa';
export * from './plan/exercise-meta';
export * from './plan/stretch-library';
export * from './plan/structured-variation';

export * from './onboarding/onboarding-types';
export * from './onboarding/equipment-catalog';

export * from './nutrition/fitness-profile';
export * from './nutrition/nutrition-rules';
export * from './nutrition/calculate-nutrition';
export * from './nutrition/profile-limits';

export * from './booking/state-machine';

export * from './time/app-timezone';

export * from './types/trainer';
export * from './types/booking';
export * from './types/user';
export * from './types/chat';
export * from './types/nearby';
export * from './matching/rank-companions';
export * from './matching/city';
