import { Redirect, router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatPhone, OTP_LENGTH, useSession } from '@/features/auth/session';
import { colors, radius, space } from '@/theme';

/** Figma shows 4 boxes; Supabase SMS codes are always 6 digits. */
const CODE_LENGTH = OTP_LENGTH;

/** Figma: "Enter Code" (22:1808), "/ Entering" (21:819), "/ Error" (21:892). */
export default function VerifyScreen() {
  const { pendingPhone, verifyCode, resendCode } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  if (!pendingPhone) return <Redirect href="/sign-in" />;

  const onChange = async (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(next);
    setError(null);
    if (next.length < CODE_LENGTH || isVerifying) return;
    // On success the session flips and Stack.Protected swaps to the tabs.
    setIsVerifying(true);
    const result = await verifyCode(next);
    setIsVerifying(false);
    if (!result.ok) setError(result.message);
  };

  const resend = async () => {
    setCode('');
    setError(null);
    const result = await resendCode();
    Alert.alert(result.ok ? 'Code sent' : 'Could not send the code', result.ok ? undefined : result.message);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text variant="display" accessibilityRole="header">
          We sent you a code
        </Text>
        <Text variant="bodyLarge" color="textSecondary">
          to number <Text variant="bodyLarge" color="textBrand">{formatPhone(pendingPhone)}</Text>{'  '}
          <Text variant="bodyLarge" color="textBrand" style={styles.bold} onPress={() => router.back()}>
            Change
          </Text>
        </Text>
      </View>

      <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes} accessibilityLabel="Verification code">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const isActive = !error && i === code.length;
          return (
            <View key={i} style={[styles.box, isActive && styles.boxActive, !!error && styles.boxError]}>
              <Text variant="heading2">{code[i] ?? (isActive ? '|' : '')}</Text>
            </View>
          );
        })}
      </Pressable>

      {/* Single hidden input drives the boxes; oneTimeCode enables iOS SMS autofill. */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={CODE_LENGTH}
        autoFocus
        caretHidden
        style={styles.hiddenInput}
      />

      {error && (
        <Text variant="small" color="danger" style={styles.center}>
          {error}
        </Text>
      )}
      {isVerifying && (
        <Text variant="small" color="textTertiary" style={styles.center}>
          Checking…
        </Text>
      )}

      <Text variant="small" color="textSecondary" style={[styles.center, styles.resend]}>
        Didn’t get the code?{' '}
        <Text variant="small" style={styles.bold} onPress={resend}>
          Resend
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[16], paddingTop: space[24], gap: space[24] },
  heading: { gap: space[10] },
  boxes: { flexDirection: 'row', gap: space[10] },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.borderBrand },
  boxError: { borderColor: colors.danger },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  center: { textAlign: 'center' },
  resend: { marginTop: space[24] },
  bold: { fontWeight: '600' },
});
