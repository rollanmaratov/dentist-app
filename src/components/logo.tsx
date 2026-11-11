import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors, fonts } from '@/theme';

/**
 * "Logo" (Figma 22:1042): DOCTOR + tooth mark + DENT.
 * Figma sets the wordmark in SF Compact Rounded Semibold 22.877pt; iOS apps can't load
 * SF Compact, so it uses SF Pro Rounded at the same size and weight.
 */
export function Logo() {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Doctor Dent">
      <Text style={styles.word}>Doctor</Text>
      {/* "Simplification" frame 15.442×23.449 with the mark inset at (1.4, 0.78). */}
      <View style={styles.markFrame}>
        <Image source={require('@/assets/images/logo-mark.svg')} style={styles.mark} contentFit="contain" />
      </View>
      <Text style={styles.word}>Dent</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  word: {
    fontFamily: fonts.rounded,
    fontSize: 22.877,
    lineHeight: 27,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  markFrame: { width: 15.442, height: 23.449 },
  mark: { position: 'absolute', left: 1.4, top: 0.78, width: 12.7499, height: 21.9743 },
});
