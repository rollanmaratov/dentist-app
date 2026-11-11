import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/navigation/stack-options';

export const unstable_settings = { anchor: 'book' };

export default function BookStackLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
