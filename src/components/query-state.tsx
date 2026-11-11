import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors, space } from '@/theme';

/** Native spinner for a screen or section that's loading. */
export function LoadingView({ fill = false }: { fill?: boolean }) {
  return (
    <View style={[styles.center, fill && styles.fill]}>
      <ActivityIndicator color={colors.textTertiary} />
    </View>
  );
}

/** Error message with a retry button. */
export function ErrorView({ error, onRetry, fill = false }: { error: unknown; onRetry: () => void; fill?: boolean }) {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  return (
    <View style={[styles.center, fill && styles.fill]}>
      <Text color="textSecondary" style={styles.message}>
        {message}
      </Text>
      <Button title="Try again" variant="secondary" onPress={onRetry} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: space[16], padding: space[24] },
  fill: { flex: 1 },
  message: { textAlign: 'center' },
  button: { alignSelf: 'stretch' },
});
