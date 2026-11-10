import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { listMyItems, type Item } from '@/lib/items';
import { photoUrls } from '@/lib/photos';

const COLUMNS = 3;
const GAP = 4;

export default function ClosetScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<Item[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const list = await listMyItems(session.user.id);
      setItems(list);
      setUrls(await photoUrls(list.flatMap((i) => (i.photo_key ? [i.photo_key] : []))));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Reload whenever the tab comes back into view (e.g. after adding an item).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const size = (width - GAP * (COLUMNS + 1)) / COLUMNS;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={COLUMNS}
        contentContainerStyle={{ padding: GAP, gap: GAP, flexGrow: 1 }}
        columnWrapperStyle={{ gap: GAP }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => {
          const url = item.photo_key ? urls[item.photo_key] : undefined;
          return (
            <Pressable onPress={() => router.push(`/item/${item.id}`)}>
              <Image
                source={url ? { uri: url, cacheKey: item.photo_key ?? undefined } : undefined}
                style={{ width: size, height: size, borderRadius: 8, backgroundColor: '#f4f4f4' }}
                contentFit="cover"
                recyclingKey={item.id}
                transition={150}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{error ? 'Something went wrong' : 'Your closet is empty'}</Text>
              <Text style={styles.emptyNote}>{error ?? 'Tap + to add your first item.'}</Text>
            </View>
          )
        }
      />
      <Pressable style={styles.fab} onPress={() => router.push('/item/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyNote: { color: '#666', textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 32 },
});
