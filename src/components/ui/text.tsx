import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
};

export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  return <RNText style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
