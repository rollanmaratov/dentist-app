import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space } from '@/theme';

/** Height to reserve at the bottom of scroll content so it can scroll clear of the footer. */
export const PINNED_FOOTER_SPACE = 56 + space[16];

/**
 * Bottom-pinned action area (e.g. "Book (Mon 12 Aug 14:00)").
 *
 * The native `SafeAreaView` reads the *view's own* safe area, which inside a tab
 * includes the floating native tab bar — so the footer sits just above it, like in
 * Figma. (The JS `useSafeAreaInsets` hook only knows the window insets.)
 */
export function PinnedFooter({ children }: PropsWithChildren) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.footer} pointerEvents="box-none">
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[20],
    paddingBottom: space[4],
  },
});
