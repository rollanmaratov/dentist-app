import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Rating } from '@/components/ui/rating';
import { Text } from '@/components/ui/text';
import { ErrorView, LoadingView } from '@/components/query-state';
import { useReviews, useSpecialist } from '@/data/queries';
import { colors, space } from '@/theme';

/** Figma: "Specialist page" (191:1169). */
export default function SpecialistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const specialistQuery = useSpecialist(id);
  const reviews = useReviews(id);
  const specialist = specialistQuery.data;
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();

  if (specialistQuery.isPending) return <LoadingView fill />;
  if (specialistQuery.isError) {
    return <ErrorView fill error={specialistQuery.error} onRetry={() => specialistQuery.refetch()} />;
  }
  if (!specialist) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text color="textTertiary">This specialist no longer exists.</Text>
      </View>
    );
  }

  return (
    <>
      {/* Figma's toolbar here has no title — just the glass back button. */}
      <Stack.Screen options={{ title: specialist.name, headerTitle: '' }} />

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card style={styles.profile}>
          <Image source={specialist.photoUrl} style={styles.avatar} contentFit="cover" />
          <Text variant="heading2" style={styles.centerText}>
            {specialist.name}
          </Text>
          <Text color="textTertiary">{specialist.specialty}</Text>
          <View style={styles.chips}>
            {specialist.skills.map((skill) => (
              <Chip key={skill} label={skill} tone="subtle" />
            ))}
          </View>
        </Card>

        <Card style={styles.gap8}>
          <Text variant="heading2" accessibilityRole="header">
            Description
          </Text>
          <Text numberOfLines={expanded ? undefined : 5}>{specialist.description}</Text>
          <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} accessibilityRole="button">
            <Text color="textTertiary">{expanded ? 'less' : 'more'}</Text>
          </Pressable>
          <View style={styles.divider} />
          <Text>{specialist.clinic}</Text>
          <Text>{specialist.yearsOfExperience} years of experience</Text>
        </Card>

        <Card style={styles.gap8}>
          <View style={styles.reviewsHeader}>
            <Text variant="heading2" accessibilityRole="header">
              Reviews
            </Text>
            <Rating value={specialist.rating} count={specialist.reviewCount} />
          </View>
          {(reviews.data ?? []).map((r) => (
            <View key={r.id} style={styles.review}>
              <View style={styles.reviewAuthor}>
                <Text variant="headline">{r.author}</Text>
                <Rating value={r.rating} />
              </View>
              <Text numberOfLines={3}>{r.body}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Pinned CTA. Requirement: booking stays reachable without scrolling. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[8] }]}>
        <Link href={{ pathname: '/book', params: { specialistId: specialist.id } }} asChild>
          <Button title="To Booking" />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space[16], gap: space[16], paddingBottom: 120 },
  profile: { alignItems: 'center', gap: space[6], paddingVertical: space[24] },
  avatar: { width: 112, height: 112, borderRadius: 56, marginBottom: space[8] },
  centerText: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[6], marginTop: space[8] },
  gap8: { gap: space[8] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderDefault, marginVertical: space[8] },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  review: {
    gap: space[4],
    paddingTop: space[12],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
  },
  reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space[16] },
});
