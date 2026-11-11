import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ClosetBrowser } from '@/components/ClosetBrowser';
import { ItemThumb } from '@/components/ItemThumb';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCloset } from '@/lib/closet';
import { usePeople, type Person } from '@/lib/people';
import { PersonSwitcher } from '@/components/PersonSwitcher';
import { formatDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { listDayItems, listMembers, setMyDayItems, updateDay, type DayItem, type TripDay } from '@/lib/trips';
import { weatherLine } from '@/lib/weather';
import { page } from '@/lib/layout';

/** One trip day: my outfit for the day and what's planned. */
export default function TripDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const { people } = usePeople();
  // Whose outfit I'm editing: me, or someone on the trip whose closet I manage.
  const [who, setWho] = useState<string | null>(me ?? null);
  const [onTrip, setOnTrip] = useState<Person[]>([]);
  const [allItems, setAllItems] = useState<DayItem[]>([]);
  const closet = useCloset(who);

  const [day, setDay] = useState<TripDay | null>(null);
  const [activities, setActivities] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('trip_days')
          .select('id, trip_id, day_date, activities, plan, weather')
          .eq('id', id)
          .single();
        if (error) throw error;
        const d = data as TripDay;
        setDay(d);
        setActivities(d.activities ?? '');
        const [items, members] = await Promise.all([listDayItems([d.id]), listMembers(d.trip_id)]);
        setAllItems(items);
        setOnTrip(people.filter((p) => members.includes(p.id)));
        setIds(items.filter((x) => x.user_id === me).map((x) => x.item_id));
      } catch (e) {
        Alert.alert('Could not load day', e instanceof Error ? e.message : String(e));
        router.back();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, me]);

  function switchTo(person: string) {
    if (!who || person === who) return;
    // Keep unsaved picks for the person we're leaving.
    setAllItems((all) => [
      ...all.filter((x) => x.user_id !== who),
      ...ids.map((item_id) => ({ trip_day_id: id, user_id: who, item_id })),
    ]);
    setIds(allItems.filter((x) => x.user_id === person).map((x) => x.item_id));
    setWho(person);
  }

  async function save() {
    if (!day || !who) return;
    setSaving(true);
    try {
      await updateDay(day.id, { activities: activities.trim() || null });
      const current = [
        ...allItems.filter((x) => x.user_id !== who),
        ...ids.map((item_id) => ({ trip_day_id: id, user_id: who, item_id })),
      ];
      for (const p of onTrip.length ? onTrip.map((x) => x.id) : [who]) {
        await setMyDayItems(day.id, p, current.filter((x) => x.user_id === p).map((x) => x.item_id));
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  if (!day) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  const toggle = (itemId: string) => setIds((cur) => (cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId]));
  const selected = ids.map(closet.byId).filter((i) => !!i);

  return (
    <>
      <Stack.Screen options={{ title: formatDate(day.day_date) }} />
      <ScrollView contentContainerStyle={[styles.container, page]} keyboardShouldPersistTaps="handled">
        {day.weather && <Text style={styles.weather}>{weatherLine(day.weather)}</Text>}
        {day.plan ? <Text style={styles.note}>{day.plan}</Text> : null}

        <Text style={styles.label}>Plans for the day</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="e.g. Museum in the morning, dinner out"
          value={activities}
          onChangeText={setActivities}
        />

        <Text style={styles.label}>{onTrip.length > 1 ? 'Outfit for' : "What I'm wearing"}</Text>
        {onTrip.length > 1 && <PersonSwitcher people={onTrip} activeId={who} onChange={switchTo} />}
        <View style={styles.grid}>
          {selected.map((it) => (
            <Pressable key={it!.id} onPress={() => toggle(it!.id)}>
              <ItemThumb item={it!} size={96} />
              <Text style={styles.remove}>×</Text>
            </Pressable>
          ))}
          <Pressable style={styles.add} onPress={() => setPicking(true)}>
            <Text style={styles.addPlus}>+</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Button title="Save" onPress={save} busy={saving} />
        </View>
      </ScrollView>

      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Pick items ({ids.length})</Text>
          <Pressable onPress={() => setPicking(false)} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <ClosetBrowser items={closet.items} selectedIds={ids} onPressItem={(it) => toggle(it.id)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 8, paddingBottom: 48 },
  weather: { fontSize: 16, color: '#333' },
  note: { color: '#6b5b2e', fontStyle: 'italic' },
  label: { fontWeight: '600', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 21,
    overflow: 'hidden',
  },
  add: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: { fontSize: 28, color: '#555' },
  row: { flexDirection: 'row', gap: 12, marginTop: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 4 },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 17, fontWeight: '600', color: '#0a7aff' },
});
