import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, space } from '@/theme';

import { Text } from './text';

type ChipProps = {
  label: string;
  selected?: boolean;
  /** Tonal chips (skills on the specialist page) are grey and not interactive. */
  tone?: 'surface' | 'subtle';
  onPress?: () => void;
};

export function Chip({ label, selected = false, tone = 'surface', onPress }: ChipProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected } : undefined}
      style={[styles.base, tone === 'subtle' && styles.subtle, selected && styles.selected]}>
      <Text variant={tone === 'subtle' ? 'small' : 'body'} color={selected ? 'textOnBrand' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.full,
    paddingVertical: space[6],
    paddingHorizontal: space[12],
  },
  subtle: { backgroundColor: colors.bgCanvas, paddingVertical: space[4], paddingHorizontal: space[10] },
  selected: { backgroundColor: colors.bgBrand },
});
