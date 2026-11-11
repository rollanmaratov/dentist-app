import { View, type ViewProps } from 'react-native';

import { colors, radius, shadow, space } from '@/theme';

/** White surface with radius-xl and shadow/card. */
export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgSurface,
          borderRadius: radius.xl,
          borderCurve: 'continuous',
          padding: space[16],
          boxShadow: shadow.card,
        },
        style,
      ]}
      {...rest}
    />
  );
}
