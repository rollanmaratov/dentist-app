import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Rating } from '@/components/ui/rating';
import { Text } from '@/components/ui/text';
import type { Specialist } from '@/data/api';
import { formatPrice } from '@/data/constants';
import { colors, radius, space } from '@/theme';

type Props = {
  specialist: Specialist;
  selected: boolean;
  onPress: () => void;
};

/** "card / specialist" in the booking flow (Figma 223:1751): 151×310, 2pt brand border when selected. */
export function SpecialistPickCard({ specialist, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${specialist.name}, ${specialist.specialty}, ${formatPrice(specialist.priceFrom)}`}
      style={[styles.card, selected && styles.selected]}>
      <Image source={specialist.photoUrl} style={styles.photo} contentFit="cover" transition={150} />
      <View style={styles.body}>
        <Rating value={specialist.rating} />
        <Text color="textBlack" style={styles.name}>
          {specialist.name}
        </Text>
        <Text color="textTertiary">{specialist.specialty}</Text>
        <Text color="textTertiary" style={styles.experience}>
          {specialist.yearsOfExperience} years experience
        </Text>
        <View style={styles.spacer} />
        <Text color="textBrand">{formatPrice(specialist.priceFrom)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 151,
    minHeight: 310,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    // Always 2pt so selecting a card doesn't shift its content.
    borderWidth: 2,
    borderColor: 'transparent',
    paddingTop: 8,
    paddingBottom: 14,
  },
  selected: { borderColor: colors.borderBrand },
  photo: {
    width: 129,
    height: 129,
    alignSelf: 'center',
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.bgCanvas,
  },
  body: { flex: 1, paddingHorizontal: 11, paddingTop: 9, gap: space[2] },
  name: { marginBottom: space[4] },
  experience: { width: 97 },
  spacer: { flex: 1, minHeight: space[8] },
});
