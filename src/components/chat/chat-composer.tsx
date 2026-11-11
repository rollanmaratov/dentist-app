import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, space, typography } from '@/theme';

type ChatComposerProps = {
  onSend: (text: string) => void;
  onAttach: () => void;
};

const SEND_BUTTON_SIZE = 27.333;
const SEND_ICON_FRAME = 19.333;

/**
 * Figma "Input Container" (238:2857 empty, 239:2947 typing): "+" button for photos and a
 * rounded message field; the purple send button appears inside the field once there's text.
 */
export function ChatComposer({ onSend, onAttach }: ChatComposerProps) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onAttach}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Add photo">
        <Image source={require('@/assets/images/icon-add.svg')} style={styles.addIcon} />
      </Pressable>

      <View style={styles.field}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={4000}
          style={[styles.input, canSend && styles.inputWithSend]}
          accessibilityLabel="Message"
        />
        {canSend && (
          <Pressable
            onPress={send}
            style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Send">
            <View style={styles.sendFrame}>
              <Image source={require('@/assets/images/icon-send.svg')} style={styles.sendIcon} />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[8],
    paddingLeft: 11,
    paddingRight: 21,
    paddingTop: 7,
    paddingBottom: space[6],
  },
  addButton: {
    width: 30,
    height: 30,
    marginBottom: space[4],
    borderRadius: radius['2xl'],
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: { width: 13.1034, height: 13.1034 },
  field: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius['2xl'],
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderChatInput,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center',
  },
  input: {
    ...typography.chatMessage,
    color: colors.textBlack,
    maxHeight: 120,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 9,
    paddingBottom: 9,
  },
  inputWithSend: { paddingRight: SEND_BUTTON_SIZE + 7 + space[6] },
  sendButton: {
    position: 'absolute',
    right: 7,
    bottom: 4.5,
    width: SEND_BUTTON_SIZE,
    height: SEND_BUTTON_SIZE,
    borderRadius: radius['2xl'],
    backgroundColor: colors.bgBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // "icon / send": 19.33pt frame, glyph inset 14.58% top / 8.33% left.
  sendFrame: { width: SEND_ICON_FRAME, height: SEND_ICON_FRAME },
  sendIcon: { position: 'absolute', top: 2.819, left: 1.611, width: 15.7084, height: 16.3639 },
  pressed: { opacity: 0.6 },
});
