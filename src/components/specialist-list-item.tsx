import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Rating } from '@/components/ui/rating';
import { Text } from '@/components/ui/text';
import type { Specialist } from '@/data/api';
import { formatPriceFrom } from '@/data/constants';
import { colors, radius, shadow, space } from '@/theme';

/** "List Item / Specialist" (Figma 67:2112) — row used in the specialists list. */
export function SpecialistListItem({ specialist }: { specialist: Specialist }) {
  return (
    <Link href={{ pathname: '/specialist/[id]', params: { id: specialist.id } }} asChild>
      <Pressable style={styles.row} accessibilityRole="button">
        <Image source={specialist.photoUrl} style={styles.photo} contentFit="cover" transition={150} />
        <View style={styles.body}>
          <Text variant="headline" numberOfLines={2}>
            {specialist.name}
          </Text>
          <Text variant="small" color="textTertiary">
            {specialist.specialty} · {specialist.yearsOfExperience} years
          </Text>
          <View style={styles.meta}>
            <Rating value={specialist.rating} count={specialist.reviewCount} />
            <Text variant="small" color="textBrand">
              {formatPriceFrom(specialist.priceFrom)}
            </Text>
          </View>
        </View>
        <SymbolView name="chevron.right" size={14} tintColor={colors.textPlaceholder} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: space[12],
    boxShadow: shadow.card,
  },
  photo: { width: 80, height: 80, borderRadius: radius.lg, borderCurve: 'continuous' },
  body: { flex: 1, gap: space[4] },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[2] },
});
