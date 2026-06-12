import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useSession } from './useSession';
import { useProfile } from '@/features/profile/useProfile';
import { resolveAuthRoute, type RouteGroup } from './resolveAuthRoute';

function groupFromSegments(segments: string[]): RouteGroup {
  const first = segments[0];
  if (first === '(auth)') return 'auth';
  if (first === '(onboarding)') return 'onboarding';
  if (first === '(tabs)') return 'tabs';
  return 'other';
}

export function useRouteGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading: sessionLoading } = useSession();
  const profile = useProfile();

  const loading = sessionLoading || (Boolean(session) && profile.isLoading);

  useEffect(() => {
    const target = resolveAuthRoute({
      loading,
      hasSession: Boolean(session),
      onboarded: Boolean(profile.data?.onboarding_completed),
      group: groupFromSegments(segments as string[]),
    });
    if (target) router.replace(target as never);
  }, [loading, session, profile.data?.onboarding_completed, segments, router]);
}
