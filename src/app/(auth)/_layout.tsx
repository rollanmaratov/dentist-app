import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/navigation/stack-options';

export const unstable_settings = { anchor: 'sign-in' };

export default function AuthStackLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      {/* Figma's sign-in screen has no navigation bar; the logo is drawn in the page. */}
      <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerShown: false }} />
      {/* Code screen keeps the native glass back button ("Change number"). */}
      <Stack.Screen name="verify" options={{ title: '' }} />
    </Stack>
  );
}
