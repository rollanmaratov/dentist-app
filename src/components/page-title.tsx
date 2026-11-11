import type { StyleProp, TextStyle } from 'react-native';

import { Text } from '@/components/ui/text';

type PageTitleProps = {
  children: string;
  /**
   * `large` — Heading 1 (34pt), the title of the iOS "Large Title" toolbar in Figma
   * (Specialists, Book Specialist).
   * `medium` — Heading 2 (22pt), used by tab pages without a toolbar (My Appointments, Profile).
   */
  size?: 'large' | 'medium';
  style?: StyleProp<TextStyle>;
};

/**
 * Page title rendered in content, directly under the native (glass) navigation bar.
 * The native bar keeps the back button and toolbar items; the title lives here so it can
 * use SF Pro Rounded, which the native header can't render.
 */
export function PageTitle({ children, size = 'large', style }: PageTitleProps) {
  return (
    <Text variant={size === 'large' ? 'heading1' : 'heading2'} accessibilityRole="header" style={style}>
      {children}
    </Text>
  );
}
