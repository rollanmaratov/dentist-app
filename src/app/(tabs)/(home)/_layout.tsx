import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/navigation/stack-options';

export const unstable_settings = { anchor: 'index' };

export default function HomeStackLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
