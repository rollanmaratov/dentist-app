import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Rating } from '@/components/ui/rating';
import { Text } from '@/components/ui/text';
import type { Specialist } from '@/data/api';
import { formatPriceFrom } from '@/data/constants';
import { colors, radius, shadow, space } from '@/theme';

/** "card / specialist" (Figma 57:1989) — vertical card used in the Home slider. */
export function SpecialistCard({ specialist }: { specialist: Specialist }) {
  return (
    <Link href={{ pathname: '/specialist/[id]', params: { id: specialist.id } }} asChild>
      <Pressable style={styles.card} accessibilityRole="button">
        <Image source={specialist.photoUrl} style={styles.photo} contentFit="cover" transition={150} />
        <View style={styles.body}>
          <Rating value={specialist.rating} count={specialist.reviewCount} countLabel="Reviews" />
          <Text variant="body" numberOfLines={2} style={styles.name}>
            {specialist.name}
          </Text>
          <Text color="textTertiary">{specialist.specialty}</Text>
          <Text color="textTertiary">{specialist.yearsOfExperience} years experience</Text>
        </View>
        <Link href={{ pathname: '/book', params: { specialistId: specialist.id } }} asChild>
          <Button title={formatPriceFrom(specialist.priceFrom)} size="compact" />
        </Link>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: space[10],
    gap: space[10],
    boxShadow: shadow.card,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.bgCanvas,
  },
  body: { gap: space[2], flexGrow: 1 },
  name: { marginTop: space[4], marginBottom: space[2] },
});
