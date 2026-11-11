import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/navigation/stack-options';

export const unstable_settings = { anchor: 'profile' };

export default function ProfileStackLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
