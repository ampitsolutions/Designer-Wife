import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { OutfitCollage } from '@/components/ItemThumb';
import { Empty, Fab } from '@/components/ui';
import { usePeople } from '@/lib/people';
import { ensureUrls } from '@/lib/closet';
import { listOutfits, setFavourite, type Outfit } from '@/lib/outfits';
import { page } from '@/lib/layout';

export default function OutfitsScreen() {
  const { people, canManage, nameOf } = usePeople();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listOutfits();
      await ensureUrls(list.flatMap((o) => o.items.map((i) => i.photo_key)));
      setOutfits(list);
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

  async function toggleFav(o: Outfit) {
    setOutfits((list) => list.map((x) => (x.id === o.id ? { ...x, is_favourite: !o.is_favourite } : x)));
    try {
      await setFavourite(o.id, !o.is_favourite);
    } catch {
      load();
    }
  }

  // Mine first, then each closet I manage, then outfits others shared with me.
  type Row = { key: string; outfit: Outfit | null; title?: string };
  const data: Row[] = [];
  for (const p of people) {
    const list = outfits.filter((o) => o.owner_id === p.id);
    if (!p.isMe && list.length) data.push({ key: `h-${p.id}`, outfit: null, title: `${p.name}'s outfits` });
    data.push(...list.map((o) => ({ key: o.id, outfit: o })));
  }
  const shared = outfits.filter((o) => !canManage(o.owner_id));
  if (shared.length) data.push({ key: 'h-shared', outfit: null, title: 'Shared with you' });
  data.push(...shared.map((o) => ({ key: o.id, outfit: o })));

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(d) => d.key}
        contentContainerStyle={{ ...page, padding: 12, gap: 12, flexGrow: 1, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <Pressable style={styles.ideas} onPress={() => router.push('/outfit/ideas')}>
            <Text style={styles.ideasTitle}>✨ Get outfit ideas</Text>
            <Text style={styles.ideasNote}>Tell the AI the occasion and it picks from your closet.</Text>
          </Pressable>
        }
        renderItem={({ item: d }) => {
          if (!d.outfit) return <Text style={styles.section}>{d.title}</Text>;
          const o = d.outfit;
          const isMine = canManage(o.owner_id);
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/outfit/${o.id}`)}>
              <OutfitCollage items={o.items} size={84} />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {o.name || 'Untitled outfit'}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[
                    o.occasion,
                    `${o.items.length} item${o.items.length === 1 ? '' : 's'}`,
                    isMine && o.shared ? 'Shared' : null,
                    !isMine ? `by ${nameOf(o.owner_id)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {isMine && (
                <Pressable hitSlop={12} onPress={() => toggleFav(o)}>
                  <Text style={styles.star}>{o.is_favourite ? '★' : '☆'}</Text>
                </Pressable>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <Empty
              title={error ? "Couldn't load outfits" : 'No outfits yet'}
              note={error ?? 'Tap + to put one together, or ask for ideas above.'}
            />
          )
        }
      />
      <Fab onPress={() => router.push('/outfit/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  ideas: { backgroundColor: '#f6f1ea', borderRadius: 12, padding: 14, gap: 4 },
  ideasTitle: { fontWeight: '700', fontSize: 16 },
  ideasNote: { color: '#555' },
  section: { fontWeight: '700', fontSize: 16, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666' },
  star: { fontSize: 26, color: '#c9a227', paddingHorizontal: 4 },
});
