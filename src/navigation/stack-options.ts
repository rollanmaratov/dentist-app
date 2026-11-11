import type { NativeStackNavigationOptions } from 'expo-router';

import { colors } from '@/theme';

/**
 * Shared options for every native stack in the app.
 *
 * On iOS 26+ the native header is transparent by default and its back button and
 * toolbar items render as Liquid Glass — we deliberately don't set a header
 * background, so the system effect stays in place.
 *
 * Native large titles are off: Figma sets page titles in SF Pro Rounded, which the
 * native header can't render. Screens show their title in content with <PageTitle>
 * and pass `headerTitle: ''` so the bar only carries the glass buttons.
 */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: false,
  headerShadowVisible: false,
  // Chevron-only back button, as in the Figma screens.
  headerBackButtonDisplayMode: 'minimal',
  headerTintColor: colors.textPrimary,
  contentStyle: { backgroundColor: colors.bgCanvas },
};
