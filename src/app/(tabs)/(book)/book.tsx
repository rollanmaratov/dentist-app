import { router, Stack, useLocalSearchParams, useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { DateTimePicker } from '@/components/booking/date-time-picker';
import { SpecialistPickCard } from '@/components/booking/specialist-pick-card';
import { SpecialtyDropdown } from '@/components/booking/specialty-dropdown';
import { PageTitle } from '@/components/page-title';
import { PINNED_FOOTER_SPACE, PinnedFooter } from '@/components/pinned-footer';
import { ErrorView } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { ApiError, type Slot } from '@/data/api';
import { BOOKING_WINDOW_DAYS, type Specialty } from '@/data/constants';
import { useBookAppointment, useSlotAvailability, useSpecialists } from '@/data/queries';
import { addDays, formatButtonDate, isWeekend, startOfDay, withHour } from '@/lib/dates';
import { space } from '@/theme';

/** Figma "Book Specialist": the large title starts 58pt below the status bar (under the toolbar row). */
const LARGE_TITLE_TOP = 58;

/** Requirement: today is selected by default (or the next weekday when the clinic is closed). */
function defaultDate(): Date {
  let d = startOfDay(new Date());
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

/** Clinic schedule without availability — used while no specialty is picked (greyed-out picker). */
function isScheduleDay(day: Date): boolean {
  const today = startOfDay(new Date());
  return day >= today && day < addDays(today, BOOKING_WINDOW_DAYS) && !isWeekend(day);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const slotKey = (d: Date, hour: number) => `${dayKey(d)}-${hour}`;

/** Index slots by local day + hour. */
function indexSlots(slots: Slot[] | undefined) {
  const byKey = new Map<string, string[]>();
  for (const slot of slots ?? []) {
    const start = new Date(slot.startsAt);
    byKey.set(slotKey(start, start.getHours()), slot.freeSpecialistIds);
  }
  return byKey;
}

/**
 * Figma: "Book specialist / choose specialist → choose date time → choose doctor → ready"
 * (217:1338, 239:3078, 239:3241, 223:1686). One screen that reveals each step as the
 * previous one is filled in. Availability and booking rules come from the database.
 */
export default function BookScreen() {
  const params = useLocalSearchParams<{ specialistId?: string; rescheduleId?: string }>();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const specialistsQuery = useSpecialists();
  const bookMutation = useBookAppointment();

  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [hour, setHour] = useState<number | null>(null);
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  // Arriving from a specialist page ("To Booking") or My Appointments ("Edit"): prefill once
  // per new set of params, as soon as the specialist is known (state adjusted during render).
  const paramsKey = params.specialistId ? `${params.specialistId}|${params.rescheduleId ?? ''}` : null;
  const [appliedParamsKey, setAppliedParamsKey] = useState<string | null>(null);
  const preselected = specialistsQuery.data?.find((s) => s.id === params.specialistId);
  if (paramsKey !== appliedParamsKey && (paramsKey === null || preselected)) {
    setAppliedParamsKey(paramsKey);
    if (preselected) {
      setSpecialty(preselected.specialty);
      setSpecialistId(preselected.id);
      setRescheduleId(params.rescheduleId ?? null);
      setHour(null);
    }
  }

  const availability = useSlotAvailability(specialty);
  const slots = indexSlots(availability.data);
  const freeAt = (d: Date, h: number) => {
    const free = slots.get(slotKey(d, h)) ?? [];
    // With a doctor chosen, only that doctor's free time counts.
    return specialistId ? free.filter((id) => id === specialistId) : free;
  };

  const pickerDisabled = specialty === null || availability.isPending;
  const isDateBookable = (day: Date) =>
    pickerDisabled ? isScheduleDay(day) : [...Array(24).keys()].some((h) => freeAt(day, h).length > 0);
  const isSlotAvailable = (h: number) => freeAt(date, h).length > 0;

  const specialists = (specialistsQuery.data ?? []).filter((s) => s.specialty === specialty);
  const freeIdsAtSelection = hour !== null ? (slots.get(slotKey(date, hour)) ?? []) : null;

  const startsAt = hour !== null ? withHour(date, hour) : null;
  const canBook = specialty !== null && startsAt !== null && specialistId !== null && !bookMutation.isPending;

  const changeSpecialty = (value: Specialty) => {
    setSpecialty(value);
    setHour(null);
    if (specialistId && specialists.find((s) => s.id === specialistId)?.specialty !== value) setSpecialistId(null);
  };

  const changeDate = (value: Date) => {
    setDate(value);
    setHour(null);
  };

  const pickSpecialist = (id: string) => {
    setSpecialistId(id);
    if (hour !== null && !freeIdsAtSelection?.includes(id)) setHour(null);
  };

  const reset = () => {
    setSpecialty(null);
    setDate(defaultDate());
    setHour(null);
    setSpecialistId(null);
    setRescheduleId(null);
    // Drop the prefill params so the same "Edit" / "To Booking" can prefill again later.
    router.setParams({ specialistId: undefined, rescheduleId: undefined });
  };

  // After a booking, clear the form only once "Booking confirmed" fully covers it —
  // resetting earlier flashes the empty "Choose a specialist" state during the push.
  const resetPending = useRef(false);
  const onCovered = useEffectEvent(() => {
    if (!resetPending.current) return;
    resetPending.current = false;
    reset();
  });
  useEffect(
    () =>
      navigation.addListener('transitionEnd', (e) => {
        if (e.data.closing) onCovered();
      }),
    [navigation],
  );

  const submit = () => {
    if (!canBook) return;
    bookMutation.mutate(
      { specialistId, startsAt, rescheduleId },
      {
        onSuccess: ({ id }) => {
          resetPending.current = true;
          router.push({ pathname: '/booking-success', params: { id } });
        },
        onError: (error) => {
          // Requirement: booking error state. The slot is cleared if someone else took it.
          if (error instanceof ApiError && (error.code === 'slot_taken' || error.code === 'slot_unavailable')) {
            setHour(null);
          }
          Alert.alert('Booking failed', error.message);
        },
      },
    );
  };

  const verb = rescheduleId ? 'Reschedule' : 'Book';

  return (
    <>
      {/* Tab root: no back button, so no navigation bar — the title sits where Figma's
          large-title toolbar puts it (LARGE_TITLE_TOP below the status bar). */}
      <Stack.Screen options={{ title: 'Book Specialist', headerShown: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <PageTitle>{rescheduleId ? 'Reschedule' : 'Book Specialist'}</PageTitle>

        <SpecialtyDropdown value={specialty} onChange={changeSpecialty} />

        {availability.isError ? (
          <ErrorView error={availability.error} onRetry={() => availability.refetch()} />
        ) : (
          <DateTimePicker
            date={date}
            hour={hour}
            onChangeDate={changeDate}
            onChangeHour={setHour}
            isDateBookable={isDateBookable}
            isSlotAvailable={isSlotAvailable}
            disabled={pickerDisabled}
          />
        )}

        {specialists.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.specialists}>
            {specialists.map((s) => {
              const busy = freeIdsAtSelection !== null && !freeIdsAtSelection.includes(s.id);
              return (
                <View key={s.id} style={busy && styles.busy}>
                  <SpecialistPickCard
                    specialist={s}
                    selected={s.id === specialistId}
                    onPress={() => pickSpecialist(s.id)}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>

      {/* Requirement: pinned to the bottom, disabled until specialization, time and doctor are chosen. */}
      <PinnedFooter>
        <Button
          title={startsAt && specialistId ? `${verb} (${formatButtonDate(startsAt)})` : verb}
          disabled={!canBook}
          onPress={submit}
        />
      </PinnedFooter>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space[16],
    paddingTop: LARGE_TITLE_TOP,
    gap: space[20],
    paddingBottom: PINNED_FOOTER_SPACE + space[16],
  },
  bleed: { marginHorizontal: -space[16] },
  specialists: { paddingHorizontal: space[16], gap: space[16] },
  // Busy at the chosen time: still tappable (picking clears the time), but visibly unavailable.
  busy: { opacity: 0.4 },
});
