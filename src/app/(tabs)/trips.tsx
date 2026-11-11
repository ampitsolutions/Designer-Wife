import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Empty, Fab } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatRange, today } from '@/lib/dates';
import { listTrips, type Trip } from '@/lib/trips';
import { page } from '@/lib/layout';

export default function TripsScreen() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTrips(await listTrips());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const now = today();
  const upcoming = trips.filter((t) => !t.end_date || t.end_date >= now);
  const past = trips.filter((t) => t.end_date && t.end_date < now).reverse();
  const rows = [
    ...upcoming.map((t) => ({ key: t.id, trip: t })),
    ...(past.length ? [{ key: 'past', trip: null as Trip | null }] : []),
    ...past.map((t) => ({ key: t.id, trip: t })),
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ ...page, padding: 12, gap: 10, flexGrow: 1, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item: r }) => {
          if (!r.trip) return <Text style={styles.section}>Past trips</Text>;
          const t = r.trip;
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/trip/${t.id}`)}>
              <Text style={styles.name}>{t.name}</Text>
              <Text style={styles.meta}>
                {[t.place_label || t.destination, formatRange(t.start_date, t.end_date)].filter(Boolean).join(' · ')}
              </Text>
              {t.owner_id !== session?.user.id && <Text style={styles.shared}>Shared with you</Text>}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <Empty
              title={error ? "Couldn't load trips" : 'No trips yet'}
              note={error ?? 'Tap + to plan one. The app checks the weather and plans outfits and packing from your closet.'}
            />
          )
        }
      />
      <Fab onPress={() => router.push('/trip/edit')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  section: { fontWeight: '700', fontSize: 16, marginTop: 12 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, gap: 4 },
  name: { fontSize: 17, fontWeight: '700' },
  meta: { color: '#555' },
  shared: { color: '#8a6d1c', fontSize: 13 },
});
