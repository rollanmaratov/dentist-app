import { randomUUID } from 'expo-crypto';
import { router, Stack, useIsFocused } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { Alert, FlatList, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { KeyboardChatScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatDaySeparator, ChatMessageRow } from '@/components/chat/chat-message';
import { ErrorView, LoadingView } from '@/components/query-state';
import { Text } from '@/components/ui/text';
import type { ChatImage, ChatMessage } from '@/data/api';
import { useChatThread, useMarkChatRead, useSendChatMessage, useUnreadChatCount } from '@/data/queries';
import { pickChatPhotos } from '@/features/chat/pick-photos';
import { formatChatDay, formatChatTime, isSameDay } from '@/lib/dates';
import { useNow } from '@/lib/use-now';
import { colors, space } from '@/theme';

type Item =
  | { type: 'message'; key: string; message: ChatMessage; showName: boolean; showAvatar: boolean; gapAbove: number }
  | { type: 'day'; key: string; label: string };

/**
 * Figma: "Chats / Chat / Filled v2" (238:2822), "Chats / Chat / Typing" (239:2916).
 *
 * Inverted list (newest message at the bottom) on a KeyboardChatScrollView, with the
 * composer in a KeyboardStickyView: when the keyboard opens, both rise by the keyboard
 * height minus the space the floating tab bar already reserves below the composer.
 */
export default function ChatScreen() {
  const headerHeight = useHeaderHeight();
  const now = useNow();
  const { messages, isPending, isError, error, refetch, takeFailed } = useChatThread();
  const send = useSendChatMessage();
  const unreadCount = useUnreadChatCount().data ?? 0;
  const markRead = useMarkChatRead();
  const isFocused = useIsFocused();
  // Space between the composer and the bottom of the screen (floating tab bar + home indicator).
  const [bottomInset, setBottomInset] = useState(0);

  // Reading the chat clears the tab badge.
  const markAllRead = useEffectEvent(() => {
    if (!markRead.isPending) markRead.mutate();
  });
  useEffect(() => {
    if (isFocused && unreadCount > 0) markAllRead();
  }, [isFocused, unreadCount]);

  const sendText = (text: string) => send.mutate({ id: randomUUID(), body: text, images: [] });

  const attachPhotos = async () => {
    const images = await pickChatPhotos();
    if (images?.length) send.mutate({ id: randomUUID(), body: null, images });
  };

  const openImage = (image: ChatImage) => {
    if (image.url) router.push({ pathname: '/photo', params: { url: image.url } });
  };

  const resolveFailed = (message: ChatMessage) => {
    Alert.alert('Message not sent', 'Check your connection and try again.', [
      { text: 'Delete', style: 'destructive', onPress: () => takeFailed(message.id) },
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Try Again',
        isPreferred: true,
        onPress: () => {
          const variables = takeFailed(message.id);
          if (variables) send.mutate(variables);
        },
      },
    ]);
  };

  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => <KeyboardChatScrollView {...props} inverted offset={bottomInset} />,
    [bottomInset],
  );

  const items = buildItems(messages, now);

  return (
    <View style={styles.screen}>
      {/* Figma uses the toolbar's "Default" style here: a native inline title. */}
      <Stack.Screen options={{ title: 'Support Chat' }} />

      {isPending ? (
        <LoadingView fill />
      ) : isError && messages.length === 0 ? (
        <ErrorView error={error} onRetry={refetch} fill />
      ) : (
        <FlatList
          inverted
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) =>
            item.type === 'day' ? (
              <ChatDaySeparator label={item.label} />
            ) : (
              <View style={{ marginTop: item.gapAbove }}>
                <ChatMessageRow
                  message={item.message}
                  time={formatChatTime(new Date(item.message.createdAt), now)}
                  showName={item.showName}
                  showAvatar={item.showAvatar}
                  onPressImage={openImage}
                  onPressFailed={resolveFailed}
                />
              </View>
            )
          }
          renderScrollComponent={renderScrollComponent}
          // Inverted: the footer is drawn at the top, under the transparent native header.
          ListFooterComponent={<View style={{ height: headerHeight }} />}
          ListHeaderComponent={<View style={styles.bottomSpacer} />}
          ListEmptyComponent={
            <Text color="textTertiary" style={styles.empty}>
              Ask the clinic anything about your visit.
            </Text>
          }
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustKeyboardInsets={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          style={styles.list}
        />
      )}

      <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
        {/* Native SafeAreaView: its bottom inset includes the floating tab bar. */}
        <SafeAreaView edges={['bottom']}>
          <ChatComposer onSend={sendText} onAttach={attachPhotos} />
        </SafeAreaView>
      </KeyboardStickyView>

      {/* Measures that same inset so the keyboard offsets can subtract it. */}
      <SafeAreaView
        edges={['bottom']}
        pointerEvents="none"
        style={styles.insetProbe}
        onLayout={(e) => setBottomInset(e.nativeEvent.layout.height)}
      />
    </View>
  );
}

/**
 * Messages arrive newest first (the list is inverted). Adds a day separator above the
 * first message of each day and groups consecutive messages from the same sender:
 * name on the first of a run, avatar on the last.
 */
function buildItems(messages: ChatMessage[], now: Date): Item[] {
  const items: Item[] = [];
  const sameSender = (a: ChatMessage | undefined, b: ChatMessage) =>
    !!a && a.sender === b.sender && a.agent?.name === b.agent?.name;

  messages.forEach((message, i) => {
    const day = new Date(message.createdAt);
    const newer = messages[i - 1];
    const older = messages[i + 1];
    const olderSameDay = !!older && isSameDay(new Date(older.createdAt), day);
    const newerSameDay = !!newer && isSameDay(new Date(newer.createdAt), day);
    const continuesRun = olderSameDay && sameSender(older, message);

    items.push({
      type: 'message',
      key: message.id,
      message,
      // Tight within a run, looser between senders, none under a day separator (it has its own).
      gapAbove: !olderSameDay ? 0 : continuesRun ? space[4] : space[12],
      showName: !continuesRun,
      showAvatar: !(newerSameDay && sameSender(newer, message)),
    });
    if (!olderSameDay) {
      items.push({ type: 'day', key: `day-${message.id}`, label: formatChatDay(day, now) });
    }
  });
  return items;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  list: { flex: 1 },
  bottomSpacer: { height: space[8] },
  empty: { textAlign: 'center', padding: space[24] },
  insetProbe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
