import { describe, it, expect } from 'vitest';
import { getRecommendedTrainers, getTrainerById } from '../queries/trainers';
import { getActivities } from '../queries/activities';

describe('trainer queries (mock)', () => {
  it('returns the home feed with no filter', async () => {
    const list = await getRecommendedTrainers();
    expect(list.length).toBe(6);
  });

  it('filters by activity', async () => {
    const running = await getRecommendedTrainers({ activity: 'running' });
    expect(running.length).toBeGreaterThan(0);
    expect(running.every((t) => t.activities.includes('running'))).toBe(true);
  });

  it('returns a full profile by id and null for unknown', async () => {
    const profile = await getTrainerById('lin-yating');
    expect(profile).not.toBeNull();
    expect(profile?.certifications.length).toBeGreaterThan(0);
    expect(await getTrainerById('does-not-exist')).toBeNull();
  });
});

describe('activity queries (mock)', () => {
  it('marks gym/running/hiking active', async () => {
    const activities = await getActivities();
    const active = activities.filter((a) => a.is_active).map((a) => a.slug);
    expect(active).toEqual(expect.arrayContaining(['gym', 'walking', 'running', 'hiking']));
  });
});
