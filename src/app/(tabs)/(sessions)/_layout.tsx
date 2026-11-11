import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/navigation/stack-options';

export const unstable_settings = { anchor: 'sessions' };

export default function SessionsStackLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
