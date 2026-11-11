import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorView, LoadingView } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { usePromotion } from '@/data/queries';
import { colors, gradients, space } from '@/theme';

/** The Figma photo is cropped to the dentist and patient: 299pt off the left of a 1181pt-wide fill. */
const PHOTO_POSITION = { left: '38%' } as const;

/**
 * Figma "Home Screen Loader" (4203:2255): full-screen promotion with a photo, a dark
 * gradient, "PROMOTION", headline, text and a call to action. Presented as a full-screen
 * modal; the close button is a native glass bar button (SF Symbol "xmark").
 */
export default function PromotionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: promotion, isPending, isError, error, refetch } = usePromotion(id);

  const bookSession = () => {
    router.back();
    router.navigate('/book');
  };

  const header = (
    <Stack.Screen
      options={{
        title: '',
        headerTransparent: true,
        unstable_headerRightItems: () => [
          {
            type: 'button',
            label: 'Close',
            icon: { type: 'sfSymbol', name: 'xmark' },
            tintColor: colors.textPrimary,
            onPress: () => router.back(),
          },
        ],
      }}
    />
  );

  if (isPending) return <>{header}<LoadingView fill /></>;
  if (isError) return <>{header}<ErrorView error={error} onRetry={refetch} fill /></>;
  if (!promotion?.detail) {
    return (
      <>
        {header}
        <Text color="textSecondary" style={styles.missing}>
          This promotion has ended.
        </Text>
      </>
    );
  }

  const { headline, body, heroImageUrl, ctaLabel } = promotion.detail;

  return (
    <View style={styles.screen}>
      {header}
      <Image
        source={heroImageUrl}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={PHOTO_POSITION}
        transition={200}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.scrim} />

      <SafeAreaView edges={['bottom']} style={styles.content}>
        <View style={styles.copy}>
          <Text variant="promoEyebrow" color="textOnBrand">
            PROMOTION
          </Text>
          <Text variant="promoHeadline" color="textOnBrand" accessibilityRole="header" style={styles.headline}>
            {headline}
          </Text>
          <Text color="textOnBrand">{body}</Text>
        </View>
        <Button title={ctaLabel ?? 'Book a Session'} onPress={bookSession} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPromotion },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, experimental_backgroundImage: gradients.promotionPage },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: space[20],
    paddingBottom: space[8],
    gap: space[20],
  },
  copy: { paddingHorizontal: space[4] },
  headline: { marginTop: space[8], marginBottom: space[10] },
  missing: { flex: 1, textAlign: 'center', textAlignVertical: 'center', padding: space[24] },
});
