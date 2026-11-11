import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateField } from '@/components/DateField';
import { OutfitCollage } from '@/components/ItemThumb';
import { Banner, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ensureUrls } from '@/lib/closet';
import { today } from '@/lib/dates';
import { createEvent, deleteEvent, findRepeats, getEvent, listEvents, repeatText, updateEvent, type CalendarEvent } from '@/lib/events';
import { listOutfits, type Outfit } from '@/lib/outfits';
import { page } from '@/lib/layout';

/** New event (no id) or edit (?id=…). */
export default function EditEvent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<CalendarEvent[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(today());
  const [outfitId, setOutfitId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [events, o] = await Promise.all([listEvents(), listOutfits()]);
        // Only my own outfits can be planned (shared ones belong to my partner).
        const mine = o.filter((x) => x.owner_id === session?.user.id);
        await ensureUrls(mine.flatMap((x) => x.items.map((i) => i.photo_key)));
        setAll(events);
        setOutfits(mine);
        if (id) {
          const e = await getEvent(id);
          setTitle(e.title);
          setDate(e.event_date);
          setOutfitId(e.outfit_id);
          setNotes(e.notes ?? '');
        }
      } catch (e) {
        Alert.alert('Could not load', e instanceof Error ? e.message : String(e));
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, session?.user.id]);

  const repeats = date ? findRepeats(all, outfitId, date, id) : [];
  const outfit = outfits.find((o) => o.id === outfitId);

  async function save() {
    if (!title.trim()) return Alert.alert('Give the event a name');
    if (!date) return Alert.alert('Pick a date');
    setBusy('save');
    const fields = { title: title.trim(), event_date: date, outfit_id: outfitId, notes: notes.trim() || null };
    try {
      if (id) await updateEvent(id, fields);
      else await createEvent(fields);
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  function remove() {
    if (!id) return;
    Alert.alert('Delete this event?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await deleteEvent(id);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
            setBusy(null);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Event' : 'New event' }} />
      <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Event</Text>
        <TextInput style={styles.input} placeholder="e.g. Priya's wedding reception" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Date</Text>
        <DateField value={date} onChange={setDate} />

        <Text style={styles.label}>Outfit</Text>
        <Pressable style={styles.outfitRow} onPress={() => setPicking(true)}>
          {outfit ? <OutfitCollage items={outfit.items} size={72} /> : null}
          <Text style={styles.outfitText}>{outfit ? outfit.name || 'Outfit' : 'Choose an outfit'}</Text>
          {outfit && (
            <Pressable hitSlop={12} onPress={() => setOutfitId(null)}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          )}
        </Pressable>

        {repeats.length > 0 && (
          <Banner tone="warn">
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text style={{ fontWeight: '600' }}>Repeat outfit</Text>
              {repeats.slice(0, 3).map((r) => (
                <Text key={r.event.id}>{repeatText(r)}</Text>
              ))}
            </View>
          </Banner>
        )}

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="Dress code, who's going…"
          value={notes}
          onChangeText={setNotes}
        />

        <View style={styles.buttons}>
          {id && <Button title="Delete" variant="danger" onPress={remove} busy={busy === 'delete'} disabled={!!busy} />}
          <Button title="Save" onPress={save} busy={busy === 'save'} disabled={!!busy} />
        </View>
      </ScrollView>

      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Choose an outfit</Text>
          <Pressable onPress={() => setPicking(false)} hitSlop={12}>
            <Text style={styles.done}>Close</Text>
          </Pressable>
        </View>
        <FlatList
          data={outfits}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ ...page, padding: 12, gap: 10 }}
          renderItem={({ item: o }) => {
            const r = date ? findRepeats(all, o.id, date, id)[0] : undefined;
            return (
              <Pressable
                style={[styles.pickRow, o.id === outfitId && styles.pickRowOn]}
                onPress={() => {
                  setOutfitId(o.id);
                  setPicking(false);
                }}
              >
                <OutfitCollage items={o.items} size={64} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.outfitText}>{o.name || 'Untitled outfit'}</Text>
                  {o.occasion ? <Text style={styles.meta}>{o.occasion}</Text> : null}
                  {r && <Text style={styles.repeat}>⚠︎ {repeatText(r)}</Text>}
                </View>
                {o.is_favourite && <Text style={styles.star}>★</Text>}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 24, gap: 12 }}>
              <Text style={styles.meta}>You haven't saved any outfits yet.</Text>
              <Button
                title="Create an outfit"
                variant="secondary"
                onPress={() => {
                  setPicking(false);
                  router.push('/outfit/new');
                }}
              />
            </View>
          }
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 8, paddingBottom: 48 },
  label: { fontWeight: '600', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  outfitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10 },
  outfitText: { flex: 1, fontSize: 16 },
  clear: { color: '#0a7aff' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 4 },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 17, fontWeight: '600', color: '#0a7aff' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12 },
  pickRowOn: { backgroundColor: '#f2f2f2' },
  meta: { color: '#666' },
  repeat: { color: '#b45309', fontSize: 13 },
  star: { color: '#c9a227', fontSize: 20 },
});
