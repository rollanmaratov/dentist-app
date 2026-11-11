import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Appointment } from '@/data/api';
import { formatSummaryDate } from '@/lib/dates';
import { colors, radius, space } from '@/theme';

type Row = { label: string; value: ReactNode };

/**
 * "Booking summary" (Figma 4131:2255 / 4136:1923 / 4166:2285): specialist header,
 * divider, then label/value rows. Used by My Appointments, Booking success and Profile.
 */
export function BookingSummaryCard({ appointment, extraRows = [] }: { appointment: Appointment; extraRows?: Row[] }) {
  const { specialist } = appointment;
  const rows: Row[] = [
    { label: 'Date & time', value: formatSummaryDate(new Date(appointment.startsAt)) },
    { label: 'Appointment type', value: appointment.type },
    { label: 'Clinic', value: specialist.clinic },
    ...extraRows,
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.specialist}>
        <View style={styles.photoFrame}>
          {specialist.photoUrl && <Image source={specialist.photoUrl} style={styles.photo} contentFit="cover" />}
        </View>
        <View style={styles.details}>
          <Text>{specialist.name}</Text>
          <Text color="textTertiary">{specialist.specialty}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text color="textTertiary">{row.label}</Text>
          {typeof row.value === 'string' || row.value === undefined ? (
            <Text style={styles.value} numberOfLines={2}>
              {row.value}
            </Text>
          ) : (
            row.value
          )}
        </View>
      ))}
    </Card>
  );
}

/** "Status chip" (Figma 4166:2305). */
export function StatusChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text variant="small" color="textBrand">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space[20], gap: space[16] },
  specialist: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  photoFrame: {
    width: 59,
    height: 62,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.bgBrandSubtle,
  },
  photo: { width: '100%', height: '100%' },
  details: { flex: 1, gap: space[2] },
  divider: { height: 1, backgroundColor: colors.divider },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12] },
  value: { flexShrink: 1, textAlign: 'right' },
  chip: {
    backgroundColor: colors.bgBrandSubtle,
    borderRadius: radius.full,
    paddingHorizontal: space[10],
    paddingVertical: space[4],
  },
});
