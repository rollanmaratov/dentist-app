import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BOOKING_WINDOW_DAYS, SLOT_HOURS } from '@/data/constants';
import { addDays, formatMonth, formatSlot, isSameDay, monthWeeks, startOfDay } from '@/lib/dates';
import { colors, radius, shadow, space } from '@/theme';

type Props = {
  date: Date;
  hour: number | null;
  onChangeDate: (date: Date) => void;
  onChangeHour: (hour: number) => void;
  /** Whether a day can be picked (has at least one free slot). */
  isDateBookable: (date: Date) => boolean;
  /** Whether an hour on the selected `date` is free. */
  isSlotAvailable: (hour: number) => boolean;
  /** Figma "choose specialist" state: the whole picker is greyed out until a specialty is picked. */
  disabled?: boolean;
};

/**
 * "Date picker" card (Figma 239:3244): month calendar, divider, 60-minute time slots.
 * Bookable range is today + 13 days; days and slots without free specialists look disabled.
 */
export function DateTimePicker({
  date,
  hour,
  onChangeDate,
  onChangeHour,
  isDateBookable,
  isSlotAvailable,
  disabled = false,
}: Props) {
  const today = startOfDay(new Date());
  const lastBookable = addDays(today, BOOKING_WINDOW_DAYS - 1);
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(lastBookable.getFullYear(), lastBookable.getMonth(), 1);
  const [month, setMonth] = useState(new Date(date.getFullYear(), date.getMonth(), 1));
  const spansTwoMonths = firstMonth.getTime() !== lastMonth.getTime();

  return (
    <View style={styles.card} accessibilityState={{ disabled }}>
      <View style={styles.calendar}>
        <View style={styles.monthRow}>
          {spansTwoMonths && (
            <MonthArrow direction="left" hidden={month <= firstMonth} onPress={() => setMonth(firstMonth)} />
          )}
          <Text variant="calendarMonth" style={[styles.month, disabled && styles.textInactive]}>
            {formatMonth(month)}
          </Text>
          {spansTwoMonths && (
            <MonthArrow direction="right" hidden={month >= lastMonth} onPress={() => setMonth(lastMonth)} />
          )}
        </View>

        {monthWeeks(month).map((week) => (
          <View key={week[0].toISOString()} style={styles.week}>
            {week.map((day) => {
              const inMonth = day.getMonth() === month.getMonth();
              const bookable = inMonth && isDateBookable(day);
              const selected = inMonth && isSameDay(day, date);
              return (
                <Pressable
                  key={day.toISOString()}
                  style={styles.dayCell}
                  disabled={disabled || !bookable}
                  onPress={() => onChangeDate(day)}
                  accessibilityRole="button"
                  accessibilityLabel={day.toDateString()}
                  accessibilityState={{ selected, disabled: disabled || !bookable }}>
                  <View
                    style={[
                      styles.dayPill,
                      selected && { backgroundColor: disabled ? colors.bgDisabledSelected : colors.bgBrand },
                    ]}>
                    <Text
                      variant="calendarDay"
                      style={{
                        color: selected
                          ? colors.textOnBrand
                          : !bookable
                            ? colors.textPlaceholder
                            : disabled
                              ? colors.textCalendarInactive
                              : colors.textCalendarDay,
                      }}>
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.slots}>
        {SLOT_HOURS.map((h) => {
          const available = isSlotAvailable(h);
          const selected = !disabled && available && h === hour;
          return (
            <Pressable
              key={h}
              disabled={disabled || !available}
              onPress={() => onChangeHour(h)}
              accessibilityRole="button"
              accessibilityLabel={`${formatSlot(h)} to ${formatSlot(h + 1)}`}
              accessibilityState={{ selected, disabled: disabled || !available }}
              style={[styles.slot, selected && styles.slotSelected]}>
              <Text
                variant="slot"
                style={{
                  color: selected
                    ? colors.textOnBrandSoft
                    : disabled
                      ? colors.textPlaceholder
                      : available
                        ? colors.textBlack
                        : colors.textDisabled,
                }}>
                {formatSlot(h)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MonthArrow({ direction, hidden, onPress }: { direction: 'left' | 'right'; hidden: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={hidden}
      hitSlop={12}
      style={[styles.arrow, hidden && styles.hidden]}
      accessibilityRole="button"
      accessibilityLabel={direction === 'left' ? 'Previous month' : 'Next month'}>
      <SymbolView name={`chevron.${direction}`} size={15} weight="semibold" tintColor={colors.textBrand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    boxShadow: shadow.card,
  },
  calendar: { paddingTop: 17, paddingHorizontal: 24, paddingBottom: space[20] },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  month: { flex: 1, textAlign: 'center' },
  textInactive: { color: colors.textPlaceholder },
  arrow: { width: 24, alignItems: 'center' },
  hidden: { opacity: 0 },
  // Figma: rows every 40pt, columns every 43pt.
  week: { flexDirection: 'row', height: 40 },
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayPill: { width: 30, height: 31, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: colors.divider },
  // Figma: 8pt between slots, 15pt between rows, 32pt inset.
  slots: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[8], rowGap: 15, padding: 32, paddingTop: 21 },
  slot: {
    width: 56,
    alignItems: 'center',
    paddingVertical: space[6],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  slotSelected: { backgroundColor: colors.bgBrand, borderColor: colors.bgBrand },
});
