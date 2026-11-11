import { Image } from 'expo-image';
import { Link, Stack } from 'expo-router';
import { Fragment } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BookingSummaryCard, StatusChip } from '@/components/booking-summary-card';
import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useAppointments, useDeleteAccount, useLeaveReview, useProfile, useUpdateProfile } from '@/data/queries';
import { formatPhone, useSession } from '@/features/auth/session';
import { colors, space } from '@/theme';

const LEGAL_LINKS = ['Terms of Service', 'Privacy Policy', 'Consent to data processing', 'Licenses'];

/** Figma: "Profile" (4166:2264). */
export default function ProfileScreen() {
  const { phone, signOut } = useSession();
  const profile = useProfile();
  const { history } = useAppointments();
  const latest = history[0];
  const updateProfile = useUpdateProfile();
  const leaveReviewMutation = useLeaveReview();
  const deleteAccount = useDeleteAccount();

  const showError = (title: string) => (error: Error) => Alert.alert(title, error.message);

  // Native alerts stand in for "Overlay / Log out" and "Overlay / Delete profile".
  const confirmLogOut = () =>
    Alert.alert('Log out?', 'You will need to confirm your phone number again to sign in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  const confirmDelete = () =>
    Alert.alert('Delete profile?', 'Your profile and appointment history will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteAccount.mutate(undefined, { onSuccess: signOut, onError: showError('Could not delete profile') }),
      },
    ]);

  // No profile form in Figma yet: edit name / address with native prompts.
  const editField = (field: 'fullName' | 'homeAddress', title: string, current: string | null) =>
    Alert.prompt(title, undefined, (value) => {
      updateProfile.mutate({ [field]: value.trim() || null }, { onError: showError('Could not save') });
    }, 'plain-text', current ?? '');

  // Requirement (history): leave a review. Rating first, then the text — both native.
  const leaveReview = () => {
    if (!latest) return;
    Alert.alert(
      'Rate your visit',
      `How was your visit with ${latest.specialist.name}?`,
      [
        ...[5, 4, 3, 2, 1].map((rating) => ({
          text: '★'.repeat(rating),
          onPress: () =>
            Alert.prompt('Leave a review', 'Tell other patients about your visit.', (body) => {
              if (!body.trim()) return;
              leaveReviewMutation.mutate(
                { appointmentId: latest.id, rating, body },
                {
                  onSuccess: () => Alert.alert('Thank you!', 'Your review has been published.'),
                  onError: showError('Could not send review'),
                },
              );
            }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  return (
    <>
      {/* Figma has no toolbar on this tab page: the title is a Heading 2 in content. */}
      <Stack.Screen options={{ title: 'Profile', headerShown: false }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <PageTitle size="medium">Profile</PageTitle>

        {/* Personal info */}
        <Card style={styles.infoCard}>
          <View style={styles.header}>
            <Image source={require('@/assets/images/avatar-placeholder.svg')} style={styles.avatar} />
            <Pressable
              style={styles.flex}
              onPress={() => editField('fullName', 'Your name', profile.data?.fullName ?? null)}
              accessibilityRole="button"
              accessibilityHint="Edit your name">
              <Text variant="heading2" color={profile.data?.fullName ? 'textBlack' : 'textTertiary'}>
                {profile.data?.fullName ?? 'Add your name'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
          <InfoRow label="Phone number" value={phone ? formatPhone(phone) : ''} />
          <InfoRow
            label="Home address"
            value={profile.data?.homeAddress ?? 'Add'}
            onPress={() => editField('homeAddress', 'Home address', profile.data?.homeAddress ?? null)}
          />
        </Card>

        {/* Appointment history */}
        {latest && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="heading2" accessibilityRole="header">
                Appointment history
              </Text>
              <Link href="/history" asChild>
                <Pressable hitSlop={8} accessibilityRole="link">
                  <Text variant="button" color="textBrand">
                    View all
                  </Text>
                </Pressable>
              </Link>
            </View>
            <BookingSummaryCard
              appointment={latest}
              extraRows={[{ label: 'Status', value: <StatusChip label="Completed" /> }]}
            />
            <Button title="Leave a Review" onPress={leaveReview} />
          </View>
        )}

        {/* Legal */}
        <View style={styles.section}>
          <Text variant="heading2" accessibilityRole="header">
            Legal
          </Text>
          <Card style={styles.menu}>
            {LEGAL_LINKS.map((label, i) => (
              <Fragment key={label}>
                {i > 0 && <View style={styles.divider} />}
                <MenuRow label={label} />
              </Fragment>
            ))}
          </Card>
        </View>

        {/* Account actions */}
        <View style={styles.actions}>
          <Button title="Log out" variant="secondary" onPress={confirmLogOut} />
          <Button title="Delete profile" variant="danger" onPress={confirmDelete} />
        </View>
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.infoRow} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'}>
      <Text color="textTertiary">{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </Pressable>
  );
}

/** "Menu row" (Figma 4165:2280): 56pt, 20pt side padding, brand chevron. */
function MenuRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgCanvas }]}>
      <Text>{label}</Text>
      <Image source={require('@/assets/images/icon-chevron-right.svg')} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Figma: 24pt padding and 24pt between blocks.
  content: { padding: space[24], gap: space[24] },
  infoCard: { padding: space[20], gap: space[16] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  avatar: { width: 80, height: 80 },
  flex: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.divider },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[12] },
  infoValue: { flex: 1, textAlign: 'right' },
  section: { gap: space[16] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  menu: { padding: 0, overflow: 'hidden' },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[20] },
  chevron: { width: 16, height: 16 },
  actions: { gap: space[12] },
});
