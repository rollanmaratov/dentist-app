import { Stack } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppointmentCard } from '@/components/appointment-card';
import { PromotionTile } from '@/components/promotion-tile';
import { SectionHeader } from '@/components/section-header';
import { SpecialistCard } from '@/components/specialist-card';
import { SpecialistListItem } from '@/components/specialist-list-item';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { ErrorView, LoadingView } from '@/components/query-state';
import type { Specialist } from '@/data/api';
import { SPECIALTIES, type Specialty } from '@/data/constants';
import { useAppointments, usePromotions, useSpecialists } from '@/data/queries';
import { SHADOW_BLEED, space } from '@/theme';

/** Figma: "Home Screen 1" (4151:2804) / "Home Screen 2 - Filter Applied" (57:1183). */
export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const appointments = useAppointments();
  const { upcoming } = appointments;
  const specialistsQuery = useSpecialists();
  const promotions = usePromotions();

  const allSpecialists = specialistsQuery.data ?? [];
  const visibleSpecialists = specialty ? allSpecialists.filter((s) => s.specialty === specialty) : allSpecialists;
  const searchResults = query.trim() ? searchSpecialists(allSpecialists, query) : null;

  // Native pull-to-refresh reloads everything on the page.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([specialistsQuery.refetch(), promotions.refetch(), appointments.refetch()]);
    setIsRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Home', headerTitle: '' }} />
      {/* Native search field in the navigation bar (glass on iOS 26). */}
      <Stack.SearchBar
        placeholder="Search by specialist, service…"
        hideWhenScrolling={false}
        onChangeText={(e) => setQuery(e.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} />}
        contentContainerStyle={styles.content}>
        {searchResults ? (
          <View style={styles.results}>
            {searchResults.length === 0 ? (
              <Text color="textTertiary" style={styles.empty}>
                Nothing found for “{query.trim()}”
              </Text>
            ) : (
              searchResults.map((s) => <SpecialistListItem key={s.id} specialist={s} />)
            )}
          </View>
        ) : (
          <>
            <Section title="Promotions">
              <HorizontalList>
                {(promotions.data ?? []).map((p) => (
                  <PromotionTile key={p.id} promotion={p} />
                ))}
              </HorizontalList>
            </Section>

            {upcoming.length > 0 && (
              <Section title="Upcoming" action={{ label: 'All', href: '/sessions' }}>
                <HorizontalList shadowed>
                  {upcoming.map((a) => (
                    <AppointmentCard key={a.id} appointment={a} />
                  ))}
                </HorizontalList>
              </Section>
            )}

            <Section title="Specialists" action={{ label: 'See all', href: '/specialists' }}>
              <HorizontalList gap={space[8]}>
                <Chip label="All" selected={specialty === null} onPress={() => setSpecialty(null)} />
                {SPECIALTIES.map((sp) => (
                  <Chip key={sp} label={sp} selected={specialty === sp} onPress={() => setSpecialty(sp)} />
                ))}
              </HorizontalList>
              {specialistsQuery.isPending ? (
                <LoadingView />
              ) : specialistsQuery.isError ? (
                <ErrorView error={specialistsQuery.error} onRetry={() => specialistsQuery.refetch()} />
              ) : (
              <HorizontalList shadowed>
                {visibleSpecialists.length === 0 ? (
                  <Text color="textTertiary" style={styles.empty}>
                    No {specialty?.toLowerCase()}s available yet
                  </Text>
                ) : (
                  visibleSpecialists.map((s) => <SpecialistCard key={s.id} specialist={s} />)
                )}
              </HorizontalList>
              )}
            </Section>
          </>
        )}
      </ScrollView>
    </>
  );
}

function searchSpecialists(all: Specialist[], query: string): Specialist[] {
  const q = query.trim().toLowerCase();
  return all.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.specialty.toLowerCase().includes(q) ||
      s.skills.some((skill) => skill.toLowerCase().includes(q)),
  );
}

function Section({ title, action, children }: ComponentProps<typeof SectionHeader> & { children: ReactNode }) {
  return (
    <View style={styles.section}>
      {/* Above the carousel below it, whose shadow room overlaps the header. */}
      <View style={styles.raised}>
        <SectionHeader title={title} action={action} />
      </View>
      {children}
    </View>
  );
}

/**
 * Horizontal carousel. `shadowed`: the cards cast `shadow.card`, which a scroll view
 * would clip at its edges — pad by SHADOW_BLEED so the whole shadow fits, and pull the
 * list back by the same amount so the layout doesn't move. Lists without shadows are
 * raised above a following shadowed list, so its extra room never takes their taps.
 */
function HorizontalList({ children, gap = space[12], shadowed = false }: { children: ReactNode; gap?: number; shadowed?: boolean }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={shadowed ? styles.shadowedList : styles.raised}
      contentContainerStyle={[{ gap, paddingHorizontal: space[16], paddingVertical: space[4] }, shadowed && styles.shadowRoom]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[16], paddingBottom: space[32], gap: space[24] },
  section: { gap: space[12] },
  raised: { zIndex: 1 },
  // Net vertical space stays the 4pt every list has; the rest overlaps its neighbours.
  shadowedList: { marginVertical: -(SHADOW_BLEED - space[4]) },
  shadowRoom: { paddingVertical: SHADOW_BLEED },
  results: { paddingHorizontal: space[16], gap: space[12] },
  empty: { paddingVertical: space[16] },
});
