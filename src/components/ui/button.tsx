import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space, type ColorToken } from '@/theme';

import { Text } from './text';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  /**
   * Figma "Button" (4165:2273): Primary (brand fill), Secondary (brand outline),
   * Danger outline (red outline).
   */
  variant?: 'primary' | 'secondary' | 'danger';
  /**
   * `regular` — 56pt, 15pt label (Figma "Button").
   * `compact` — 48pt price button on specialist cards.
   * `large` — 57pt, radius-lg, 17pt label: the sign-in "Continue" button.
   */
  size?: 'regular' | 'compact' | 'large';
  style?: StyleProp<ViewStyle>;
};

const LABEL_COLOR: Record<NonNullable<ButtonProps['variant']>, ColorToken> = {
  primary: 'textOnBrand',
  secondary: 'textBrand',
  danger: 'dangerAction',
};

export function Button({ title, variant = 'primary', size = 'regular', disabled, style, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'compact' && styles.compact,
        size === 'large' && styles.large,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...rest}>
      <Text variant={size === 'large' ? 'headline' : 'button'} color={disabled ? 'textSecondary' : LABEL_COLOR[variant]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingVertical: space[10],
    paddingHorizontal: space[16],
  },
  compact: { height: 48 },
  large: { height: 57, borderRadius: radius.lg },
  primary: { backgroundColor: colors.bgBrand },
  secondary: { borderWidth: 1, borderColor: colors.borderBrand },
  danger: { borderWidth: 1, borderColor: colors.dangerAction },
  // Matches the inactive "Continue" button on the sign-in screen.
  disabled: { backgroundColor: colors.bgInput, borderWidth: 0 },
  pressed: { opacity: 0.85 },
});
