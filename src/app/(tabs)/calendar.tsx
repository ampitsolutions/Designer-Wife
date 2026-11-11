import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { OutfitCollage } from '@/components/ItemThumb';
import { Empty, Fab } from '@/components/ui';
import { ensureUrls } from '@/lib/closet';
import { formatDate, today } from '@/lib/dates';
import { findRepeats, listEvents, repeatText, type CalendarEvent } from '@/lib/events';
import { listOutfits, type Outfit } from '@/lib/outfits';

const monthTitle = (d: string) =>
  new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, o] = await Promise.all([listEvents(), listOutfits()]);
      await ensureUrls(o.flatMap((x) => x.items.map((i) => i.photo_key)));
      setEvents(e);
      setOutfits(o);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
  const visible = showPast ? [...events].reverse().filter((e) => e.event_date < now) : events.filter((e) => e.event_date >= now);
  const sections: { title: string; data: CalendarEvent[] }[] = [];
  for (const e of visible) {
    const title = monthTitle(e.event_date);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(e);
    else sections.push({ title, data: [e] });
  }
  const pastCount = events.filter((e) => e.event_date < now).length;

  return (
    <View style={styles.container}>
      <View style={styles.toggle}>
        {(['Upcoming', `Past${pastCount ? ` (${pastCount})` : ''}`] as const).map((label, i) => {
          const on = showPast === (i === 1);
          return (
            <Pressable key={label} style={[styles.seg, on && styles.segOn]} onPress={() => setShowPast(i === 1)}>
              <Text style={[styles.segText, on && styles.segTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 96, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item: e }) => {
          const outfit = outfits.find((o) => o.id === e.outfit_id);
          const repeat = findRepeats(events, e.outfit_id, e.event_date, e.id)[0];
          return (
            <Pressable style={styles.row} onPress={() => router.push({ pathname: '/event/edit', params: { id: e.id } })}>
              {outfit ? <OutfitCollage items={outfit.items} size={64} /> : <View style={styles.noOutfit}><Text style={styles.noOutfitText}>No outfit</Text></View>}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{e.title}</Text>
                <Text style={styles.meta}>{formatDate(e.event_date)}{outfit ? ` · ${outfit.name || 'Outfit'}` : ''}</Text>
                {repeat && <Text style={styles.repeat}>⚠︎ {repeatText(repeat)}</Text>}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <Empty
              title={error ? "Couldn't load events" : showPast ? 'No past events' : 'Nothing planned'}
              note={error ?? (showPast ? undefined : 'Tap + to add an event and pick what to wear. The app warns you about repeats.')}
            />
          )
        }
      />
      <Fab onPress={() => router.push('/event/edit')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  toggle: { flexDirection: 'row', margin: 12, marginBottom: 0, backgroundColor: '#f2f2f2', borderRadius: 10, padding: 3 },
  seg: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segText: { color: '#666', fontWeight: '600' },
  segTextOn: { color: '#111' },
  section: { fontWeight: '700', fontSize: 16, marginTop: 12, marginBottom: 6, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 6 },
  noOutfit: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#f4f4f4', alignItems: 'center', justifyContent: 'center' },
  noOutfitText: { color: '#999', fontSize: 11 },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666' },
  repeat: { color: '#b45309', fontSize: 13 },
});
