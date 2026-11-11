import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { Text } from './text';

type RatingProps = {
  value: number;
  count?: number;
  /** Text after the count, e.g. "Reviews". */
  countLabel?: string;
};

const countFormatter = new Intl.NumberFormat('ru-RU');

/** "Rating" from the specialist cards: "4.7 ★ 1 094 Reviews" (SF Pro Semibold 12, star icon). */
export function Rating({ value, count, countLabel }: RatingProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Rating ${value} out of 5${count !== undefined ? `, ${count} reviews` : ''}`}>
      <Text variant="small" style={styles.value}>
        {value.toFixed(1)}
      </Text>
      <StarIcon />
      {count !== undefined && (
        <Text variant="small" style={styles.count}>
          {countFormatter.format(count)}
          {countLabel ? ` ${countLabel}` : ''}
        </Text>
      )}
    </View>
  );
}

/** "icon / star" (Figma 57:1983): 12pt frame, glyph inset 9.36% / 7.13%. */
export function StarIcon() {
  return (
    <View style={styles.starFrame}>
      <Image source={require('@/assets/images/icon-star.svg')} style={styles.star} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  value: { color: colors.star, fontWeight: '600' },
  count: { marginLeft: space[2] },
  starFrame: { width: 12, height: 12 },
  star: { position: 'absolute', top: 1.12, left: 0.86, width: 10.2879, height: 10.7833 },
});
