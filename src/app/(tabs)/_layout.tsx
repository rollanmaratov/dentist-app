import { NativeTabs } from 'expo-router/native-tabs';

import { useChatRealtime, useUnreadChatCount } from '@/data/queries';
import { colors } from '@/theme';

/**
 * Native tab bar: UITabBarController on iOS (Liquid Glass on iOS 26+),
 * Material bottom navigation on Android. Each tab hosts its own native stack.
 */
export default function TabsLayout() {
  // Live chat updates for the whole signed-in app, so the badge updates on any tab.
  useChatRealtime();
  const unreadChatCount = useUnreadChatCount().data ?? 0;

  return (
    <NativeTabs tintColor={colors.bgBrand} minimizeBehavior="never">
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(sessions)">
        <NativeTabs.Trigger.Label>Sessions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(book)">
        <NativeTabs.Trigger.Label>Book</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(chat)">
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'ellipsis.message', selected: 'ellipsis.message.fill' }}
          md="chat"
        />
        {/* Requirement: counter only shows when there are unread messages. */}
        <NativeTabs.Trigger.Badge hidden={unreadChatCount === 0}>{String(unreadChatCount)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
