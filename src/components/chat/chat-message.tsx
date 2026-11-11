import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { ChatImage, ChatMessage, MessageStatus } from '@/data/api';
import { colors, radius, shadow, space } from '@/theme';

/** Figma "Message Bubble" text is capped at 280pt; bubbles add 16pt padding on each side. */
const BUBBLE_MAX_WIDTH = 280 + space[16] * 2;
const AVATAR_SIZE = 22;
const TIME_HEIGHT = 14;
const IMAGE_WIDTH = 120;
const IMAGE_HEIGHT = 142;

type ChatMessageProps = {
  message: ChatMessage;
  /** Formatted time ("14:55", "Just now"). */
  time: string;
  /** Sender name above the bubble — first message in a run from the same agent. */
  showName: boolean;
  /** Avatar beside the bubble — last message in a run from the same agent. */
  showAvatar: boolean;
  onPressImage: (image: ChatImage) => void;
  /** Tapped the "not sent" badge of a failed message. */
  onPressFailed: (message: ChatMessage) => void;
};

/**
 * Figma "Incoming Message" / "Outgoing Message" (238:2842, 238:2825): rounded bubble,
 * optional photos below it, time (and status ticks for the patient's own messages).
 */
export function ChatMessageRow({ message, time, showName, showAvatar, onPressImage, onPressFailed }: ChatMessageProps) {
  if (message.sender === 'patient') {
    return (
      <View style={styles.outgoing}>
        {message.body && (
          <View style={[styles.bubble, styles.bubbleOutgoing]}>
            <Text variant="chatMessage" color="textBubbleOutgoing" selectable>
              {message.body}
            </Text>
          </View>
        )}
        <MessageImages images={message.images} align="flex-end" onPress={onPressImage} />
        <View style={styles.outgoingMeta}>
          <Text variant="chatTime" color="textChatTime">
            {time}
          </Text>
          <StatusIcon status={message.status} onPressFailed={() => onPressFailed(message)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.incoming}>
      <View style={styles.avatarSlot}>
        {showAvatar && (
          <Image
            source={message.agent?.avatarUrl ?? require('@/assets/images/avatar-placeholder.svg')}
            style={styles.avatar}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        )}
      </View>
      <View style={styles.incomingColumn}>
        {showName && message.agent && (
          <Text variant="chatName" color="textChatMeta" style={styles.name}>
            {message.agent.name}
          </Text>
        )}
        {message.body && (
          <View style={[styles.bubble, styles.bubbleIncoming]}>
            <Text variant="chatMessage" color="textBubbleIncoming" selectable>
              {message.body}
            </Text>
          </View>
        )}
        <MessageImages images={message.images} align="flex-start" onPress={onPressImage} />
        <Text variant="chatTime" color="textChatTime" style={styles.incomingTime}>
          {time}
        </Text>
      </View>
    </View>
  );
}

/** Day separator: "Today" / "12 August". */
export function ChatDaySeparator({ label }: { label: string }) {
  return (
    <Text variant="chatDay" color="textChatMeta" style={styles.day} accessibilityRole="header">
      {label}
    </Text>
  );
}

function MessageImages({
  images,
  align,
  onPress,
}: {
  images: ChatImage[];
  align: 'flex-start' | 'flex-end';
  onPress: (image: ChatImage) => void;
}) {
  if (images.length === 0) return null;
  return (
    <View style={[styles.images, { justifyContent: align }]}>
      {images.map((image) => (
        <Pressable
          key={image.key}
          onPress={() => onPress(image)}
          disabled={!image.url}
          accessibilityRole="imagebutton"
          accessibilityLabel="Photo">
          <View style={styles.imageTile}>
            <Image source={image.url} style={styles.image} contentFit="cover" transition={150} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Ticks after the time of the patient's own message: one grey tick = sent, two grey =
 * delivered, two purple = read (the Figma "icon / checkmark" is purple). Clock while
 * sending; red badge (tap to retry) if it failed.
 */
function StatusIcon({ status, onPressFailed }: { status: MessageStatus; onPressFailed: () => void }) {
  switch (status) {
    case 'sending':
      return <SymbolView name="clock" size={11} tintColor={colors.textChatTime} accessibilityLabel="Sending" />;
    case 'failed':
      return (
        <Pressable onPress={onPressFailed} hitSlop={12} accessibilityRole="button" accessibilityLabel="Not sent. Tap to retry">
          <SymbolView name="exclamationmark.circle.fill" size={14} tintColor={colors.dangerAction} />
        </Pressable>
      );
    case 'sent':
      return (
        <View style={styles.ticks} accessibilityLabel="Sent">
          <Tick color={colors.textChatTime} />
        </View>
      );
    case 'delivered':
    case 'read':
      return (
        <View style={[styles.ticks, styles.doubleTicks]} accessibilityLabel={status === 'read' ? 'Read' : 'Delivered'}>
          <Tick color={status === 'read' ? undefined : colors.textChatTime} />
          <Tick color={status === 'read' ? undefined : colors.textChatTime} offset />
        </View>
      );
  }
}

/** "icon / checkmark" (230:2708): 12pt frame, glyph inset 19.46% / 8.4% / 0.78% / 8.32%. */
function Tick({ color, offset = false }: { color?: string; offset?: boolean }) {
  return (
    <View style={[styles.tickFrame, offset && styles.tickOffset]}>
      <Image source={require('@/assets/images/icon-checkmark.svg')} style={styles.tick} tintColor={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  outgoing: { alignItems: 'flex-end', paddingRight: 13, paddingLeft: space[32] },
  bubble: {
    maxWidth: BUBBLE_MAX_WIDTH,
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
  },
  bubbleOutgoing: { backgroundColor: colors.bgBrand },
  bubbleIncoming: { backgroundColor: colors.bgSurface },
  outgoingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    marginTop: space[4],
    marginRight: space[12],
    height: TIME_HEIGHT,
  },
  incoming: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: space[10], paddingRight: space[32], gap: 9 },
  // The avatar lines up with the bottom of the bubble/photos, not the time below them.
  avatarSlot: { width: AVATAR_SIZE, marginBottom: TIME_HEIGHT + space[4] + space[2] },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  incomingColumn: { flexShrink: 1, alignItems: 'flex-start' },
  name: { marginLeft: 15, marginBottom: space[4] },
  incomingTime: { marginLeft: 15, marginTop: space[4], height: TIME_HEIGHT },
  day: { alignSelf: 'center', marginTop: space[16], marginBottom: space[12] },
  images: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[8],
    marginTop: space[6],
    paddingHorizontal: 7,
    maxWidth: IMAGE_WIDTH * 2 + space[8] + 14,
  },
  imageTile: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    boxShadow: shadow.chatImage,
    backgroundColor: colors.bgInput,
  },
  image: { flex: 1, borderRadius: radius.lg },
  ticks: { width: 12, height: 12 },
  doubleTicks: { width: 16 },
  tickFrame: { position: 'absolute', top: 0, left: 0, width: 12, height: 12 },
  tickOffset: { left: 4 },
  tick: { position: 'absolute', top: 2.335, left: 0.998, width: 9.99456, height: 9.57134 },
});
