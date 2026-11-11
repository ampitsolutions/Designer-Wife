import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { ItemThumb } from '@/components/ItemThumb';
import { Empty } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCloset } from '@/lib/closet';
import { listProfiles, profileName, type Profile } from '@/lib/profiles';
import { addPacking, deletePacking, listPacking, setPacked, type PackingItem } from '@/lib/trips';
import { page } from '@/lib/layout';

export default function PackingList() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const closet = useCloset(me);

  const [lines, setLines] = useState<PackingItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [qty, setQty] = useState('1');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, p] = await Promise.all([listPacking(id), listProfiles()]);
      setLines(l);
      setProfiles(p);
    } catch (e) {
      Alert.alert('Could not load packing list', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggle(line: PackingItem) {
    setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, packed: !l.packed } : l)));
    try {
      await setPacked(line.id, !line.packed);
    } catch {
      load();
    }
  }

  async function add() {
    const text = label.trim();
    if (!text) return;
    const n = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    setLabel('');
    setQty('1');
    try {
      await addPacking(id, text, n);
      load();
    } catch (e) {
      Alert.alert('Could not add', e instanceof Error ? e.message : String(e));
    }
  }

  function remove(line: PackingItem) {
    Alert.alert(`Remove "${line.label}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePacking(line.id);
            load();
          } catch (e) {
            Alert.alert('Could not remove', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }

  // Mine first, then each other person. Unpacked before packed.
  const owners = [...new Set(lines.map((l) => l.owner_id))].sort((a, b) => (a === me ? -1 : b === me ? 1 : 0));
  const sections = owners.map((owner) => {
    const data = lines.filter((l) => l.owner_id === owner).sort((a, b) => Number(a.packed) - Number(b.packed));
    const done = data.filter((l) => l.packed).length;
    const who = owner === me ? 'My list' : `${profileName(profiles.find((p) => p.id === owner))}'s list`;
    return { title: `${who} · ${done}/${data.length} packed`, data };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.addRow, page]}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Add something to pack"
          value={label}
          onChangeText={setLabel}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <TextInput style={[styles.input, styles.qty]} keyboardType="number-pad" value={qty} onChangeText={setQty} />
        <Pressable style={styles.addBtn} onPress={add}>
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ ...page, padding: 12, paddingBottom: 48, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item: line }) => {
          const it = line.item_id && line.owner_id === me ? closet.byId(line.item_id) : undefined;
          return (
            <Pressable
              style={styles.line}
              onPress={() => toggle(line)}
              onLongPress={line.owner_id === me ? () => remove(line) : undefined}
            >
              <View style={[styles.box, line.packed && styles.boxOn]}>
                {line.packed && <Text style={styles.check}>✓</Text>}
              </View>
              {it ? <ItemThumb item={it} size={40} /> : null}
              <Text style={[styles.label, line.packed && styles.packed]} numberOfLines={2}>
                {line.label}
                {line.quantity > 1 ? ` ×${line.quantity}` : ''}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? undefined : (
            <Empty title="Nothing to pack yet" note="Use “Plan outfits & packing” on the trip, or add things above." />
          )
        }
        ListFooterComponent={
          lines.length ? <Text style={styles.hint}>Tap to tick. Press and hold one of your own lines to remove it.</Text> : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  addRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  qty: { width: 52, textAlign: 'center' },
  addBtn: { backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '600' },
  section: { fontWeight: '700', fontSize: 15, marginTop: 16, marginBottom: 6, backgroundColor: '#fff' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#999', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  check: { color: '#fff', fontWeight: '700' },
  label: { flex: 1, fontSize: 16 },
  packed: { color: '#999', textDecorationLine: 'line-through' },
  hint: { color: '#888', textAlign: 'center', marginTop: 16 },
});
