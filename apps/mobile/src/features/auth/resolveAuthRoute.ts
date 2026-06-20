export type RouteGroup = 'auth' | 'onboarding' | 'tabs' | 'other';

export type AuthRouteInput = {
  loading: boolean;
  hasSession: boolean;
  onboarded: boolean;
  group: RouteGroup;
};

export function resolveAuthRoute(input: AuthRouteInput): string | null {
  const { loading, hasSession, onboarded, group } = input;
  if (loading) return null;

  if (!hasSession) {
    return group === 'auth' ? null : '/(auth)/sign-in';
  }

  if (!onboarded) {
    return group === 'onboarding' ? null : '/(onboarding)';
  }

  // Signed in + onboarded: must be inside the app.
  if (group === 'auth' || group === 'onboarding') return '/(tabs)';
  return null;
}
