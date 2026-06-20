import { useOnboardingStore } from '../onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => useOnboardingStore.getState().reset());

  it('toggles activity selection', () => {
    const { toggleActivity } = useOnboardingStore.getState();
    toggleActivity('a1');
    expect(useOnboardingStore.getState().activityIds).toEqual(['a1']);
    toggleActivity('a1');
    expect(useOnboardingStore.getState().activityIds).toEqual([]);
  });

  it('sets fields', () => {
    useOnboardingStore.getState().setField('displayName', 'Lee');
    expect(useOnboardingStore.getState().displayName).toBe('Lee');
  });
});
