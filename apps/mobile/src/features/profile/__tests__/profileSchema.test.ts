import { isAdult, onboardingSchema } from '../profileSchema';

describe('isAdult', () => {
  it('is true for an 18th birthday today', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    expect(isAdult(d, new Date())).toBe(true);
  });

  it('is false one day before the 18th birthday', () => {
    const today = new Date('2026-06-12');
    const dob = new Date('2008-06-13');
    expect(isAdult(dob, today)).toBe(false);
  });
});

describe('onboardingSchema', () => {
  it('accepts a valid adult profile with at least one activity', () => {
    const result = onboardingSchema.safeParse({
      displayName: 'Lee',
      birthdate: '2000-01-01',
      experienceLevel: 'beginner',
      activityIds: ['11111111-1111-1111-1111-111111111111'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty display name', () => {
    const result = onboardingSchema.safeParse({
      displayName: '',
      birthdate: '2000-01-01',
      experienceLevel: 'beginner',
      activityIds: ['11111111-1111-1111-1111-111111111111'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when no activity is selected', () => {
    const result = onboardingSchema.safeParse({
      displayName: 'Lee',
      birthdate: '2000-01-01',
      experienceLevel: 'beginner',
      activityIds: [],
    });
    expect(result.success).toBe(false);
  });
});
