import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BookingSummaryCard } from '@/components/booking-summary-card';
import { PINNED_FOOTER_SPACE, PinnedFooter } from '@/components/pinned-footer';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { LoadingView } from '@/components/query-state';
import { useAppointments } from '@/data/queries';
import { space } from '@/theme';

/** Figma: "Booking / success" (4136:1780). */
export default function BookingSuccessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointment = useAppointments().getById(id);

  const goToAppointments = () => {
    router.dismissAll(); // leave the Book tab on a fresh form
    router.navigate('/sessions');
  };

  return (
    <>
      {/* No toolbar in Figma; swiping back would return to an already-submitted form. */}
      <Stack.Screen options={{ title: 'Booking confirmed', headerShown: false, gestureEnabled: false }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.message}>
          <Image source={require('@/assets/images/booking-success.svg')} style={styles.icon} />
          <Text variant="heading1" accessibilityRole="header" style={styles.center}>
            Booking confirmed
          </Text>
          <Text color="textSecondary" style={styles.center}>
            Your appointment is booked. You can view or manage it in My appointments.
          </Text>
        </View>
        {appointment ? <BookingSummaryCard appointment={appointment} /> : <LoadingView />}
      </ScrollView>

      <PinnedFooter>
        <Button title="Go to My Appointments" variant="secondary" onPress={goToAppointments} />
      </PinnedFooter>
    </>
  );
}

const styles = StyleSheet.create({
  // Figma: content starts 84pt below the status bar, 24pt side padding, 32pt between blocks.
  content: { paddingHorizontal: space[24], paddingTop: 84, gap: space[32], paddingBottom: PINNED_FOOTER_SPACE },
  message: { alignItems: 'center', gap: space[8], paddingHorizontal: space[12] },
  icon: { width: 112, height: 112, marginBottom: space[16] },
  center: { textAlign: 'center' },
});
