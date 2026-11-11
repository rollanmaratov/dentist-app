import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/navigation/stack-options';

export const unstable_settings = { anchor: 'chat' };

export default function ChatStackLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
