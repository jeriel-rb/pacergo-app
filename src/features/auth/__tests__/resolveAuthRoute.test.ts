import { resolveAuthRoute } from '../resolveAuthRoute';

describe('resolveAuthRoute', () => {
  it('returns null while auth state is loading', () => {
    expect(
      resolveAuthRoute({ loading: true, hasSession: false, onboarded: false, group: 'auth' })
    ).toBeNull();
  });

  it('sends signed-out users to sign-in', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: false, onboarded: false, group: 'tabs' })
    ).toBe('/(auth)/sign-in');
  });

  it('keeps signed-out users already on auth in place', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: false, onboarded: false, group: 'auth' })
    ).toBeNull();
  });

  it('sends signed-in, not-onboarded users to onboarding', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: true, onboarded: false, group: 'tabs' })
    ).toBe('/(onboarding)');
  });

  it('sends signed-in onboarded users out of the auth group into the app', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: true, onboarded: true, group: 'auth' })
    ).toBe('/(tabs)');
  });

  it('leaves signed-in onboarded users inside the app alone', () => {
    expect(
      resolveAuthRoute({ loading: false, hasSession: true, onboarded: true, group: 'tabs' })
    ).toBeNull();
  });
});
