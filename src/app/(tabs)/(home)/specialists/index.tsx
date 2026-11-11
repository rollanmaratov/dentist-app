import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { PageTitle } from '@/components/page-title';
import { SpecialistListItem } from '@/components/specialist-list-item';
import { Text } from '@/components/ui/text';
import { ErrorView, LoadingView } from '@/components/query-state';
import { useSpecialists } from '@/data/queries';
import { space } from '@/theme';

/** Figma: "All Specialists screen" (57:1784). */
export default function SpecialistsScreen() {
  const [query, setQuery] = useState('');
  const specialists = useSpecialists();
  const all = specialists.data ?? [];
  const q = query.trim().toLowerCase();
  const data = q
    ? all.filter((s) => s.name.toLowerCase().includes(q) || s.specialty.toLowerCase().includes(q))
    : all;

  return (
    <>
      <Stack.Screen options={{ title: 'Specialists', headerTitle: '' }} />
      <Stack.SearchBar placeholder="Search specialists" onChangeText={(e) => setQuery(e.nativeEvent.text)} />
      <FlatList
        data={data}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <SpecialistListItem specialist={item} />}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        ListHeaderComponent={<PageTitle>Specialists</PageTitle>}
        refreshing={specialists.isRefetching}
        onRefresh={() => specialists.refetch()}
        ListEmptyComponent={
          specialists.isPending ? (
            <LoadingView />
          ) : specialists.isError ? (
            <ErrorView error={specialists.error} onRetry={() => specialists.refetch()} />
          ) : (
            <Text color="textTertiary">No specialists match “{query.trim()}”</Text>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[16], gap: space[12] },
});
