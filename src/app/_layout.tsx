import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { SessionProvider, useSession } from '@/features/auth/session';
import { stackScreenOptions } from '@/navigation/stack-options';
import { colors } from '@/theme';

// Keep the splash up until the stored session is restored, so signed-in users
// never see the sign-in screen flash.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

const theme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.bgBrand,
    background: colors.bgCanvas,
    card: colors.bgSurface,
    text: colors.textPrimary,
    border: colors.borderSubtle,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          {/* Keyboard tracking for the chat composer (react-native-keyboard-controller). */}
          <KeyboardProvider>
            <RootNavigator />
          </KeyboardProvider>
          <StatusBar style="dark" />
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { isReady, isSignedIn } = useSession();

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  useEffect(() => {
    // Don't leak one patient's cached data into the next session.
    if (!isSignedIn) queryClient.clear();
  }, [isSignedIn]);

  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        {/* Pushed above the tab bar so its booking button can be pinned to the bottom. */}
        <Stack.Screen name="specialist/[id]" options={{ ...stackScreenOptions, headerShown: true }} />
        {/* Chat photo viewer, as a native modal sheet over the tabs. */}
        <Stack.Screen name="photo" options={{ ...stackScreenOptions, headerShown: true, presentation: 'modal' }} />
        {/* Promotion page: full screen, closed with its glass ✕ button. */}
        <Stack.Screen
          name="promotion/[id]"
          options={{ ...stackScreenOptions, headerShown: true, presentation: 'fullScreenModal' }}
        />
      </Stack.Protected>
    </Stack>
  );
}
