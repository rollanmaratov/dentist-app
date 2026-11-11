import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { BookingSummaryCard } from '@/components/booking-summary-card';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ErrorView, LoadingView } from '@/components/query-state';
import type { Appointment } from '@/data/api';
import { useAppointments, useCancelAppointment } from '@/data/queries';
import { formatSummaryDate } from '@/lib/dates';
import { space } from '@/theme';

/** Figma: "My Appointments / Default" (4131:2119) and "/ None" (4131:2277). */
export default function SessionsScreen() {
  const appointments = useAppointments();
  const cancelMutation = useCancelAppointment();

  const confirmCancel = (appointment: Appointment) => {
    // Native alert stands in for the "Overlay / Cancel Appointment" dialog.
    Alert.alert(
      'Cancel appointment?',
      `${appointment.specialist.name}\n${formatSummaryDate(new Date(appointment.startsAt))}`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel appointment', style: 'destructive', onPress: () =>
            cancelMutation.mutate(appointment.id, {
              onError: (error) => Alert.alert('Could not cancel', error.message),
            }),
        },
      ],
    );
  };

  const edit = (appointment: Appointment) =>
    router.navigate({
      pathname: '/book',
      params: { specialistId: appointment.specialistId, rescheduleId: appointment.id },
    });

  return (
    <>
      {/* Figma has no toolbar on this tab page: the title is a Heading 2 in content. */}
      <Stack.Screen options={{ title: 'My Appointments', headerShown: false }} />
      <FlatList
        data={appointments.upcoming}
        keyExtractor={(a) => a.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        ListHeaderComponent={<PageTitle size="medium">My Appointments</PageTitle>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <BookingSummaryCard appointment={item} />
            <View style={styles.actions}>
              <Button title="Edit" variant="secondary" style={styles.flex} onPress={() => edit(item)} />
              <Button title="Cancel" variant="danger" style={styles.flex} onPress={() => confirmCancel(item)} />
            </View>
          </View>
        )}
        refreshing={appointments.isRefetching}
        onRefresh={() => appointments.refetch()}
        ListEmptyComponent={
          appointments.isPending ? (
            <LoadingView />
          ) : appointments.isError ? (
            <ErrorView error={appointments.error} onRetry={() => appointments.refetch()} />
          ) : (
          // Figma "My Appointments / None" (4131:2277).
          <View style={styles.empty}>
            <Image
              source={require('@/assets/images/empty-appointments.svg')}
              style={styles.illustration}
              accessibilityIgnoresInvertColors
            />
            <Text color="textSecondary" style={styles.centerText}>
              We see no upcoming appointments for you at the moment.{'\n\n'}If you wish to visit a medical
              professional, book an appointment by tapping the Plus button below
            </Text>
          </View>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Figma: 24pt side padding, 24pt between title and cards.
  content: { padding: space[24], gap: space[24] },
  item: { gap: space[16] },
  actions: { flexDirection: 'row', gap: 9 },
  flex: { flex: 1 },
  empty: { alignItems: 'center', gap: space[8], paddingHorizontal: space[12], marginTop: 112 },
  illustration: { width: 191, height: 148 },
  centerText: { textAlign: 'center' },
});
