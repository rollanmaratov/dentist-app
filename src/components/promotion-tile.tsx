import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Promotion } from '@/data/api';
import { colors, gradients, radius, space } from '@/theme';

/**
 * Story-style promotion tile with the brand outline from the Home screen.
 * Promotions with a detail page open it full screen (Figma 4203:2255).
 */
export function PromotionTile({ promotion }: { promotion: Promotion }) {
  const content = (
    <View style={styles.inner}>
      <Image source={promotion.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.scrim} />
      <Text variant="small" color="textOnBrand" numberOfLines={3} style={styles.label}>
        {promotion.title}
      </Text>
    </View>
  );

  if (!promotion.detail) {
    return (
      <View style={styles.ring} accessible accessibilityRole="image" accessibilityLabel={promotion.title}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/promotion/[id]', params: { id: promotion.id } })}
      style={({ pressed }) => [styles.ring, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={promotion.title}
      accessibilityHint="Opens the promotion">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 104,
    height: 116,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.borderBrand,
    padding: 3,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  inner: {
    flex: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.bgInput,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage: gradients.promotionTile,
  },
  label: { padding: space[8] },
});
