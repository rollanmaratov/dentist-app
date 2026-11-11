import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { colors } from '@/theme';

/**
 * Full-screen photo from the support chat. Presented as a native modal sheet (swipe down
 * or "Done" to close); the native ScrollView handles pinch-to-zoom.
 */
export default function PhotoScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          // Native bar button: Liquid Glass on iOS 26.
          unstable_headerRightItems: () => [
            { type: 'button', label: 'Done', variant: 'done', tintColor: colors.textBrand, onPress: () => router.back() },
          ],
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        minimumZoomScale={1}
        maximumZoomScale={4}
        centerContent
        bouncesZoom
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}>
        <Image source={url} style={styles.image} contentFit="contain" accessibilityLabel="Photo" />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bgPhotoViewer },
  content: { flexGrow: 1 },
  image: { flex: 1 },
});
