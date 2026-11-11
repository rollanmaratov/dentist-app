import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { toLocalDigits, useSession } from '@/features/auth/session';
import { colors, radius, space } from '@/theme';

const PHONE_LENGTH = 10;

/** "7021234567" → "(702) 123 45 67" */
function formatLocal(d: string): string {
  if (d.length === 0) return '';
  let out = `(${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += ` ${d.slice(6, 8)}`;
  if (d.length > 8) out += ` ${d.slice(8, 10)}`;
  return out;
}

function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * Figma: "Sign in" (22:967) empty, "Enter Code" (22:1808 / 22:1831) typing and filled.
 * No navigation bar — the logo is part of the page. Terms + Continue are pinned to the
 * bottom: 12pt above the keyboard, or just above the home indicator when it's closed.
 */
export default function SignInScreen() {
  const { requestCode } = useSession();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [digits, setDigits] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isComplete = digits.length === PHONE_LENGTH;

  const submit = async () => {
    if (!isComplete || isSending) return;
    setIsSending(true);
    const result = await requestCode(digits);
    setIsSending(false);
    if (result.ok) router.push('/verify');
    else Alert.alert('Could not send the code', result.message);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.logo}>
        <Logo />
      </View>

      <View style={styles.heading}>
        <Text variant="display" accessibilityRole="header">
          Welcome
        </Text>
        <Text variant="bodyLarge" color="textSecondary">
          Enter your mobile phone to continue
        </Text>
      </View>

      <View style={styles.phoneRow}>
        <View style={[styles.field, styles.prefix]} accessible accessibilityLabel="Country code plus 7, Kazakhstan">
          <Image source={require('@/assets/images/flag-kz.png')} style={styles.flag} />
          <Text variant="bodyLarge">+7</Text>
        </View>
        <TextInput
          value={formatLocal(digits)}
          onChangeText={(t) => setDigits(toLocalDigits(t))}
          placeholder="Phone number"
          // Figma shows the placeholder in the primary text color.
          placeholderTextColor={colors.textPrimary}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          // No returnKeyType: on a phone pad React Native would add a "Done" toolbar above the
          // keyboard. The pinned Continue button is the submit action, as in Figma.
          accessibilityLabel="Phone number"
          style={[styles.field, styles.input]}
        />
      </View>

      <View style={styles.spacer} />

      <View style={[styles.footer, { paddingBottom: keyboardVisible ? space[12] : insets.bottom + space[4] }]}>
        <Text style={styles.terms}>
          By pressing continue, you agree to <Text style={[styles.terms, styles.link]}>Terms of Service</Text> and{' '}
          <Text style={[styles.terms, styles.link]}>Privacy Policy</Text>
        </Text>
        <Button
          title={isSending ? 'Sending…' : 'Continue'}
          size="large"
          disabled={!isComplete || isSending}
          onPress={submit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  // Figma: logo 22pt below the status bar, "Welcome" 41pt below the logo.
  logo: { alignItems: 'center', marginTop: 22 },
  heading: { gap: space[10], marginTop: 41, paddingHorizontal: 28 },
  phoneRow: { flexDirection: 'row', gap: space[8], marginTop: 18, paddingHorizontal: space[24] },
  field: { height: 57, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.bgInput },
  prefix: { width: 91, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingLeft: space[12] },
  flag: { width: 30, height: 30 },
  input: { flex: 1, paddingHorizontal: 19, fontSize: 20, color: colors.textPrimary },
  spacer: { flex: 1 },
  // Figma: terms 16pt above the button; button 20pt from the screen edges.
  footer: { paddingHorizontal: space[20], gap: space[16] },
  terms: { fontSize: 14, lineHeight: 17, color: colors.textTerms, textAlign: 'center', alignSelf: 'center', maxWidth: 261 },
  link: { fontWeight: '500', textDecorationLine: 'underline' },
});
