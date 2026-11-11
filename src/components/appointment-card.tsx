import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Appointment } from '@/data/api';
import { formatCardDate } from '@/lib/dates';
import { space } from '@/theme';

/** "card / upcoming appointment" (Figma) — compact card for the Home "Upcoming" slider. */
export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const { specialist } = appointment;
  return (
    <Card style={styles.card}>
      <Text color="textBrand">{formatCardDate(new Date(appointment.startsAt))}</Text>
      <Text variant="headline" style={styles.title}>
        {appointment.title}
      </Text>
      <View style={styles.flex}>
        <Text numberOfLines={2}>{specialist.name}</Text>
      </View>
      <Text color="textTertiary">{specialist.specialty}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: 200, gap: space[4] },
  title: { marginTop: space[4] },
  flex: { flexGrow: 1, marginBottom: space[6] },
});
