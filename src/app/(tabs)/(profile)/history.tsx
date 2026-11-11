import { Stack } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { BookingSummaryCard, StatusChip } from '@/components/booking-summary-card';
import { PageTitle } from '@/components/page-title';
import { Text } from '@/components/ui/text';
import { LoadingView } from '@/components/query-state';
import { useAppointments } from '@/data/queries';
import { space } from '@/theme';

/** Figma: "Appointment history" (4167:2322). Past visits, newest first. */
export default function HistoryScreen() {
  const { history, isPending } = useAppointments();

  return (
    <>
      <Stack.Screen options={{ title: 'Appointment history', headerTitle: '' }} />
      <FlatList
        data={history}
        keyExtractor={(a) => a.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        ListHeaderComponent={<PageTitle size="medium">Appointment history</PageTitle>}
        renderItem={({ item }) => (
          <BookingSummaryCard appointment={item} extraRows={[{ label: 'Status', value: <StatusChip label="Completed" /> }]} />
        )}
        ListEmptyComponent={isPending ? <LoadingView /> : <Text color="textSecondary">No past appointments yet.</Text>}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[24], gap: space[16] },
});
