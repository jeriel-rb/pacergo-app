import '../global.css';
import '@/lib/i18n';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { queryClient } from '@/lib/query/client';
import { supabase } from '@/lib/supabase/client';
import { SessionProvider } from '@/features/auth/SessionProvider';
import { useRouteGuard } from '@/features/auth/useRouteGuard';

SplashScreen.preventAutoHideAsync();

// Keep Supabase session auto-refresh tied to app foreground state.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

function Guarded() {
  useRouteGuard();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="saved" options={{ presentation: 'modal' }} />
      <Stack.Screen name="companion/[id]" />
      <Stack.Screen name="booking/request/[companionId]" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="booking/review/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="companion-setup" />
      <Stack.Screen name="companion-dashboard" />
      <Stack.Screen name="listing-editor" />
      <Stack.Screen name="availability-editor" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="report/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="safety" />
      <Stack.Screen name="ai-plan" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceGrotesk_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ThemeProvider>
              <Guarded />
            </ThemeProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
